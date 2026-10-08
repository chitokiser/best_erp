const fs = require('fs');
const path = require('path');

const empHtmlPath = path.join(__dirname, 'admin', 'employees.html');
let html = fs.readFileSync(empHtmlPath, 'utf8');

const insertHtml = `
                <div class="form-row">
                    <div class="form-group" style="grid-column: span 2;">
                        <label>시스템 회원 찾기 (STAFF 계정 연동)</label>
                        <select id="empUserSelect" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; margin-bottom:1rem;">
                            <option value="">-- 연동할 계정을 선택하세요 --</option>
                        </select>
                    </div>
                </div>`;

if (!html.includes('empUserSelect')) {
    html = html.replace(
        /<form id="empForm">[\s\S]*?<div class="form-row">/,
        `<form id="empForm">${insertHtml}\n                <div class="form-row">`
    );
    fs.writeFileSync(empHtmlPath, html, 'utf8');
    console.log("HTML properly updated!");
} else {
    console.log("Already has empUserSelect");
}
