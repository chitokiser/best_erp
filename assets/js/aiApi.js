export const getGeminiApiKey = () => {
    return (
        import.meta.env?.VITE_GEMINI_API_KEY ||
        window.__GEMINI_API_KEY__ ||
        localStorage.getItem('VITE_GEMINI_API_KEY') ||
        "AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw"
    );
};

export const callGeminiAI = async (contextData, customPrompt) => {
    const apiKey = getGeminiApiKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `
    당신은 BEST WINNER GROUP의 최고 등급 AI 비즈니스 컨설턴트 및 수석 프로젝트 매니저입니다.
    제공된 데이터(프로젝트 진행 상황, 자재, 연락처 목록, 결재 대기 건 등)를 분석하여 다음과 같은 역할을 수행합니다:
    1. 오늘 당장 선행되어야 할 핵심 업무(To-Do)를 짚어줍니다.
    2. 결재 대기 중인 문서나 지연 중인 프로젝트의 리스크를 경고합니다.
    3. 전반적인 경영 상태(재무, 인사, 협력사 관계 등)를 요약 리포트합니다.
    CEO가 읽기 쉽게 명쾌하고 직관적으로 브리핑해주세요.
    `;

    const fullPrompt = `${systemPrompt}\n\n[현재 데이터 상황]\n${JSON.stringify(contextData, null, 2)}\n\n[사용자 요청]\n${customPrompt}`;

    const payload = {
        contents: [{
            parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const err = await response.text();
        console.error("Gemini Error:", err);
        throw new Error("AI 분석을 수행하는 중 오류가 발생했습니다.");
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
};

export const analyzeBusinessQuery = async (query) => {
    const apiKey = getGeminiApiKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const payload = {
        contents: [{
            parts: [{ text: query }]
        }]
    };
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        throw new Error("AI 질의 중 오류 발생");
    }
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
};

export const scanBusinessCardAI = async (base64Image, mimeType) => {
    const apiKey = getGeminiApiKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `이 이미지는 명함(Business Card)입니다. 
다음 정보를 추출하여 정확한 JSON 형식으로만 응답하세요. 마크다운표시나 다른 설명은 일절 추가하지 마세요.
{
  "name": "홍길동",
  "company": "회사명",
  "position": "직급/직책",
  "phone": "전화번호 또는 휴대전화"
}`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Image
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            thinkingConfig: {
                thinkingBudget: 0
            }
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("명함 인식 AI 통신 오류");
    }

    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;

    const cleanText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    return JSON.parse(cleanText);
};

export const scanReceiptAI = async (base64Image, mimeType = 'image/jpeg') => {
    const apiKey = getGeminiApiKey();

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `이 이미지는 지출 영수증(Receipt, Hóa đơn) 사진입니다.
한국어, 베트남어(Hóa đơn), 영어 등으로 작성된 영수증일 수 있습니다.
영수증의 모든 텍스트를 정확하게 판독하여 오직 유효한 JSON 형식으로만 응답하세요:
{
  "storeName": "영수증 상단 상호명/가맹점/거래처 (예: AEON - HÀ ĐÔNG, WinMart, 백다방, 농협 등)",
  "date": "결제일자 (YYYY-MM-DD 형식. 베트남 및 영미권 영수증의 일/월/연도 DD/MM/YYYY 또는 MM/DD/YYYY 표기를 식별하여 연-월-일 YYYY-MM-DD 형식으로 변환)",
  "totalAmount": 1070200,
  "currency": "VND 또는 KRW",
  "category": "추천 지출 항목 (식자재/원부자재, 매장운영비, 소모품비, 외식/식대, 임대료/공과금, 자재비/원가, 기타경비 중 하나)",
  "items": [
    { "name": "품목명", "quantity": 1, "price": 50000 }
  ],
  "summary": "지출 요약 (예: 식음료 및 식자재 구매)",
  "paymentMethod": "결제수단 (신용카드, 체크카드/DEBIT, 현금, 계좌이체 등)"
}
주의사항:
- totalAmount는 할인/세금 등이 반영된 최종 실제 결제 총액(Total Payment, TỔNG THANH TOÁN)을 숫자로만 정확히 기재하세요.`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inline_data: {
                        mime_type: mimeType,
                        data: base64Image
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 3500,
            responseMimeType: "application/json",
            thinkingConfig: {
                thinkingBudget: 0
            }
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("AI 영수증 분석 오류 응답:", errorText);
        throw new Error(`AI 영수증 분석 오류 (${response.status})`);
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Robustly extract JSON object block from response
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        console.error("Gemini raw text output without JSON:", rawText);
        throw new Error("영수증 분석 응답에서 유효한 JSON을 찾을 수 없습니다.");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Ensure safe numbers and dates
    if (!parsed.date || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.date)) {
        parsed.date = new Date().toISOString().split('T')[0];
    }
    parsed.totalAmount = Number(String(parsed.totalAmount).replace(/[^0-9]/g, '')) || 0;
    if (!parsed.category) parsed.category = '식자재/원부자재';
    if (!parsed.storeName) parsed.storeName = '영수증 거래처';

    return parsed;
};

/**
 * 한↔베 실시간 자동 번역 (메뉴명 · 직원 업무지시 · Zalo 고객 안내문)
 */
export const translateMenuAndNoticeAI = async (text, direction = 'ko_to_vi') => {
    const apiKey = getGeminiApiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const dirInstruction = direction === 'vi_to_ko'
        ? '다음 베트남어 매장 문구(메뉴/업무보고/고객문의)를 자연스러운 한국어로 번역하세요. 번역문만 깔끔하게 출력하세요.'
        : '다음 한국어 매장 문구(메뉴/업무지시/Zalo 고객안내)를 베트남 현지인이 자연스럽게 이해하는 베트남어로 번역하세요. 번역문만 깔끔하게 출력하세요.';

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: `${dirInstruction}\n\n[원문]\n${text}` }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
        })
    });
    if (!response.ok) throw new Error(`AI 번역 API 오류 (${response.status})`);
    const data = await response.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
};

/**
 * VOC(고객의 소리) AI 감성·키워드 요약 & 즉시 실행 액션 리포트
 */
export const analyzeVocBatchAI = async (vocItems = []) => {
    const apiKey = getGeminiApiKey();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const sample = vocItems.slice(0, 30).map((v) => `[${v.sentiment}/${v.channel}] ${v.text}`).join('\n');
    const prompt = `당신은 베트남 한인 매장 전문 CRM 컨설턴트입니다. 아래 고객 VOC 목록을 분석해:
1) 핵심 칭찬 포인트 1줄
2) 시급한 개선 포인트 1~2줄
3) 점주가 오늘 바로 실행할 4R 리텐션 액션(Zalo/쿠폰/직원교육) 1줄
을 간결한 한국어 불릿으로 정리해 주세요.\n\n[VOC 목록]\n${sample}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 600 }
        })
    });
    if (!response.ok) throw new Error(`AI VOC 분석 오류 (${response.status})`);
    const data = await response.json();
    return (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
};

/**
 * Telegram Bot API 직접 메시지 발송 (마감 리포트 · 결재/재고 알림)
 */
export const sendTelegramMessage = async (botToken, chatId, text) => {
    const cleanToken = String(botToken || '').trim();
    const cleanChat = String(chatId || '').trim();
    if (!cleanToken || !cleanChat) throw new Error('Telegram Bot Token과 Chat ID를 모두 입력해 주세요.');
    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(cleanToken)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: cleanChat, text, parse_mode: 'HTML' })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
        throw new Error(json.description || `Telegram 전송 실패 (${res.status})`);
    }
    return json;
};


