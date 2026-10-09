const fs = require('fs');
const file = 'assets/js/admin-crm.js';
let js = fs.readFileSync(file, 'utf8');

// The field Jumper uses is mentorAddressInput
js = js.replace(/where\('mentorEmail', '==', window\.currentUserEmail \|\| auth\.currentUser\?\.email \|\| ''\)/, 
"where('mentorAddressInput', '==', window.currentUserEmail || auth.currentUser?.email || '')");

// And also fetch by mentorEmail just in case and merge them:
const targetLoad = `const q = query(collection(db, 'users'), where('mentorAddressInput', '==', window.currentUserEmail || auth.currentUser?.email || ''));
        const snap = await getDocs(q);
        
        let mentees = snap.docs.map(doc => {`;

const newLoad = `
        const email = window.currentUserEmail || auth.currentUser?.email || '';
        const q1 = query(collection(db, 'users'), where('mentorAddressInput', '==', email));
        const q2 = query(collection(db, 'users'), where('mentorEmail', '==', email));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const docMap = new Map();
        snap1.docs.forEach(d => docMap.set(d.id, d));
        snap2.docs.forEach(d => docMap.set(d.id, d));
        
        let mentees = Array.from(docMap.values()).map(doc => {`;

js = js.replace(targetLoad, newLoad);
fs.writeFileSync(file, js, 'utf8');
