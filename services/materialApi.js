import { db, storage } from '../assets/js/firebase-config.js';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../assets/js/firebase-config.js';
import { getCurrentStoreInfo, getStoreSubcollection, getStoreDocRef, isSuperAdminUser, TENANT_MAP } from '../assets/js/tenant-router.js';

const COLLECTION_NAME = 'materials';
const HISTORY_COLLECTION = 'priceHistory';

export const createMaterial = async (materialData, imageFiles, explicitStoreId) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Unauthorized");

        let imageUrls = [];
        if (materialData.txtImageUrl) {
            imageUrls.push(materialData.txtImageUrl);
            delete materialData.txtImageUrl;
        }

        if (imageFiles && imageFiles.length > 0) {
            const uploadedUrls = await uploadMaterialImages(imageFiles, materialData.materialCode || Date.now().toString());
            imageUrls = imageUrls.concat(uploadedUrls);
        }

        const storeInfo = getCurrentStoreInfo();
        const curTenant = explicitStoreId || materialData.tenantId || window.tenantId || storeInfo.storeId;
        const curStore = materialData.storeName || window.currentStoreName || TENANT_MAP[curTenant]?.name || storeInfo.name;

        const newMaterial = {
            ...materialData,
            images: imageUrls,
            status: "active",
            tenantId: String(curTenant),
            merchantId: String(curTenant),
            storeName: curStore,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: currentUser.uid,
            creatorEmail: currentUser.email || '',
            updatedBy: currentUser.uid
        };

        // 1. Save to store dedicated table: merchants/{curTenant}/materials
        const storeMatRef = getStoreSubcollection('materials', curTenant);
        const docRef = await addDoc(storeMatRef, newMaterial);

        // 2. Mirror to root collection for backwards compatibility
        try {
            await setDoc(doc(db, COLLECTION_NAME, docRef.id), newMaterial);
        } catch (e) {}

        // Record initial price history if available
        if (materialData.ourPurchasePrice) {
            await recordPriceHistory(docRef.id, null, 0, materialData.ourPurchasePrice, 'VND', 'PURCHASE', currentUser.uid, "Initial Registration");
        }

        return docRef.id;
    } catch (error) {
        console.error("Error creating material: ", error);
        throw error;
    }
};

export const updateMaterial = async (id, materialData, explicitStoreId) => {
    try {
        const currentUser = auth.currentUser;
        const storeInfo = getCurrentStoreInfo();
        const curTenant = explicitStoreId || materialData.tenantId || window.tenantId || storeInfo.storeId;
        const curStore = materialData.storeName || TENANT_MAP[curTenant]?.name || storeInfo.name;

        const updates = {
            ...materialData,
            tenantId: String(curTenant),
            merchantId: String(curTenant),
            storeName: curStore,
            updatedAt: serverTimestamp(),
            updatedBy: currentUser?.uid || 'admin'
        };

        // 1. Update in root collection
        try {
            await setDoc(doc(db, COLLECTION_NAME, id), updates, { merge: true });
        } catch (e) {}

        // 2. Update in store subcollection
        if (curTenant && curTenant !== 'ALL') {
            try {
                await setDoc(getStoreDocRef('materials', id, curTenant), updates, { merge: true });
            } catch (e) {}
        }

        return true;
    } catch (error) {
        console.error("Error updating material: ", error);
        throw error;
    }
};

export const deleteMaterial = async (id, explicitStoreId) => {
    try {
        // 1. Delete from root collection
        try {
            await deleteDoc(doc(db, COLLECTION_NAME, id));
        } catch (e) {}

        // 2. Delete from specific store subcollection
        if (explicitStoreId && explicitStoreId !== 'ALL') {
            try {
                await deleteDoc(getStoreDocRef('materials', id, explicitStoreId));
            } catch (e) {}
        } else {
            // Delete from all store subcollections
            for (const sId of Object.keys(TENANT_MAP)) {
                try {
                    await deleteDoc(getStoreDocRef('materials', id, sId));
                } catch (e) {}
            }
        }
        return true;
    } catch (error) {
        console.error("Error deleting material: ", error);
        throw error;
    }
};

export const getAllMaterials = async (filterTenantId) => {
    try {
        const isSuper = isSuperAdminUser();
        const storeInfo = getCurrentStoreInfo();
        const curStoreId = filterTenantId !== undefined ? String(filterTenantId) : (isSuper ? 'ALL' : storeInfo.storeId);

        const materialsMap = new Map();

        // 1. Super Admin viewing ALL stores
        if (isSuper && curStoreId === 'ALL') {
            // Fetch from root collection
            try {
                const rootSnap = await getDocs(collection(db, COLLECTION_NAME));
                rootSnap.forEach(d => {
                    const data = d.data();
                    materialsMap.set(d.id, { id: d.id, ...data });
                });
            } catch (e) {
                console.warn("Root materials fetch note:", e);
            }

            // Fetch from each store subcollection
            for (const sId of Object.keys(TENANT_MAP)) {
                try {
                    const sSnap = await getDocs(collection(db, 'merchants', sId, COLLECTION_NAME));
                    sSnap.forEach(d => {
                        const data = d.data();
                        materialsMap.set(d.id, {
                            id: d.id,
                            ...data,
                            tenantId: data.tenantId || sId,
                            merchantId: data.merchantId || sId,
                            storeName: data.storeName || TENANT_MAP[sId]?.name || '가맹점'
                        });
                    });
                } catch (e) {
                    console.warn(`Store subcollection fetch (${sId}):`, e);
                }
            }

            return Array.from(materialsMap.values());
        }

        // 2. Specific store filtering or regular franchise user
        const targetStoreId = curStoreId !== 'ALL' ? curStoreId : storeInfo.storeId;
        const storeMatRef = getStoreSubcollection('materials', targetStoreId);
        let querySnapshot = await getDocs(storeMatRef);

        // One-time auto-migration for Best Winner legacy materials if empty
        if (targetStoreId === '1791605366' && querySnapshot.empty) {
            try {
                const legacySnap = await getDocs(collection(db, COLLECTION_NAME));
                for (const lDoc of legacySnap.docs) {
                    const ld = lDoc.data();
                    const isBW = ld.tenantId === '1791605366' || ld.merchantId === '1791605366' || (!ld.tenantId && !String(ld.name||'').includes('김치') && !String(ld.name||'').includes('갈비'));
                    if (isBW) {
                        await setDoc(doc(storeMatRef, lDoc.id), {
                            ...ld,
                            tenantId: '1791605366',
                            merchantId: '1791605366',
                            storeName: 'BEST WINNER'
                        }, { merge: true });
                    }
                }
                querySnapshot = await getDocs(storeMatRef);
            } catch (migErr) {
                console.warn("Materials legacy migration note:", migErr);
            }
        }

        querySnapshot.forEach((docSnap) => {
            materialsMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
        });

        // Also merge any root materials belonging to this store
        try {
            const rootSnap = await getDocs(collection(db, COLLECTION_NAME));
            rootSnap.forEach(d => {
                const data = d.data();
                const mTenant = String(data.tenantId || data.merchantId || '').trim();
                if (mTenant === targetStoreId) {
                    if (!materialsMap.has(d.id)) {
                        materialsMap.set(d.id, { id: d.id, ...data });
                    }
                }
            });
        } catch (e) {}

        return Array.from(materialsMap.values());
    } catch (error) {
        console.error("Error getting materials: ", error);
        throw error;
    }
};

export const getMaterialById = async (id, explicitStoreId) => {
    try {
        // 1. Check root collection first
        const rootSnap = await getDoc(doc(db, COLLECTION_NAME, id));
        if (rootSnap.exists()) {
            return { id: rootSnap.id, ...rootSnap.data() };
        }

        // 2. If explicit store ID provided
        if (explicitStoreId && explicitStoreId !== 'ALL') {
            const storeDocRef = getStoreDocRef('materials', id, explicitStoreId);
            const docSnap = await getDoc(storeDocRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
        }

        // 3. Search all store subcollections
        for (const sId of Object.keys(TENANT_MAP)) {
            try {
                const snap = await getDoc(getStoreDocRef('materials', id, sId));
                if (snap.exists()) {
                    return { id: snap.id, ...snap.data(), tenantId: snap.data().tenantId || sId };
                }
            } catch (e) {}
        }

        return null;
    } catch (error) {
        console.error("Error getting material: ", error);
        throw error;
    }
};

const uploadMaterialImages = async (files, materialId) => {
    const urls = [];
    for (const file of files) {
        const storageRef = ref(storage, `materials/${materialId}/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        urls.push(url);
    }
    return urls;
};

export const getExternalPrices = async (materialId) => {
    return [
        { source: "BXD (공공가격)", price: 850000, type: "PUBLIC" },
        { source: "Vatgia (시장가격)", price: 820000, type: "MARKET" }
    ];
};

export const getSupplierPrices = async (materialId) => {
    return [
        { supplierName: "ABC Stone", price: 780000 },
        { supplierName: "XYZ Stone", price: 800000 },
        { supplierName: "Hanoi Stone", price: 750000 }
    ];
};

const recordPriceHistory = async (materialId, supplierId, oldPrice, newPrice, currency, priceType, changedBy, reason) => {
    try {
        await addDoc(collection(db, HISTORY_COLLECTION), {
            materialId,
            supplierId,
            oldPrice,
            newPrice,
            currency,
            priceType,
            changedAt: serverTimestamp(),
            changedBy,
            reason
        });
    } catch (error) {
        console.error("Error recording price history: ", error);
    }
};
