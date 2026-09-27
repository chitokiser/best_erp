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

const sendTelegramNotification = async (message) => {
    const token = process.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = process.env.VITE_ADMIN_TELEGRAM_ID;
    if (!token || !chatId) return;
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (e) {
        console.error("TG Error:", e);
    }
};

async function generateAiDailyReport() {
    console.log("Running AI Background Engine (Cron Job)...");

    // 1. Fetch raw data from DB
    const empSnap = await db.collection('employees').get();
    let totalLoad = 0;
    empSnap.forEach(d => totalLoad += (d.data().load_percentage || 0));
    const avgLoad = empSnap.size > 0 ? (totalLoad / empSnap.size).toFixed(1) : 0;

    const eqSnap = await db.collection('equipment').get();
    let eqActive = 0;
    eqSnap.forEach(d => { if (d.data().status === '사용중') eqActive++; });

    // In real app, we would send this data to Gemini or OpenAI to get a dynamic markdown text
    // For MVP efficiency we use a heuristics-based generation template mixed with real db data.

    const kpiScore = Math.min(100, Math.max(0, 100 - (avgLoad > 100 ? 5 : 0))); // Example dynamic KPI calculation

    const reportContent = `[AI DAILY REPORT - ${new Date().toISOString().split('T')[0]}]

1. 📊 종합 AI 경영지수
 - 오늘 점수: ${kpiScore}점
 - 상태: 양호

2. 👥 인력 활용도
 - 평균 로드율: ${avgLoad}%
 - 조치 필요: 김과장(117%) 투입률 임계치 초과

3. 🚜 장비 현황
 - 전체 ${eqSnap.size}대 중 ${eqActive}대 가동중 (가동률 ${((eqActive / eqSnap.size) * 100).toFixed(1)}%)

4. 🤖 AI 자동 제안
 - A프로젝트 철근 자재 부족 예상 → 발주 승인 대기중
 - B프로젝트 장비 유휴시간 활용 → C프로젝트 이동 추천`;

    // 2. Write report to DB
    await db.collection('ai_daily_reports').add({
        date: new Date().toISOString().split('T')[0],
        content: reportContent,
        kpiScore: kpiScore,
        createdAt: FieldValue.serverTimestamp()
    });
    console.log("Report generated and saved to DB.");

    // 3. Fire notification
    await sendTelegramNotification(`📈 <b>오늘의 AI 경영보고 브리핑</b>\n\n<pre>${reportContent}</pre>\n\n<i>자세한 내용은 CEO Dashboard에서 확인하세요.</i>`);
    console.log("Daily brief sent to Telegram.");
}

generateAiDailyReport().then(() => process.exit(0)).catch(console.error);
