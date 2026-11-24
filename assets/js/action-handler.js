import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

/**
 * 텔레그램 알림은 서버(Cloud Function: erpTelegramNotify)가 보낸다.
 * 봇 토큰을 브라우저 코드에 두면 빌드된 JS 에 그대로 노출되므로 여기서는 알림 종류와 값만 넘긴다.
 * 문장은 서버가 종류(kind)에 맞춰 만든다. 알림 실패는 본 작업을 막지 않는다.
 */
let telegramCallable = null;
const sendTelegramNotification = async (kind, fields) => {
    try {
        if (!telegramCallable) {
            telegramCallable = httpsCallable(getFunctions(getApp(), 'us-central1'), 'erpTelegramNotify');
        }
        await telegramCallable({ kind, fields });
    } catch (e) {
        console.warn("텔레그램 알림 전송 실패(작업은 정상 처리됨):", e?.code || '', e?.message || e);
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
        await sendTelegramNotification('material_upload', { projectId, details: materialDetails });

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
        await sendTelegramNotification('ai_action', { action: actionContext });

        return true;
    } catch (e) {
        console.error("Execution error:", e);
        return false;
    }
};
