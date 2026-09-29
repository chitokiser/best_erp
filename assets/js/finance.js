import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

const modal = document.getElementById('financeModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const form = document.getElementById('financeForm');
const tbody = document.getElementById('financeTableBody');

openBtn.addEventListener('click', () => {
    document.getElementById('finDate').valueAsDate = new Date();
    modal.style.display = 'flex';
});
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

function formatCurrency(val) {
    return new Intl.NumberFormat('ko-KR').format(val);
}

async function loadFinanceData() {
    try {
        const snap = await getDocs(collection(db, 'financeRecords'));
        // DYNAMIC VIRTUAL PAYROLL INJECTION!
        const empSnap = await getDocs(collection(db, 'employees'));
        const now = new Date();
        const curYYYYMM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const payDate = curYYYYMM + '-25'; // Assume payday is 25th
        
        let virtualPayrolls = [];
        empSnap.forEach(e => {
            const edata = e.data();
            if (edata.salary && Number(edata.salary) > 0) {
                virtualPayrolls.push({
                    id: 'virtual_payroll_' + e.id,
                    type: 'PAYABLE',
                    category: '인건비/급여',
                    amount: Number(edata.salary),
                    date: payDate,
                    partner: (edata.name || '직원') + ' (' + (edata.position||'') + ')',
                    project: '본사 공통',
                    memo: `[시스템 자동생성] ${now.getMonth()+1}월 정기 급여 지급예정`
                });
            }
        });
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">등록된 재무 데이터가 없습니다.</td></tr>';
            return;
        }

        let html = '';
        let sums = { INCOME: 0, EXPENSE: 0, RECEIVABLE: 0, PAYABLE: 0 };

        let records = [];
        snap.forEach(doc => { records.push({ id: doc.id, ...doc.data() }); });
        // merge virtual records
        records = records.concat(virtualPayrolls);

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        records.forEach(data => {
            const type = data.type || 'INCOME';
            const amount = Number(data.amount) || 0;

            sums[type] += amount;

            let badgeHtml = '';
            if (type === 'INCOME') badgeHtml = '<span class="type-badge badge-income">수입</span>';
            else if (type === 'EXPENSE') badgeHtml = '<span class="type-badge badge-expense">지출</span>';
            else if (type === 'RECEIVABLE') badgeHtml = '<span class="type-badge badge-receivable">받을 돈</span>';
            else if (type === 'PAYABLE') badgeHtml = '<span class="type-badge badge-payable">지출예정(줄돈)</span>';

            const partner = data.partner || '-';
            const project = data.project || '-';

            html += `
                <tr>
                    <td style="font-weight:600;">${data.date}</td>
                    <td>
                        ${badgeHtml}
                        <div style="font-size:0.85rem; color:var(--text-dark); margin-top:0.25rem;">${data.category || '기타/미분류'}</div>
                     </td>
                    <td style="font-weight:800; font-size:1.1rem;">${formatCurrency(amount)} VND</td>
                    <td>
                        <div style="color:var(--text-dark);">${partner}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${project}</div>
                    </td>
                    <td style="color:var(--text-muted);">${data.memo || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('sumIncome').textContent = formatCurrency(sums.INCOME) + ' VND';
        document.getElementById('sumExpense').textContent = formatCurrency(sums.EXPENSE) + ' VND';
        document.getElementById('sumReceivable').textContent = formatCurrency(sums.RECEIVABLE) + ' VND';
        document.getElementById('sumPayable').textContent = formatCurrency(sums.PAYABLE) + ' VND';

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">오류가 발생했습니다. (권한 문제일 수 있습니다)</td></tr>';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    btn.textContent = '저장 중...';
    btn.disabled = true;

    try {
        await addDoc(collection(db, 'financeRecords'), {
            type: document.getElementById('finType').value,
            category: document.getElementById('finCategory').value,
            date: document.getElementById('finDate').value,
            amount: Number(document.getElementById('finAmount').value),
            partner: document.getElementById('finPartner').value,
            project: document.getElementById('finProject').value,
            memo: document.getElementById('finMemo').value,
            createdAt: serverTimestamp()
        });

        modal.style.display = 'none';
        form.reset();
        await loadFinanceData();
    } catch (err) {
        console.error(err);
        alert('저장 실패: ' + err.message);
    } finally {
        btn.textContent = '저장하기';
        btn.disabled = false;
    }
});

loadFinanceData();
