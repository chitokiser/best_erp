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

async function cleanImages() {
    let count = 0;
    const snap = await db.collection('materials').get();

    for (const doc of snap.docs) {
        const data = doc.data();
        if (data.images && data.images.length > 0) {
            let needsClean = false;
            // Check all images in array just in case
            for (const img of data.images) {
                if (img.includes('unsplash.com') || img.includes('picsum.photos')) {
                    needsClean = true;
                    break;
                }
            }
            if (needsClean) {
                await doc.ref.update({ images: [] });
                count++;
            }
        }
    }
    console.log(`Successfully removed irrelevant mock images from ${count} database items.`);
}

cleanImages();
