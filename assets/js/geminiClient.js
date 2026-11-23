// Gemini 호출은 서버(Cloud Function: erpGeminiGenerate)를 거친다.
// API 키는 브라우저에 두지 않는다 (예전에는 소스에 키가 그대로 들어 있었음).
// 기존 코드가 fetch() 응답처럼 쓸 수 있게 { ok, status, json(), text() } 형태로 돌려준다.
import './firebase-config.js';
import { getApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';

let callable = null;
function getCallable() {
    if (!callable) {
        callable = httpsCallable(getFunctions(getApp(), 'us-central1'), 'erpGeminiGenerate', { timeout: 120000 });
    }
    return callable;
}

export async function geminiFetch(payload, model = 'gemini-2.5-flash') {
    try {
        const res = await getCallable()({ body: payload, model });
        const data = res.data || {};
        return { ok: true, status: 200, json: async () => data, text: async () => JSON.stringify(data) };
    } catch (err) {
        const message = err?.message || String(err);
        const status = err?.code === 'functions/resource-exhausted' ? 429
            : err?.code === 'functions/permission-denied' ? 403
            : err?.code === 'functions/unauthenticated' ? 401 : 500;
        console.error('Gemini(서버 중계) 오류:', err?.code, message);
        return {
            ok: false,
            status,
            json: async () => ({ error: { message } }),
            text: async () => message
        };
    }
}
