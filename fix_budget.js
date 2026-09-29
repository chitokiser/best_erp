const fs = require('fs');

// 1. Update project-detail.html 
let pDetail = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');

const targetButtons = `<h3 style="margin: 0;">업무 현황 (공정 관리)</h3>
                <button class="btn-primary" style="padding: 0.5rem 1rem;" onclick="window.addKanbanTask()">+ 새 태스크 추가</button>`;
const newButtons = `<h3 style="margin: 0;">업무 현황 (공정 관리)</h3>
                <div>
                    <button class="btn-primary" style="background:#f59e0b; padding: 0.5rem 1rem; margin-right:0.5rem;" onclick="window.requestBudget()">💰 지출/예산 청구</button>
                    <button class="btn-primary" style="padding: 0.5rem 1rem;" onclick="window.addKanbanTask()">+ 새 태스크 추가</button>
                </div>`;
pDetail = pDetail.replace(targetButtons, newButtons);

const logicInsertRegex = /window\.addKanbanTask = async \(\) => \{/m;
const budgetLogic = `window.requestBudget = async () => {
            const amt = prompt("청구할 예상 지출/예산 금액(VND)을 입력하세요:\\n(예: 5000000)");
            if (!amt) return;
            const category = prompt("해당 지출 항목(분류)은 무엇입니까?\\n(예: 자재비, 인건비, 외주용역비, 장비대여료, 기타경비)");
            if (!category) return;
            const memo = prompt("지출의 상세 내역 또는 사유(적요)를 기재해 주세요:");
            
            try {
                await addDoc(collection(db, 'financeRecords'), {
                    type: 'PAYABLE', // 지출 예정 (줄 돈)
                    category: category,
                    amount: Number(amt),
                    date: new Date().toISOString().split('T')[0],
                    partner: '',
                    project: window.currentProjectData ? window.currentProjectData.title : '무제 프로젝트',
                    memo: (memo || '') + ' [PM 청구 승인대기]',
                    createdAt: serverTimestamp()
                });
                alert("재무 DB에 성공적으로 청구 내역이 접수되었습니다.");
            } catch(e) {
                alert("청구 오류: " + e.message);
            }
        };

        window.addKanbanTask = async () => {`;
pDetail = pDetail.replace(logicInsertRegex, budgetLogic);
fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', pDetail, 'utf8');


// 2. Update finance.html 
let fHtml = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/finance.html', 'utf8');

const thReplaceLoc = `<th>유형</th>\n                        <th>금액</th>`;
const thReplaceTo = `<th>유형/항목</th>\n                        <th>금액</th>`;
fHtml = fHtml.replace(thReplaceLoc, thReplaceTo);

const formLoc = `<div class="form-group">
                        <label>돈의 성격 (유형)</label>
                        <select id="finType" required>
                            <option value="INCOME">🔵 수입 (입금 됨)</option>
                            <option value="EXPENSE">🔴 지출 (출금 됨)</option>
                            <option value="RECEIVABLE">🟢 받을 돈 (미수금/예정)</option>
                            <option value="PAYABLE">🟠 줄 돈 (미지급금/예정)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>발생/예정 일자</label>`;
const formNew = `<div class="form-group">
                        <label>돈의 성격 (유형)</label>
                        <select id="finType" required>
                            <option value="INCOME">🔵 수입 (입금 완료)</option>
                            <option value="EXPENSE">🔴 지출 (출금 완료)</option>
                            <option value="RECEIVABLE">🟢 받을 돈 (수입 예정/미수금)</option>
                            <option value="PAYABLE">🟠 줄 돈 (지출 예정/미지급금)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>발생/예정 일자</label>`;
fHtml = fHtml.replace(formLoc, formNew);

const catFormLoc = `<div class="form-group">
                    <label>금액 (VND)</label>`;
const catFormNew = `<div class="form-row">
                        <div class="form-group">
                            <label>항목 분류</label>
                            <input type="text" id="finCategory" placeholder="예: 인건비, 임대료, 외상대금, 자재비" required list="catList">
                            <datalist id="catList">
                                <option value="자재비/원가"></option>
                                <option value="인건비/급여"></option>
                                <option value="임대료/공과금"></option>
                                <option value="외주/용역비"></option>
                                <option value="장비대여료"></option>
                                <option value="영업/운영경비"></option>
                                <option value="외상대금상환"></option>
                            </datalist>
                        </div>
                    <div class="form-group">
                    <label>금액 (VND)</label>`;
fHtml = fHtml.replace(catFormLoc, catFormNew);
fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/finance.html', fHtml, 'utf8');


// 3. Update finance.js
let fJs = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/finance.js', 'utf8');

const fJsBadgeLoc = `badgeHtml = '<span class="type-badge badge-payable">줄 돈</span>';`;
const fJsBadgeNew = `badgeHtml = '<span class="type-badge badge-payable">지출예정(줄돈)</span>';`;
fJs = fJs.replace(fJsBadgeLoc, fJsBadgeNew);

const fJsTableLoc = `<td>\${badgeHtml}</td>`;
const fJsTableNew = `<td>
                        \${badgeHtml}
                        <div style="font-size:0.85rem; color:var(--text-dark); margin-top:0.25rem;">\${data.category || '기타/미분류'}</div>
                     </td>`;
fJs = fJs.replace(fJsTableLoc, fJsTableNew);

const fJsPayloadLoc = `type: document.getElementById('finType').value,`;
const fJsPayloadNew = `type: document.getElementById('finType').value,
            category: document.getElementById('finCategory').value,`;
fJs = fJs.replace(fJsPayloadLoc, fJsPayloadNew);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/finance.js', fJs, 'utf8');

console.log("Success");
