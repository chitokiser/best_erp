// 백제갈비(1794710386) 상품 전체를 "매장 전용"(sales_channel: 'in_store')으로 바꾼다.
// 대표 승인 2026-11-18. 기본은 미리보기, 실제 변경은 --apply
//   node scripts/set_baekje_in_store.mjs           (미리보기)
//   node scripts/set_baekje_in_store.mjs --apply   (변경)
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

dotenv.config();
initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: String(process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
});
const db = getFirestore();
const APPLY = process.argv.includes('--apply');
const IDS = ['1794710386', 'baekje_galbi', 'baekjegalbi', 1794710386];

const seen = new Map();
for (const field of ['merchant_id', 'merchantId']) {
    const snap = await db.collection('merchant_products').where(field, 'in', IDS).get();
    snap.forEach(d => seen.set(d.id, d));
}
const docs = [...seen.values()];
const counts = {};
docs.forEach(d => { const c = d.data().sales_channel || '(없음)'; counts[c] = (counts[c] || 0) + 1; });
console.log(`백제갈비 상품 ${docs.length}개, 현재 판매 채널:`, counts);
docs.slice(0, 5).forEach(d => console.log(' -', d.data().product_name));

if (!APPLY) {
    console.log('미리보기만 했습니다. 실제로 바꾸려면 --apply 를 붙여 실행하세요.');
    process.exit(0);
}
let changed = 0;
for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    docs.slice(i, i + 400).forEach(d => {
        if (d.data().sales_channel === 'in_store') return;
        batch.update(d.ref, { sales_channel: 'in_store', updated_at: FieldValue.serverTimestamp() });
        changed++;
    });
    await batch.commit();
}
console.log(`완료: ${changed}개를 매장 전용으로 바꿨습니다.`);
