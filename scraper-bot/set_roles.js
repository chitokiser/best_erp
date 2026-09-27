const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const envContent = fs.readFileSync('../.env', 'utf8');
const pkMatch = envContent.match(/FIREBASE_PRIVATE_KEY="?([^"\n]+)"?/);
const privateKey = pkMatch ? pkMatch[1].replace(/\\n/g, '\n') : '';
const emMatch = envContent.match(/FIREBASE_CLIENT_EMAIL="?([^"\n]+)"?/);
const clientEmail = emMatch ? emMatch[1] : '';
const idMatch = envContent.match(/VITE_FIREBASE_PROJECT_ID="?([^"\n]+)"?/);
let projectId = idMatch ? idMatch[1] : '';
if (projectId.includes(')')) projectId = projectId.split(')')[0];

initializeApp({
    credential: cert({
        projectId: projectId || "aim119",
        clientEmail: clientEmail,
        privateKey: privateKey,
    })
});

const db = getFirestore();

async function run() {
    try {
        console.log("Setting up test users in Firestore...");

        const usersRef = db.collection('users');

        // 1. CEO
        const ceoQuery = await usersRef.where('email', '==', 'daguri75@gmail.com').get();
        if (ceoQuery.empty) {
            await usersRef.add({ email: 'daguri75@gmail.com', role: 'ADMIN', position: 'CEO', status: '승인됨', createdAt: new Date() });
        } else {
            ceoQuery.forEach(async (doc) => {
                await doc.ref.update({ role: 'ADMIN', position: 'CEO', status: '승인됨' });
            });
        }
        console.log("-> daguri75@gmail.com (CEO/ADMIN) 설정 완료");

        // 2. 박대리
        const staffQuery = await usersRef.where('email', '==', 'kfu134252@gmail.com').get();
        if (staffQuery.empty) {
            await usersRef.add({ email: 'kfu134252@gmail.com', role: 'STAFF', position: '박대리', status: '승인됨', createdAt: new Date() });
        } else {
            staffQuery.forEach(async (doc) => {
                await doc.ref.update({ role: 'STAFF', position: '박대리', status: '승인됨' });
            });
        }
        console.log("-> kfu134252@gmail.com (STAFF/박대리) 설정 완료");
        setTimeout(() => process.exit(0), 1000); // give it a sec to flush network
    } catch (e) {
        console.error("Error writing user roles:", e);
    }
}
run();
