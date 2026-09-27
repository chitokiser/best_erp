import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const app = initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});

const db = getFirestore(app);

async function run() {
    console.log("Setting up AI-ERM Data Collections...");

    // 1. Employees DB
    const employees = [
        { name: '김과장', department: '설계팀', role: '설계담당', load_percentage: 117, current_projects: ['P-001', 'P-002', 'P-003', 'P-004'], score: 92 },
        { name: '박대리', department: '설계팀', role: '설계담당', load_percentage: 60, current_projects: ['P-003'], score: 85 },
        { name: '이소장', department: '시공팀', role: '현장소장', load_percentage: 100, current_projects: ['P-001', 'P-004'], score: 95 }
    ];

    const empRef = db.collection('employees');
    for (const emp of employees) {
        await empRef.add({ ...emp, createdAt: FieldValue.serverTimestamp() });
    }
    console.log("Employees seeded.");

    // 2. Equipment DB
    const equipments = [
        { name: '굴삭기 300Z', type: '건설장비', status: '사용중', current_project: 'P-001', expected_end: '2026-10-05', daily_cost: 500000 },
        { name: '레이저 레벨기', type: '측정장비', status: '대기중', current_project: null, expected_end: null, daily_cost: 15000 },
        { name: '크레인 5T', type: '건설장비', status: '예약됨', current_project: 'P-003', expected_end: '2026-10-10', daily_cost: 800000 }
    ];

    const eqRef = db.collection('equipment');
    for (const eq of equipments) {
        await eqRef.add({ ...eq, createdAt: FieldValue.serverTimestamp() });
    }
    console.log("Equipment seeded.");

    // 3. AI Recommendations Dummy Table
    const recs = [
        { type: 'danger', project: 'P-001', message: '자재 철근 부족 예상. 지금 발주하지 않으면 시공 3일 지연 가능성.', timestamp: FieldValue.serverTimestamp() },
        { type: 'warning', project: 'P-002', message: '김과장 업무 투입률 117%. 업무 과부하 리스크.', timestamp: FieldValue.serverTimestamp() },
        { type: 'info', project: 'P-004', message: '설계 단계 2일 지연. 최종 납기 67% 지연 예측.', timestamp: FieldValue.serverTimestamp() },
        { type: 'success', category: '장비', message: '크레인 5T를 P-003에서 P-001로 이동 시 임대 비용 절감 효과.', timestamp: FieldValue.serverTimestamp() }
    ];
    const aiRef = db.collection('ai_recommendations');
    for (const rec of recs) {
        await aiRef.add(rec);
    }
    console.log("AI Recommendations seeded.");

    console.log("AI-ERM Setup Complete!");
}

run().then(() => process.exit(0)).catch(console.error);
