import { db } from './firebase-config.js';
import { collection, getDocs } from 'firebase/firestore';

async function loadBasicMetrics() {
    try {
        const projSnap = await getDocs(collection(db, 'projects'));
        if (!projSnap.empty) {
            const pc = document.getElementById('projCount'); if (pc) pc.textContent = projSnap.size + '개';
        }
    } catch (err) {
        console.log('Error loading metrics', err);
    }
}
loadBasicMetrics();

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const btnAiAnalyze = document.getElementById('btnAiAnalyze');
const aiQueryInput = document.getElementById('aiQueryInput');
const aiResponseArea = document.getElementById('aiResponseArea');
const aiResponseText = document.getElementById('aiResponseText');

function formatAiResponse(text) {
    return text.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong></strong>');
}

if(btnAiAnalyze) btnAiAnalyze.addEventListener('click', async () => {
    const query = aiQueryInput.value.trim();
    if (!query) {
        alert('경영참모에게 물어볼 질문을 입력해주세요.');
        return;
    }
    if (!GEMINI_API_KEY) {
        alert('Gemini API 키가 설정되지 않았습니다 (.env)');
        return;
    }

    aiResponseArea.style.display = 'block';
    aiResponseText.innerHTML = '<span style=\"color:var(--text-muted);\">분석 중입니다... 잠시만 기다려주세요.</span>';
    btnAiAnalyze.disabled = true;
    btnAiAnalyze.textContent = '분석중...';

    // 안전하게 프롬프트 구성
    const promptLines = [
        '당신은 BEST_ERP 회사의 유능한 AI 경영참모입니다.',
        '경영자(CEO)가 다음과 같이 질문했습니다: \"' + query + '\"',
        '경영진이 읽기 편하도록 명쾌하게 현황/문제점/해결책(추천) 순으로 요약해서 존댓말로 대답해주세요.',
        '가상의 상황이라고 가정하고 조언하셔도 좋습니다.'
    ];
    const prompt = promptLines.join('\\n');

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
            aiResponseText.innerHTML = '<span style=\"color:red;\">오류 발생: </span>' + data.error.message;
        } else if (data.candidates && data.candidates.length > 0) {
            const text = data.candidates[0].content.parts[0].text;
            aiResponseText.innerHTML = formatAiResponse(text);
        } else {
            aiResponseText.innerHTML = 'AI가 답변을 생성하지 못했습니다.';
        }
    } catch (err) {
        console.error('AI API Error:', err);
        aiResponseText.innerHTML = '<span style=\"color:red;\">서버와 통신 중 오류가 발생했습니다.</span>';
    } finally {
        btnAiAnalyze.disabled = false;
        btnAiAnalyze.textContent = '분석하기';
    }
});

if(aiQueryInput) aiQueryInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnAiAnalyze.click();
    }
});
