const fs = require('fs');
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');

// The old button:
const oldBtn = '<button class="btn-primary" style="background:#f59e0b; padding: 0.5rem 1rem; margin-right:0.5rem;" onclick="window.requestBudget()">💰 지출/예산 청구</button>';
const newBtn = '<button class="btn-primary" style="background:#f59e0b; padding: 0.5rem 1rem; margin-right:0.5rem;" onclick="window.openExpenseModal()">💰 지출결의서 작성</button>';
html = html.replace(oldBtn, newBtn);

// Add modal HTML before closing </body>
const expenseModal = `
    <!-- Expense Report Modal -->
    <dialog id="expenseModal" style="border:none; border-radius:1rem; padding:2rem; width:500px; max-width:90%; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
        <h3 style="margin-top:0; color:var(--text-dark);">💰 지출결의서 (예산 청구) 작성</h3>
        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">프로젝트에 필요한 예산 및 지출을 재무팀에 승인 요청합니다.</p>
        
        <div style="margin-bottom:1rem;">
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; font-size:0.9rem;">지출 항목 (분류)</label>
            <input type="text" id="expCategory" list="expCatList" placeholder="예: 자재비, 인건비, 외주용역비..." style="width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:0.5rem; box-sizing:border-box;">
            <datalist id="expCatList">
                <option value="자재비/원가"></option>
                <option value="인건비/급여"></option>
                <option value="운임/배송료"></option>
                <option value="외주/용역비"></option>
                <option value="영업/운영경비"></option>
                <option value="식대/진행비"></option>
            </datalist>
        </div>
        
        <div style="margin-bottom:1rem;">
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; font-size:0.9rem;">청구액 (VND)</label>
            <input type="number" id="expAmount" placeholder="예: 5000000" style="width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:0.5rem; box-sizing:border-box;">
        </div>

        <div style="margin-bottom:1.5rem;">
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; font-size:0.9rem;">지출 사유 (적요)</label>
            <textarea id="expMemo" rows="3" placeholder="예: A구역 전기공사 자재 선결제 대금" style="width:100%; padding:0.75rem; border:1px solid #cbd5e1; border-radius:0.5rem; box-sizing:border-box; font-family:inherit;"></textarea>
        </div>

        <div style="margin-bottom:1.5rem;">
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; font-size:0.9rem;">증빙 자료 (영수증/견적서 등)</label>
            <input type="file" id="expFile" style="width:100%;">
            <p style="font-size:0.8rem; color:#94a3b8; margin:0.25rem 0 0 0;">(선택) 지출 증빙용 파일(이미지/PDF)을 첨부하세요.</p>
        </div>

        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
            <button onclick="document.getElementById('expenseModal').close()" style="padding:0.75rem 1.5rem; border:1px solid #e2e8f0; background:white; border-radius:0.5rem; cursor:pointer;">취소</button>
            <button onclick="window.submitExpense()" class="btn-primary" style="padding:0.75rem 1.5rem; border:none; border-radius:0.5rem; cursor:pointer;">결재 상신하기</button>
        </div>
    </dialog>
`;
if (!html.includes('expenseModal')) {
    html = html.replace('</body>', expenseModal + '\n</body>');
}

// Replace the old requestBudget logic
const oldBudgetLogic = /window\.requestBudget = async \(\) => \{[\s\S]*?window\.addKanbanTask = async \(\) =>/m;
const newBudgetLogic = `
        window.openExpenseModal = () => {
            document.getElementById('expenseModal').showModal();
        };

        window.submitExpense = async () => {
            const category = document.getElementById('expCategory').value.trim();
            const amt = document.getElementById('expAmount').value;
            const memo = document.getElementById('expMemo').value.trim();
            const fileInput = document.getElementById('expFile');
            
            if (!category || !amt) {
                alert("지출 항목과 청구액을 모두 입력해주세요.");
                return;
            }

            try {
                let fileMemo = '';
                if (fileInput.files.length > 0) {
                    fileMemo = ' [증빙: ' + fileInput.files[0].name + ']';
                    // We simulate file upload mapping to the project metadata
                    await addDoc(collection(db, 'projects', projectId, 'files'), {
                        name: '지출증빙_' + fileInput.files[0].name,
                        uploader: window.currentUserEmail,
                        url: '#', 
                        createdAt: serverTimestamp()
                    });
                }

                await addDoc(collection(db, 'financeRecords'), {
                    type: 'PAYABLE', 
                    category: category,
                    amount: Number(amt),
                    date: new Date().toISOString().split('T')[0],
                    partner: '',
                    project: window.currentProjectData ? window.currentProjectData.title : '무제 프로젝트',
                    memo: memo + ' [프로젝트 PM 지출결의 상신]' + fileMemo,
                    createdAt: serverTimestamp()
                });

                document.getElementById('expenseModal').close();
                document.getElementById('expCategory').value = '';
                document.getElementById('expAmount').value = '';
                document.getElementById('expMemo').value = '';
                fileInput.value = '';

                alert("지출결의서가 성공적으로 재무팀에 상신(PAYABLE 등록)되었습니다.\\n(증빙 자료가 있다면 프로젝트 자료실 에도 자동 별도 보관됩니다)");
                if (document.getElementById('view-files').style.display === 'block') window.loadFiles();
            } catch(e) {
                alert("상신 오류: " + e.message);
            }
        };

        window.addKanbanTask = async () =>`;

html = html.replace(oldBudgetLogic, newBudgetLogic);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', html, 'utf8');
