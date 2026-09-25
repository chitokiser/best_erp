import fs from 'fs';
import path from 'path';

// 1. Create services/purchaseApi.js
const purchaseApiContent = `
import { db } from '../assets/js/firebase-config.js';
import { collection, addDoc, getDocs, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

export const createPurchaseRequest = async (requestData) => {
    const docRef = await addDoc(collection(db, 'purchase_requests'), {
        ...requestData,
        status: 'PENDING_TEAM_LEAD', // PENDING_TEAM_LEAD -> PENDING_CEO -> APPROVED -> PURCHASED
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateRequestStatus = async (id, status, approverName = '') => {
    const ref = doc(db, 'purchase_requests', id);
    await updateDoc(ref, { 
        status, 
        lastApprover: approverName,
        updatedAt: serverTimestamp() 
    });
};

export const getPurchaseRequests = async () => {
    const q = query(collection(db, 'purchase_requests'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
`;
fs.writeFileSync('services/purchaseApi.js', purchaseApiContent, 'utf8');

// 2. NAV UPDATES (Public and Admin)
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = findHtmlFiles('./');
htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;

    // Public nav update: Add "구매요청(장바구니)" after 공급업체
    if (!file.includes('admin') && !content.includes('request-form.html')) {
        content = content.replace(/(<li><a href="suppliers\.html".*?>공급업체<\/a><\/li>)/g, '$1\n                    <li><a href="request-form.html" id="navCartLink">구매요청 <span id="cartCount" style="background:var(--primary-color);color:#fff;border-radius:10px;padding:2px 6px;font-size:0.75rem;">0</span></a></li>');
        modified = true;
    }

    // Admin nav update: Add "결재관리"
    if (file.includes('admin') && !content.includes('purchase-requests.html')) {
        content = content.replace(/(<li><a href="users\.html".*?>권한관리<\/a><\/li>)/g, '<li><a href="purchase-requests.html">결재관리(구매)</a></li>\n                    $1');
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
    }
});
console.log('API and Navs updated successfully.');
