import{t as e}from"./rolldown-runtime-DK3Fl9T5.js";var t=e({getGeminiApiKey:()=>n,scanBusinessCardAI:()=>r,scanReceiptAI:()=>i}),n=()=>`AQ.Ab8RN6LmECGSvAk-Pu0P5b8lhg-W77-XWNsKHB9vDuEGex8pWw`,r=async(e,t)=>{let r=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${n()}`,i=await fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:`이 이미지는 명함(Business Card)입니다. 
다음 정보를 추출하여 정확한 JSON 형식으로만 응답하세요. 마크다운표시나 다른 설명은 일절 추가하지 마세요.
{
  "name": "홍길동",
  "company": "회사명",
  "position": "직급/직책",
  "phone": "전화번호 또는 휴대전화"
}`},{inline_data:{mime_type:t,data:e}}]}],generationConfig:{temperature:.1,maxOutputTokens:1024,responseMimeType:`application/json`,thinkingConfig:{thinkingBudget:0}}})});if(!i.ok)throw Error(`명함 인식 AI 통신 오류`);let a=(await i.json()).candidates[0].content.parts[0].text.replace(/\`\`\`json/g,``).replace(/\`\`\`/g,``).trim();return JSON.parse(a)},i=async(e,t=`image/jpeg`)=>{let r=`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${n()}`,i=await fetch(r,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:`이 이미지는 지출 영수증(Receipt, Hóa đơn) 사진입니다.
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
- totalAmount는 할인/세금 등이 반영된 최종 실제 결제 총액(Total Payment, TỔNG THANH TOÁN)을 숫자로만 정확히 기재하세요.`},{inline_data:{mime_type:t,data:e}}]}],generationConfig:{temperature:.1,maxOutputTokens:3500,responseMimeType:`application/json`,thinkingConfig:{thinkingBudget:0}}})});if(!i.ok){let e=await i.text();throw console.error(`AI 영수증 분석 오류 응답:`,e),Error(`AI 영수증 분석 오류 (${i.status})`)}let a=(await i.json()).candidates?.[0]?.content?.parts?.[0]?.text||``,o=a.match(/\{[\s\S]*\}/);if(!o)throw console.error(`Gemini raw text output without JSON:`,a),Error(`영수증 분석 응답에서 유효한 JSON을 찾을 수 없습니다.`);let s=JSON.parse(o[0]);return(!s.date||!/^\d{4}-\d{2}-\d{2}$/.test(s.date))&&(s.date=new Date().toISOString().split(`T`)[0]),s.totalAmount=Number(String(s.totalAmount).replace(/[^0-9]/g,``))||0,s.category||=`식자재/원부자재`,s.storeName||=`영수증 거래처`,s};export{i as n,t};