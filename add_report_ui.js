const fs = require('fs');
let c = fs.readFileSync('admin/tasks.html', 'utf8');

const newReportHtml = `
          <!-- Employee Report Action -->
          <div id="employeeActionSection" style="display:none; background:#e0e7ff; padding:1.5rem; border-radius:8px; margin-bottom:2rem;">
              <h3 style="margin-top:0; color:#4338ca;">진행 상황 보고하기</h3>
              <textarea id="reportContent" rows="3" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:1rem; resize:vertical;" placeholder="금일 진행 내용, 이슈 사항, 결과 등을 입력하세요."></textarea>
              <div style="display:flex; gap:1rem; align-items:center;">
                  <label style="font-weight:600; color:#334155;">진행률 (%):</label>
                  <input type="number" id="reportProgress" min="0" max="100" style="width:80px; padding:0.4rem; border:1px solid #cbd5e1; border-radius:4px;">
                  <button id="btnSubmitReport" style="background:#4f46e5; color:white; padding:0.5rem 1rem; border:none; border-radius:4px; cursor:pointer; font-weight:600;">보고 제출</button>
              </div>
          </div>
          <!-- Progress Bar Visual -->`;

c = c.replace(/<!-- Progress Bar Visual -->/, newReportHtml);
fs.writeFileSync('admin/tasks.html', c, 'utf8');
console.log('Added report section to tasks.html');
