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

// [SIMULATION]
// This data simulates a payload received from a Global Elevator Parts B2B API (e.g. PartsBase, Schindler B2B Portal).
// In a real-world scenario, this is replaced by an axios.get('https://api.elevator-parts.com/v1/catalog') call.

const fetchElevatorAPI = async () => {
    // Simulating API network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    return [
        {
            code: "ELV-TRC-GT100",
            name: "기어리스 권상기 (Gearless Traction Machine)",
            en: "Gearless Traction Machine",
            vi: "Máy kéo không hộp số",
            brand: "Hyundai Elevator",
            model: "GT-100",
            spec: "속도 1m/s, 하중 1000kg",
            price: 75000000,
            img: "https://images.unsplash.com/photo-1594916892523-a18d18471b05?w=600"
        },
        {
            code: "ELV-COP-OT20",
            name: "조작반 (Car Operating Panel)",
            en: "Car Operating Panel (COP)",
            vi: "Bảng điều khiển trong cabin",
            brand: "Otis",
            model: "GEN2-COP",
            spec: "LCD 디스플레이, 터치버튼형",
            price: 12000000,
            img: "https://images.unsplash.com/photo-1517581561081-3316cc810d29?w=600"
        },
        {
            code: "ELV-MCB-SC5",
            name: "메인 제어 보드 (Main Control Board)",
            en: "Main Control Board",
            vi: "Bo mạch điều khiển chính",
            brand: "Schindler",
            model: "MCB-5300",
            spec: "마이크로프로세서 32-bit",
            price: 25000000,
            img: "https://images.unsplash.com/photo-1517581561081-3316cc810d29?w=600"
        },
        {
            code: "ELV-DOP-TK",
            name: "도어 오퍼레이터 (Door Operator)",
            en: "Door Operator System",
            vi: "Hệ thống truyền động cửa",
            brand: "ThyssenKrupp",
            model: "DOP-VF",
            spec: "VVVF 인버터 제어, 폭 800-1000mm",
            price: 18000000,
            img: "https://images.unsplash.com/photo-1588612140669-0dfdf3491ca0?w=600"
        },
        {
            code: "ELV-ROP-8X19",
            name: "강철 와이어 로프 (Steel Wire Rope)",
            en: "Steel Wire Rope for Elevator",
            vi: "Cáp thép thang máy",
            brand: "Kiswire",
            model: "8x19S+FC",
            spec: "직경 10mm, 인장강도 1770N/mm2",
            price: 85000, // per meter
            img: "https://images.unsplash.com/photo-1542171549-d754fae8964e?w=600"
        },
        {
            code: "ELV-GOV-100",
            name: "조속기 (Overspeed Governor)",
            en: "Overspeed Governor",
            vi: "Bộ chống vượt tốc",
            brand: "Nidec",
            model: "OSG-150",
            spec: "정격속도 1~1.5m/s 대응",
            price: 8500000,
            img: "https://images.unsplash.com/photo-1517581561081-3316cc810d29?w=600"
        },
        {
            code: "ELV-BUF-OIL",
            name: "유입 완충기 (Oil Buffer)",
            en: "Oil Buffer",
            vi: "Giảm chấn thủy lực",
            brand: "KTC",
            model: "OB-175",
            spec: "스트로크 175mm",
            price: 4200000,
            img: "https://images.unsplash.com/photo-1594916892523-a18d18471b05?w=600"
        },
        {
            code: "ELV-RAIL-T89",
            name: "가이드 레일 (Guide Rail)",
            en: "Elevator Guide Rail (T-Type)",
            vi: "Ray dẫn hướng thang máy",
            brand: "Monteferro",
            model: "T89/B",
            spec: "길이 5m, T형 정밀가공",
            price: 1500000,
            img: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600"
        },
        {
            code: "ELV-SGEAR-1",
            name: "비상정지장치 (Safety Gear)",
            en: "Safety Gear",
            vi: "Bộ hãm an toàn",
            brand: "Hyundai Elevator",
            model: "SG-3000",
            spec: "프로그레시브 타입, 용량 1600kg 이하",
            price: 6800000,
            img: "https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=600"
        },
        {
            code: "ELV-ILOCK-2",
            name: "승강장 도어 인터록 (Landing Door Interlock)",
            en: "Landing Door Interlock",
            vi: "Khóa liên động cửa tầng",
            brand: "Prisma",
            model: "IL-X2",
            spec: "방수방진 IP54",
            price: 1100000,
            img: "https://images.unsplash.com/photo-1588612140669-0dfdf3491ca0?w=600"
        }
    ];
};

const runSync = async () => {
    console.log("Connecting to Global Elevator Parts Manufacturer API...");
    try {
        const partsData = await fetchElevatorAPI();
        console.log(`Successfully fetched ${partsData.length} items from API. Synchronizing to BEST Firestore...`);

        const colRef = db.collection('materials');
        let newAdded = 0;

        for (const item of partsData) {
            const q = await colRef.where('materialCode', '==', item.code).get();
            if (q.empty) {
                await colRef.add({
                    materialCode: item.code,
                    name: item.name,
                    nameVi: item.vi,
                    nameEn: item.en,
                    categoryId: "엘리베이터",
                    subCategoryId: "주요 부품",
                    brand: item.brand,
                    model: item.model,
                    specification: item.spec,
                    unit: "EA",
                    ourPurchasePrice: item.price,
                    ourSellingPrice: Math.floor(item.price * 1.3),
                    currency: "VND",
                    vatIncluded: false,
                    applications: ["엘리베이터 설치", "엘리베이터 유지보수"],
                    description: "제조사 자동연동 서버에서 동기화된 데이터입니다.",
                    status: "active",
                    images: [item.img],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    supplierIds: []
                });
                newAdded++;
            }
        }
        console.log(`Synchronization Complete! Added ${newAdded} new elevator components to database.`);
    } catch (e) {
        console.error("API Sync failed: ", e);
    }
};

runSync();
