import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

/**
 * Send Telegram Notification
 */
const sendTelegramNotification = async (message) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_ADMIN_TELEGRAM_ID;

    if (!token || !chatId) {
        console.warn("Telegram Token or Chat ID is missing. Notification not sent.");
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        console.log("Telegram notification sent successfully.");
    } catch (e) {
        console.error("Failed to send Telegram notification:", e);
    }
};

/**
 * Mobile App - Action: Confirm Material Registration
 */
export const confirmMobileMaterialUpload = async (projectId, materialDetails) => {
    try {
        // 1. Write to Firebase
        await addDoc(collection(db, 'materials'), {
            project: projectId,
            details: materialDetails,
            status: '입고완료',
            source: 'AI 모바일 간편 등록',
            createdAt: serverTimestamp()
        });

        // 2. Write Audit / Notification Log
        await addDoc(collection(db, 'notifications'), {
            title: '현장 모바일 자재 입고 완료',
            project: projectId,
            message: materialDetails,
            createdAt: serverTimestamp()
        });

        // NEW: Real-time update Project Progress! Look for ID P-001 (or matching string)
        const prjRef = collection(db, 'projects');
        const q = query(prjRef, where('id', '==', 'P-001'));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const docId = snap.docs[0].id;
            const currentProgress = snap.docs[0].data().progress || 0;
            // Bump progress by +4% for demo effect of uploading a task!
            const newProgress = Math.min(100, currentProgress + 4);
            await updateDoc(doc(db, 'projects', docId), { progress: newProgress });
            console.log(`[CEO Dashboard Sync] Updated P-001 progress to ${newProgress}%`);
        }

        // 3. Send Telegram Alert
        const tgMsg = `📦 <b>AI-ERM 현장 모바일 알림</b>\n\n📌 <b>프로젝트</b>: ${projectId}\n📋 <b>자재 입고</b>: ${materialDetails}\n✅ AI 자동 등록 및 승인이 완료되었습니다.`;
        await sendTelegramNotification(tgMsg);

        return true;
    } catch (e) {
        console.error("Firebase write error:", e);
        return false;
    }
};

/**
 * CEO Dashboard - Action: Execute AI Recommendation (E.g. Move Equipment)
 */
export const executeAiRecommendation = async (recId, actionContext) => {
    try {
        // 1. Update Equipment or related Collection (Mockup behavior for specific action logic)
        // Here we just write a system log as proof of execution
        await addDoc(collection(db, 'audit_logs'), {
            actionType: 'EXECUTE_AI_REC',
            actionDesc: actionContext,
            createdAt: serverTimestamp()
        });

        // 2. Telegram Alert
        const tgMsg = `🤖 <b>AI-ERM 경영 조치 실행</b>\n\n✅ <b>승인 내역</b>: ${actionContext}\n👨‍💼 경영진 승인 처리가 시스템에 반영되었습니다.`;
        await sendTelegramNotification(tgMsg);

        return true;
    } catch (e) {
        console.error("Execution error:", e);
        return false;
    }
};
