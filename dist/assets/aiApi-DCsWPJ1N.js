var e=async(e,t)=>{let n=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyCR_02faI9P-EoYWT9OW3GxaxWxyLu-hYg`,{method:`POST`,headers:{"Content-Type":`application/json`},body:JSON.stringify({contents:[{parts:[{text:`이 이미지는 명함(Business Card)입니다. 
다음 정보를 추출하여 정확한 JSON 형식으로만 응답하세요. 마크다운표시나 다른 설명은 일절 추가하지 마세요.
{
  "name": "홍길동",
  "company": "회사명",
  "position": "직급/직책",
  "phone": "전화번호 또는 휴대전화"
}`},{inline_data:{mime_type:t,data:e}}]}]})});if(!n.ok)throw Error(`명함 인식 AI 통신 오류`);let r=(await n.json()).candidates[0].content.parts[0].text.replace(/\`\`\`json/g,``).replace(/\`\`\`/g,``).trim();return JSON.parse(r)};export{e as scanBusinessCardAI};