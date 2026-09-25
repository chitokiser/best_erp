import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});

const db = getFirestore();

const fixImages = async () => {
    const materialsRef = db.collection('materials');
    const snapshot = await materialsRef.get();

    let cnt = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.images && data.images[0] && data.images[0].includes('source.unsplash.com')) {
            // Unsplash source API is offline, using picsum with seed
            const newImg = `https://picsum.photos/seed/${doc.id.substring(0, 5)}/600/400`;
            batch.update(doc.ref, { images: [newImg] });
            cnt++;
        }
    });

    if (cnt > 0) {
        await batch.commit();
        console.log(`Fixed images for ${cnt} materials.`);
    } else {
        console.log("No images to fix.");
    }
}
fixImages();
