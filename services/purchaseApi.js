
import { db } from '../assets/js/firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export const createPurchaseRequest = async (requestData) => {
    const docRef = await addDoc(collection(db, 'purchaseRequests'), {
        ...requestData,
        status: 'PENDING_TEAM_LEAD', // PENDING_TEAM_LEAD -> PENDING_CEO -> APPROVED -> PURCHASED
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateRequestStatus = async (id, status, approverName = '') => {
    const ref = doc(db, 'purchaseRequests', id);
    await updateDoc(ref, {
        status,
        lastApprover: approverName,
        updatedAt: serverTimestamp()
    });
};

export const getPurchaseRequests = async () => {
    const q = query(collection(db, 'purchaseRequests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
