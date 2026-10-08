import { db } from './firebase-config.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function loadTenantDataForAI() {
    let tId = window.tenantId || 'system_master';
    let dataContext = { projects: [], tasks: [], siteLogs: [] };
    try {
        const pSnap = await getDocs(query(collection(db, 'projects'), where('tenantId', '==', tId)));
        pSnap.forEach(d => dataContext.projects.push(d.data()));
        
        const tSnap = await getDocs(query(collection(db, 'tasks'), where('tenantId', '==', tId)));
        tSnap.forEach(d => dataContext.tasks.push(d.data()));
        
        const sSnap = await getDocs(query(collection(db, 'siteLogs'), where('tenantId', '==', tId)));
        sSnap.forEach(d => dataContext.siteLogs.push(d.data()));
    } catch(e) {
        console.error("데이터 로드 실패 (권한 혹은 네트워크):", e);
    }
    return dataContext;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const btnAiAnalyze = document.getElementById('btnAiAnalyze');
const aiQueryInput = document.getElementById('aiQueryInput');
const aiResponseArea = document.getElementById('aiResponseArea');
const aiResponseText = document.getElementById('aiResponseText');

function formatAiResponse(text) {
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

if(btnAiAnalyze) btnAiAnalyze.addEventListener('click', async () => {
    const query = aiQueryInput ? aiQueryInput.value.trim() : '';
    if (!query) {
        alert('경영참모에게 물어볼 질문을 입력해주세요.');
        return;
    }
    if (!GEMINI_API_KEY) {
        // Fallback or warning
        console.warn('Gemini API 키가 설정되지 않음');
    }

    if(aiResponseArea) aiResponseArea.style.display = 'block';
    if(aiResponseText) aiResponseText.innerHTML = '<span style="color:var(--text-muted);">회사 데이터를 분석 중입니다... 잠시만 기다려주세요.</span>';
    btnAiAnalyze.disabled = true;
    btnAiAnalyze.textContent = '분석중...';

    const dbData = await loadTenantDataForAI();
    let dataString = `총 프로젝트 ${dbData.projects.length}개. 결재문서 ${dbData.tasks.length}개. 현장이슈 ${dbData.siteLogs.length}개.`;
    
    // 추가적인 데이터 문자열화 (최대토큰 초과 방지를 위해 짧게 요약)
    const activeProjects = dbData.projects.filter(p => p.status !== '완료').map(p => `[${p.name}: ${p.progress}% 진행중]`);
    const pendingTasks = dbData.tasks.filter(t => t.status === 'PENDING').map(t => `[결재대기: ${t.title}]`);
    
    const promptLines = [
        '당신은 BEST_ERP 플랫폼을 지휘하는 유능한 AI 경영참모입니다.',
        '현재 회사의 실시간 데이터 기반 현황은 다음과 같습니다:',
        dataString,
        '진행중인 주요 프로젝트: ' + activeProjects.join(', '),
        '주요 결재 대기: ' + pendingTasks.join(', '),
        '---',
        '경영자(CEO)가 다음과 같이 방향을 질문했습니다: "' + query + '"',
        '위 데이터를 바탕으로 CEO가 만족할 수 있게 명쾌하게 현황 파악, 리스크 요인, 해결책 순으로 존댓말로 보고 및 조언해주세요.'
    ];
    const prompt = promptLines.join('\n');

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {      
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        const data = await response.json();
        if (data.error) {
            if(aiResponseText) aiResponseText.innerHTML = '<span style="color:red;">오류 발생: </span>' + data.error.message;
        } else if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            if(aiResponseText) aiResponseText.innerHTML = formatAiResponse(text);
        }
    } catch (err) {
        console.error('AI API Error:', err);
        if(aiResponseText) aiResponseText.innerHTML = '<span style="color:red;">통신 오류가 발생했습니다. 권한 설정이나 키를 확인하세요.</span>';
    } finally {
        btnAiAnalyze.disabled = false;
        btnAiAnalyze.textContent = '분석하기';
    }
});

if(aiQueryInput) aiQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if(btnAiAnalyze) btnAiAnalyze.click();
    }
});
