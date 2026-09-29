export const callGeminiAI = async (contextData, customPrompt) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const systemPrompt = `
    당신은 BEST WINNER GROUP의 최고 등급 AI 비즈니스 컨설턴트 및 수석 프로젝트 매니저입니다.
    제공된 데이터(프로젝트 진행 상황, 자재, 할 일 목록, 결재 대기 등)를 분석하여 다음과 같은 역할을 수행합니다.
    1. 오늘 당장 우선적으로 처리해야 할 핵심 업무(To-Do)를 집어줍니다.
    2. 데이터 바탕으로 현재 상황에 대한 냉철하고 전문적인 'AI 오피니언 및 인사이트'를 제시합니다.
    3. 리스크가 보이거나 병목이 예상되는 지점을 미리 경고하고 전략적 조언을 포함합니다.
    
    답변은 읽기 쉽고 전문적인 비즈니스 말투(경어체)를 사용하며, 마크다운(HTML 변환 고려) 형식으로 핵심만 간결히 줄바꿈하여 작성하세요.
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

export const scanBusinessCardAI = async (base64Image, mimeType) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("VITE_GEMINI_API_KEY ȯ�溯���� �������� �ʾҽ��ϴ�.");

    const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey";

    const prompt = "�� �̹����� ����(Business Card)�Դϴ�. �ؽ�Ʈ�� �����Ͽ� ���� JSON �������θ� ��ȯ�ϼ���.
{
  \"name\": \"�̸�\",
  \"company\": \"ȸ���\",
  \"position\": \"����/��å\",
  \"phone\": \"��ȭ��ȣ �Ǵ� �޴���ȭ��ȣ (���ڿ� �����¸�)\"
}
�ڵ����(\\\json)�̳� �ٸ� ���� ���� ���� ������ JSON ���ڿ��� ��ȯ�ϼ���.";

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
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error("���� �ǵ��� �����߽��ϴ�.");
    }
    const data = await response.json();
    const rawText = data.candidates[0].content.parts[0].text;
    
    let cleanText = rawText.replace(/`json/gi, '').replace(/`/g, '').trim();
    return JSON.parse(cleanText);
};
