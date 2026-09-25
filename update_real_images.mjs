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

// Real material-matching Unsplash pictures
const categoryImages = {
    '인테리어': [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600', // Wall texture
        'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600', // Hardwood
        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600', // Interior surface
        'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600'  // Room architecture
    ],
    '엘리베이터': [
        'https://images.unsplash.com/photo-1517581561081-3316cc810d29?w=600', // Elevator buttons
        'https://images.unsplash.com/photo-1588612140669-0dfdf3491ca0?w=600', // Elevator doors
        'https://images.unsplash.com/photo-1594916892523-a18d18471b05?w=600'  // Escalator/Elevator
    ],
    '소방': [
        'https://images.unsplash.com/photo-1453227588063-bb302b62f50b?w=600', // Fire extinguisher
        'https://images.unsplash.com/photo-1593457999818-6202479eabd3?w=600', // Fire hose
        'https://images.unsplash.com/photo-1542171549-d754fae8964e?w=600'  // Fire alarm/pump
    ],
    '스마트주차장': [
        'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600', // Parking structure
        'https://images.unsplash.com/photo-1573348719039-3ab1b9ebfd1c?w=600', // Smart barrier
        'https://images.unsplash.com/photo-1549449830-a92c48cb159b?w=600'  // Parking sensors
    ],
    '기타': [
        'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=600', // Concrete raw
        'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600', // Steel beams
        'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=600', // Generic materials
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600'  // Ceiling grid
    ]
};

const updateImages = async () => {
    let updatedCount = 0;
    const snap = await db.collection('materials').get();

    for (const docSnap of snap.docs) {
        const data = docSnap.data();
        const cat = data.categoryId || '기타';

        let pool = categoryImages[cat] || categoryImages['기타'];
        const randomImgUrl = pool[Math.floor(Math.random() * pool.length)];

        await docSnap.ref.update({
            images: [randomImgUrl]
        });
        updatedCount++;
    }

    console.log(`Replaced dummy image URLs with highly-relevant Unsplash images for ${updatedCount} materials.`);
};

updateImages();
