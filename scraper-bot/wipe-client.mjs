import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

try {
    const envData = require('fs').readFileSync('../.env', 'utf8');
    const getVal = (key) => {
        const m = envData.match(new RegExp(key + '="?([^"\\n]+)"?'));
        return m ? m[1].replace('\\r', '') : '';
    };

    const firebaseConfig = {
        apiKey: getVal('VITE_FIREBASE_API_KEY'),
        authDomain: getVal('VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: getVal('VITE_FIREBASE_PROJECT_ID'),
        storageBucket: getVal('VITE_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getVal('VITE_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getVal('VITE_FIREBASE_APP_ID')
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    async function wipe() {
        console.log("Fetching projects...");
        const snap = await getDocs(collection(db, 'projects'));
        console.log("Found " + snap.size + " projects. Deleting...");
        let count = 0;
        for (let d of snap.docs) {
            await deleteDoc(doc(db, 'projects', d.id));
            count++;
        }
        console.log(`Wiped ${count} projects. Ready for CEO!`);
        process.exit(0);
    }
    wipe();
} catch (e) {
    console.error(e);
    process.exit(1);
}
