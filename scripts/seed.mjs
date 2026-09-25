import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'path';

// Load config from .env
dotenv.config();

// Create firebase admin credential
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
};

if (!privateKey) {
    console.error("Missing FIREBASE_PRIVATE_KEY in .env");
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

// Helper to get random number
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomPrice = (min, max, step = 10000) => Math.floor(randomInt(min, max) / step) * step;

const categories = [
    {
        name: '벽재',
        names: ['대리석 벽타일', '오염방지 페인트', '친환경 벽지', '방음용 패널', '아트월 목재', '실내용 파벽돌'],
        brands: ['Dulux', 'Nippon', 'Inax', 'Viglacera', 'Taicera'],
        units: ['㎡', 'Box', 'Roll'],
        vi: 'Vật liệu tường',
        en: 'Wall Material'
    },
    {
        name: '바닥재',
        names: ['폴리싱 타일', '원목 마루', '에폭시 바닥재', '강화 파이프 마루', '포셀린 타일 600', '카펫 타일'],
        brands: ['Dongwha', 'Inax', 'Prime', 'Thach Ban'],
        units: ['㎡', 'Box'],
        vi: 'Vật liệu sàn',
        en: 'Flooring'
    },
    {
        name: '천장재',
        names: ['석고보드', 'SMC 천장재', '원목 루바', '알루미늄 루바', '방음 천장재'],
        brands: ['Vinh Tuong', 'Gyproc', 'Boral'],
        units: ['㎡', 'Sheet'],
        vi: 'Vật liệu trần',
        en: 'Ceiling Material'
    },
    {
        name: '내장재',
        names: ['인테리어 도어', 'MDF 합판', '경량 철골', '내부용 방수액', '투명 실리콘', '단열재'],
        brands: ['An Cuong', 'Hoa Phat', 'Apollo', 'Eurowindow'],
        units: ['EA', 'Sheet', 'Tube'],
        vi: 'Nội thất & Kết cấu',
        en: 'Interior Materials'
    },
    {
        name: '마감재',
        names: ['알루미늄 몰딩', '재료분리대', '친환경 바니쉬', '인조대리석 상판', '천장 몰딩'],
        brands: ['Vicostone', 'Xingfa', 'D&B'],
        units: ['m', 'Box', 'EA'],
        vi: 'Vật liệu hoàn thiện',
        en: 'Finishing Materials'
    }
];

const seedMaterials = async () => {
    let count = 1;
    let successCount = 0;

    console.log("Starting bulk insertion of 100+ materials...");

    for (const cat of categories) {
        // Generate 25 items per category (total 125)
        for (let i = 1; i <= 25; i++) {
            const baseName = cat.names[randomInt(0, cat.names.length - 1)];
            const brand = cat.brands[randomInt(0, cat.brands.length - 1)];
            const unit = cat.units[randomInt(0, cat.units.length - 1)];

            // Prices
            const marketP = randomPrice(200000, 2000000);
            const purchaseP = randomPrice(marketP * 0.7, marketP * 0.9); // 10% ~ 30% margin
            const sellP = randomPrice(marketP, marketP * 1.5);

            const mCode = `BEST-${cat.en.substring(0, 3).toUpperCase()}-${String(count).padStart(4, '0')}`;

            const docData = {
                materialCode: mCode,
                name: `${brand} ${baseName} ${randomInt(100, 900)}`,
                nameVi: `${cat.vi} - ${brand} model ${i}`,
                nameEn: `${cat.en} - ${brand} model ${i}`,
                categoryId: cat.name,
                subCategoryId: baseName,
                applications: [cat.name.replace('재', '')], // '벽재' -> '벽'
                brand: brand,
                model: `MD${randomInt(10, 99)}-${String.fromCharCode(65 + randomInt(0, 25))}`,
                color: ['White', 'Black', 'Grey', 'Wood', 'Beige'][randomInt(0, 4)],
                specification: `${randomInt(3, 12)}00x${randomInt(3, 12)}00x1${randomInt(0, 5)}mm`,
                unit: unit,
                ourPurchasePrice: purchaseP,
                ourSellingPrice: sellP,
                currency: "VND",
                vatIncluded: Boolean(randomInt(0, 1)), // true or false
                description: `High quality ${cat.en.toLowerCase()} for Vietnam standard constructions.`,
                status: 'active',
                images: [`https://source.unsplash.com/random/600x400/?${cat.en.replace(' ', '')},architecture&v=${count}`],
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                createdBy: 'systemAdmin'
            };

            await db.collection('materials').add(docData);
            count++;
            successCount++;
        }
        console.log(`Inserted 25 items for category: ${cat.name}`);
    }

    console.log(`Finished inserting ${successCount} materials successfully!`);
    process.exit(0);
};

seedMaterials().catch(console.error);
