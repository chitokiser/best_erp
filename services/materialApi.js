import { db, storage } from '../assets/js/firebase-config.js';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../assets/js/firebase-config.js';
import { getCurrentStoreInfo, getStoreSubcollection, getStoreDocRef } from '../assets/js/tenant-router.js';

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
        const curStore = materialData.storeName || window.currentStoreName || storeInfo.name;

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

export const getAllMaterials = async (filterTenantId) => {
    try {
        const storeInfo = getCurrentStoreInfo();
        const curStoreId = (filterTenantId && filterTenantId !== 'ALL') ? String(filterTenantId) : storeInfo.storeId;

        // 1. Query dedicated store subcollection
        const storeMatRef = getStoreSubcollection('materials', curStoreId);
        let querySnapshot = await getDocs(storeMatRef);

        // One-time auto-migration for Best Winner legacy materials if empty
        if (curStoreId === '1791605366' && querySnapshot.empty) {
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

        const materials = [];
        querySnapshot.forEach((docSnap) => {
            materials.push({ id: docSnap.id, ...docSnap.data() });
        });
        return materials;
    } catch (error) {
        console.error("Error getting materials: ", error);
        throw error;
    }
};

export const getMaterialById = async (id, explicitStoreId) => {
    try {
        const storeInfo = getCurrentStoreInfo();
        const curStoreId = explicitStoreId || storeInfo.storeId;
        const storeDocRef = getStoreDocRef('materials', id, curStoreId);
        const docSnap = await getDoc(storeDocRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        // Fallback to root collection
        const rootSnap = await getDoc(doc(db, COLLECTION_NAME, id));
        if (rootSnap.exists()) {
            return { id: rootSnap.id, ...rootSnap.data() };
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
