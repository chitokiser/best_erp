const fs = require('fs');

let html = fs.readFileSync('admin/users.html', 'utf8');

html = html.replace(/updateData\.tenant_id = 'system_master'; \/\/ Bond them to the Super Admin's workspace!/g,
"updateData.tenant_id = window.tenantId; // Bond them to the CURRENT logged-in CEO's workspace!");

html = html.replace(/tenant_id: 'system_master'/g,
"tenant_id: window.tenantId");

// Also fix loadUsers to ONLY load users of this tenant OR all users if Super Admin
// Since Jumper doesn't restrict read users for isCEO(), we do it client side for Franchisee CEOs:

const targetLoad = `const snap = await getDocs(collection(db, 'users'));`;
const repLoad = `let snap;
                if (window.currentUserEmail === 'daguri75@gmail.com' || window.tenantId === 'system_master') {
                    snap = await getDocs(collection(db, 'users'));
                } else {
                    snap = await getDocs(query(collection(db, 'users'), where('tenant_id', '==', window.tenantId)));
                }`;

html = html.replace(targetLoad, repLoad);

// add query, where to imports
html = html.replace(/import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc } from 'firebase\/firestore';/,
"import { collection, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, query, where } from 'firebase/firestore';");

// CheckAdminAuth to set currentUserEmail
html = html.replace(/checkAdminAuth\(\(\) => loadUsers\(\)\);/,
"checkAdminAuth((user) => { window.currentUserEmail = user.email; loadUsers(); });");

fs.writeFileSync('admin/users.html', html, 'utf8');

