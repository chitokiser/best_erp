import dotenv from 'dotenv';
import { Telegraf } from 'telegraf';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

dotenv.config();

// 1. Firebase Admin Initialization
const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
const app = initializeApp({
    credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    })
});
const db = getFirestore(app);

// 2. Telegram Bot Init
const bot = new Telegraf(process.env.VITE_TELEGRAM_BOT_TOKEN);

console.log("Starting AI-ERM Telegram Bot Listener...");

// If added to a group or someone says /start
bot.start((ctx) => {
    const chatId = ctx.chat.id;
    const type = ctx.chat.type;
    console.log(`Command /start received in chat ID: ${chatId} (${type})`);

    ctx.reply(`안녕하세요! AI-ERM 공식 경영 알림 봇입니다. 🤖
    
현재 이 채팅방의 Chat ID는 [ \`${chatId}\` ] 입니다.
.env 파일의 관리자 텔레그램 ID를 위 번호로 업데이트하시면 이 방에서 ERP 알림을 받아보실 수 있습니다.

/report - 오늘 AI 요약 보고서 즉시 받기
/status - 시스템 상태 보기`, { parse_mode: 'Markdown' });
});

bot.command('report', async (ctx) => {
    try {
        const snap = await db.collection('ai_daily_reports').orderBy('createdAt', 'desc').limit(1).get();
        if (snap.empty) {
            return ctx.reply("아직 생성된 AI 리포트가 없습니다.");
        }
        const report = snap.docs[0].data();
        ctx.reply(`📈 *오늘의 경영 요약*\n\n=======\n${report.content}\n=======`, { parse_mode: 'Markdown' });
    } catch (e) {
        console.log(e);
        ctx.reply("❌ 에러 발생");
    }
});

bot.command('status', (ctx) => {
    ctx.reply(`🟢 AI-ERM 안정적으로 구동 중입니다.\n\n웹 대시보드에서 추가 분석을 확인하세요!`);
});

bot.on('message', (ctx) => {
    // optional: track interactions or capture group setup
    if (ctx.message.new_chat_members) {
        ctx.reply("AI-ERM 봇 그룹방 활성화 완료! 🤖\n/start 로 세팅을 시작하세요.");
    }
});

bot.launch().then(() => console.log("Bot running!"));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
