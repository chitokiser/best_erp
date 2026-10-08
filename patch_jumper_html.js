const fs = require('fs');
const htmlPath = 'C:/Users/Asus/Desktop/project/jumper/jumper_v10/mypage.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const aiBanner = `
      <!-- AI ERP Banner (Merchant Only) -->
      <section class="panel" id="aiErpBannerOption" style="display:none; background: linear-gradient(135deg, #4f46e5, #0f172a); color: white; padding: 1.5rem; text-align: center; border: 1px solid #6366f1; border-radius: 12px; margin-bottom: 20px;">
        <h3 style="margin:0 0 0.5rem 0; font-size:1.4rem; color: #818cf8; font-weight:800;">BESTCLUB AX (AI 경영관리)</h3>
        <p style="font-size: 0.95rem; margin-bottom: 1.5rem; color:#cbd5e1;">가맹점 전용으로 격리된 독립 인프라에서 수입/지출, 업무지시 및 AI 비즈니스 분석(경영참모) 기능을 이용해 보세요.</p>
        <a href="https://besterp.netlify.app/" target="_blank" class="btn btn--primary" style="background:#fff; color:#4f46e5; border:none; padding: 0.8rem 1.5rem; font-weight:700; text-decoration:none; border-radius: 8px;">AI 경영관리 프로그램 시작하기 ➔</a>
      </section>
`;

if (!html.includes('id="aiErpBannerOption"')) {
    html = html.replace('<!-- VND 충전 -->', aiBanner + '\n      <!-- VND 충전 -->');
    fs.writeFileSync(htmlPath, html, 'utf8');
}
