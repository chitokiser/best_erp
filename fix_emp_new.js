const fs = require('fs');

// employees.html target
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', 'utf8');

const tHeadOld = '<th>보유 기술(역량)</th>\n                        <th>현재 업무량</th>';
const tHeadNew = '<th>보유 기술(역량)</th>\n                        <th>급여/평가</th>\n                        <th>현재 업무량</th>';
html = html.replace(tHeadOld, tHeadNew);

const oldFormRow = `<div class="form-group">
                    <label>이메일 / 연락처</label>`;
const newFormRow = `
                <div class="form-row">
                    <div class="form-group">
                        <label>급여 (연봉/월급)</label>
                        <input type="text" id="empSalary" placeholder="예: 5,000만원 또는 월 400만원">
                    </div>
                    <div class="form-group">
                        <label>최근 인사평가</label>
                        <select id="empPerformance">
                            <option value="">평가 전</option>
                            <option value="S (최우수)">S (최우수)</option>
                            <option value="A (우수)">A (우수)</option>
                            <option value="B (보통)">B (보통)</option>
                            <option value="C (미흡)">C (미흡)</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>이메일 / 연락처</label>`;

if (html.includes(oldFormRow)) {
    html = html.replace(oldFormRow, newFormRow);
    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', html, 'utf8');
}

// employees.js target
let jsFile = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', 'utf8');

// The replacement logic:
const loadRowTarget = `<td class="\${loadClass}">\${loadText}</td>
                    <td>`;
const loadRowReplace = `<td>
                        <div style="font-weight:600; color:var(--ai-primary);">\${data.salary || '-'}</div>
                        <div style="font-size:0.85rem; color:var(--warning);">\${data.performance || '평가 전'}</div>
                    </td>
                    <td class="\${loadClass}">\${loadText}</td>
                    <td>`;

jsFile = jsFile.replace(loadRowTarget, loadRowReplace);

const setValuesTarget = `document.getElementById('empDept').value = data.department || '';`;
const setValuesReplace = `document.getElementById('empDept').value = data.department || '';
    document.getElementById('empSalary').value = data.salary || '';
    document.getElementById('empPerformance').value = data.performance || '';`;
jsFile = jsFile.replace(setValuesTarget, setValuesReplace);

const payloadTarget = `contact: document.getElementById('empContact').value,`;
const payloadReplace = `contact: document.getElementById('empContact').value,
            salary: document.getElementById('empSalary').value,
            performance: document.getElementById('empPerformance').value,`;
jsFile = jsFile.replace(payloadTarget, payloadReplace);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', jsFile, 'utf8');
