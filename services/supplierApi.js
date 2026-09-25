import { db } from '../assets/js/firebase-config.js';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'suppliers';

export const createSupplier = async (supplierData) => {
    try {
        const newSupplier = {
            ...supplierData,
            status: "active",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, COLLECTION_NAME), newSupplier);
        return docRef.id;
    } catch (error) {
        console.error("Error creating supplier: ", error);
        throw error;
    }
};

export const getAllSuppliers = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        const suppliers = [];
        querySnapshot.forEach((doc) => {
            suppliers.push({ id: doc.id, ...doc.data() });
        });
        return suppliers;
    } catch (error) {
        console.error("Error getting suppliers: ", error);
        throw error;
    }
};

export const getSupplierById = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting supplier: ", error);
        throw error;
    }
};
