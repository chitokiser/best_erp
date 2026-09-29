export const callGeminiAI = async (contextData, customPrompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCR_02faI9P-EoYWT9OW3GxaxWxyLu-hYg";
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCR_02faI9P-EoYWT9OW3GxaxWxyLu-hYg";
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
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
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCR_02faI9P-EoYWT9OW3GxaxWxyLu-hYg";
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
        }]
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
