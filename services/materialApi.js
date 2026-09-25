import { db, storage } from '../assets/js/firebase-config.js';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth } from '../assets/js/firebase-config.js'; // to get currentUser 

const COLLECTION_NAME = 'materials';
const HISTORY_COLLECTION = 'priceHistory';

export const createMaterial = async (materialData, imageFiles) => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Unauthorized");

        let imageUrls = [];
        if (imageFiles && imageFiles.length > 0) {
            imageUrls = await uploadMaterialImages(imageFiles, materialData.materialCode || Date.now().toString());
        }

        const newMaterial = {
            ...materialData,
            images: imageUrls,
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            createdBy: currentUser.uid,
            updatedBy: currentUser.uid
        };

        const docRef = await addDoc(collection(db, COLLECTION_NAME), newMaterial);

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

export const getAllMaterials = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const materials = [];
        querySnapshot.forEach((doc) => {
            materials.push({ id: doc.id, ...doc.data() });
        });
        return materials;
    } catch (error) {
        console.error("Error getting materials: ", error);
        throw error;
    }
};

export const getMaterialById = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
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

// [가격 비교를 위한 확장 API]
// 실제 외부 API 연동 전까지 Mock(가상 데이터)을 반환하거나 externalPrices 컬렉션을 바라보게 합니다.
export const getExternalPrices = async (materialId) => {
    // 향후 Firestore 'externalPrices' 컬렉션에서 가져오도록 수정
    // 현재는 플랫폼 시연을 위해 Mock Data 반환
    return [
        { source: "BXD (공공가격)", price: 850000, type: "PUBLIC" },
        { source: "Vatgia (시장가격)", price: 820000, type: "MARKET" }
    ];
};

export const getSupplierPrices = async (materialId) => {
    // 향후 자재-공급업체 연결 브릿지 테이블이나 Array 필드에서 동적으로 계산
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
