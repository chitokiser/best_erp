var e=async(e,t)=>{let n={contents:[{parts:[{text:`
    당신은 BEST WINNER GROUP의 최고 등급 AI 비즈니스 컨설턴트 및 수석 프로젝트 매니저입니다.
    제공된 데이터(프로젝트 진행 상황, 자재, 연락처 목록, 결재 대기 건 등)를 분석하여 다음과 같은 역할을 수행합니다:
    1. 오늘 당장 선행되어야 할 핵심 업무(To-Do)를 짚어줍니다.
    2. 결재 대기 중인 문서나 지연 중인 프로젝트의 리스크를 경고합니다.
    3. 전반적인 경영 상태(재무, 인사, 협력사 관계 등)를 요약 리포트합니다.
    CEO가 읽기 쉽게 명쾌하고 직관적으로 브리핑해주세요.
    \n\n[현재 데이터 상황]\n${JSON.stringify(e,null,2)}\n\n[사용자 요청]\n${t}`}]}],generationConfig:{temperature:.7,maxOutputTokens:1500}},r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(n)});if(!r.ok){let e=await r.text();throw console.error(`Gemini Error:`,e),Error(`AI 분석을 수행하는 중 오류가 발생했습니다.`)}return(await r.json()).candidates[0].content.parts[0].text},t=async e=>{let t=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:e}]}]})});if(!t.ok)throw Error(`AI 질의 중 오류 발생`);return(await t.json()).candidates[0].content.parts[0].text},n=async(e,t)=>{let n=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:`이 이미지는 명함(Business Card)입니다. 
다음 정보를 추출하여 정확한 JSON 형식으로만 응답하세요. 마크다운표시나 다른 설명은 일절 추가하지 마세요.
{
  "name": "홍길동",
  "company": "회사명",
  "position": "직급/직책",
  "phone": "전화번호 또는 휴대전화"
}`},{inline_data:{mime_type:t,data:e}}]}]})});if(!n.ok)throw Error(`명함 인식 AI 통신 오류`);let r=(await n.json()).candidates[0].content.parts[0].text.replace(/\`\`\`json/g,``).replace(/\`\`\`/g,``).trim();return JSON.parse(r)};export{t as analyzeBusinessQuery,e as callGeminiAI,n as scanBusinessCardAI};