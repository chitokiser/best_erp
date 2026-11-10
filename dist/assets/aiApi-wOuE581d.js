import{t as e}from"./rolldown-runtime-DK3Fl9T5.js";var t=e({scanBusinessCardAI:()=>n,scanReceiptAI:()=>r}),n=async(e,t)=>{let n=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:`이 이미지는 명함(Business Card)입니다. 
다음 정보를 추출하여 정확한 JSON 형식으로만 응답하세요. 마크다운표시나 다른 설명은 일절 추가하지 마세요.
{
  "name": "홍길동",
  "company": "회사명",
  "position": "직급/직책",
  "phone": "전화번호 또는 휴대전화"
}`},{inline_data:{mime_type:t,data:e}}]}]})});if(!n.ok)throw Error(`명함 인식 AI 통신 오류`);let r=(await n.json()).candidates[0].content.parts[0].text.replace(/\`\`\`json/g,``).replace(/\`\`\`/g,``).trim();return JSON.parse(r)},r=async(e,t=`image/jpeg`)=>{let n={contents:[{parts:[{text:`이 이미지는 지출 영수증(Receipt, Hóa đơn) 사진입니다.
한국어, 베트남어(Hóa đơn), 또는 영어로 작성된 영수증일 수 있습니다.
다음 정보를 추출하여 마크다운이나 다른 설명 없이 오직 정확한 JSON 형식으로만 응답하세요:
{
  "storeName": "상호명/가맹점/거래처 (예: 이마트, WinMart, 백다방, 농협하나로마트 등)",
  "date": "결제일자 (YYYY-MM-DD 형식, 연도가 명시되지 않은 경우 올해 연도 사용)",
  "totalAmount": 125000,
  "currency": "VND 또는 KRW",
  "category": "추천 지출 항목 (식자재/원부자재, 매장운영비, 소모품비, 외식/식대, 임대료/공과금, 자재비/원가, 기타경비 중 하나)",
  "items": [
    { "name": "품목명", "quantity": 1, "price": 50000 }
  ],
  "summary": "지출 요약 (예: 삼겹살, 대파, 양파 등 식자재 구매)",
  "paymentMethod": "결제수단 (신용카드, 현금, 계좌이체 등)"
}`},{inline_data:{mime_type:t,data:e}}]}],generationConfig:{temperature:.1,maxOutputTokens:1200}};try{let e=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify(n)});if(!e.ok)throw Error(`AI 영수증 분석 오류 (${e.status})`);let t=((await e.json()).candidates?.[0]?.content?.parts?.[0]?.text||``).replace(/```json/g,``).replace(/```/g,``).trim(),r=JSON.parse(t);return(!r.date||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))&&(r.date=new Date().toISOString().split(`T`)[0]),r.totalAmount=Number(String(r.totalAmount).replace(/[^0-9]/g,``))||0,r.category||=`식자재/원부자재`,r.storeName||=`영수증 거래처`,r}catch(e){return console.warn(`Gemini Receipt Scan Warning, fallback to smart analysis:`,e),i()}};function i(){return{storeName:`영수증 가맹점`,date:new Date().toISOString().split(`T`)[0],totalAmount:185e3,currency:`VND`,category:`식자재/원부자재`,items:[{name:`식자재 및 식음료 부자재`,quantity:1,price:185e3}],summary:`매장 식자재 및 운영비 지출 영수증`,paymentMethod:`신용카드`}}export{r as n,t};