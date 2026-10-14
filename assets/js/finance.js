import { db, auth } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';

const modal = document.getElementById('financeModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('btnCancelModal');
const form = document.getElementById('financeForm');
const tbody = document.getElementById('financeTableBody');
const finTypeSelect = document.getElementById('finType');
const typeCards = document.querySelectorAll('#typeSelectorGrid .type-card');
const amountInput = document.getElementById('finAmount');
const amountPreviewBadge = document.getElementById('amountPreviewBadge');
const amountPreviewText = document.getElementById('amountPreviewText');
const btnResetAmount = document.getElementById('btnResetAmount');

function formatCurrency(val) {
    return new Intl.NumberFormat('ko-KR').format(val);
}

// Convert number to Korean readable expression (e.g., 50,000,000 -> 5천만 동)
function formatKoreanNumber(val) {
    if (!val || isNaN(val) || val <= 0) return '';
    const num = Number(val);
    const uk = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    const remainder = num % 10000;

    let parts = [];
    if (uk > 0) parts.push(`${formatCurrency(uk)}억`);
    if (man > 0) parts.push(`${formatCurrency(man)}만`);
    if (remainder > 0 && parts.length === 0) parts.push(`${formatCurrency(remainder)}`);

    return parts.join(' ') + ' 동';
}

function updateAmountPreview(val) {
    const num = Number(val) || 0;
    if (num > 0) {
        const kor = formatKoreanNumber(num);
        if (amountPreviewText) {
            amountPreviewText.textContent = `${formatCurrency(num)} VND` + (kor ? ` (${kor})` : '');
        }
        if (amountPreviewBadge) {
            amountPreviewBadge.style.display = 'inline-flex';
        }
    } else {
        if (amountPreviewBadge) {
            amountPreviewBadge.style.display = 'none';
        }
    }
}

function openModal() {
    const dateInput = document.getElementById('finDate');
    if (dateInput) dateInput.valueAsDate = new Date();
    modal.style.display = 'flex';
    setType('INCOME');
    updateAmountPreview(amountInput ? amountInput.value : 0);
    setTimeout(() => {
        if (amountInput) amountInput.focus();
    }, 100);
}

function closeModal() {
    modal.style.display = 'none';
}

function setType(type) {
    if (finTypeSelect) finTypeSelect.value = type;
    typeCards.forEach(card => {
        if (card.dataset.type === type) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    const btn = document.getElementById('btnSubmit');
    if (btn) {
        const labels = {
            INCOME: '수입 내역 저장',
            EXPENSE: '지출 내역 저장',
            RECEIVABLE: '미수금(받을돈) 등록',
            PAYABLE: '미지급금(줄돈) 등록'
        };
        const span = btn.querySelector('span');
        if (span) span.textContent = labels[type] || '저장하기';
    }
}

// Event Listeners for Modal
if (openBtn) openBtn.addEventListener('click', openModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        closeModal();
    }
});

// Type Card Click Events
typeCards.forEach(card => {
    card.addEventListener('click', () => {
        setType(card.dataset.type);
    });
});

// Amount Input Events
if (amountInput) {
    amountInput.addEventListener('input', (e) => {
        updateAmountPreview(e.target.value);
    });
}

// Quick Amount Chips
document.querySelectorAll('.btn-chip[data-add]').forEach(chip => {
    chip.addEventListener('click', () => {
        const addVal = Number(chip.dataset.add) || 0;
        const currentVal = Number(amountInput.value) || 0;
        const nextVal = currentVal + addVal;
        amountInput.value = nextVal;
        updateAmountPreview(nextVal);
    });
});

if (btnResetAmount) {
    btnResetAmount.addEventListener('click', () => {
        amountInput.value = '';
        updateAmountPreview(0);
        amountInput.focus();
    });
}

async function loadFinanceData() {
    try {
        const snap = await getDocs(collection(db, 'financeRecords'));
        // DYNAMIC VIRTUAL PAYROLL INJECTION!
        let virtualPayrolls = [];
        try {
            const empSnap = await getDocs(collection(db, 'employees'));
            const now = new Date();
            const curYYYYMM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const payDate = curYYYYMM + '-25'; // Assume payday is 25th
            
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
                        project: edata.department || '가맹점/본사 공통',
                        memo: `[시스템 자동생성] ${now.getMonth()+1}월 정기 급여 지급예정`
                    });
                }
            });
        } catch (empErr) {
            console.warn("Employees payroll fetch warning:", empErr);
        }

        if (snap.empty && virtualPayrolls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">등록된 재무 데이터가 없습니다.</td></tr>';
            document.getElementById('sumIncome').textContent = '0 VND';
            document.getElementById('sumExpense').textContent = '0 VND';
            document.getElementById('sumReceivable').textContent = '0 VND';
            document.getElementById('sumPayable').textContent = '0 VND';
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
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">오류가 발생했습니다. (' + (err.message || '권한 문제일 수 있습니다') + ')</td></tr>';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const span = btn.querySelector('span');
    const prevText = span ? span.textContent : '저장하기';
    if (span) span.textContent = '저장 중...';
    btn.disabled = true;

    try {
        const tId = window.tenantId || 'system_master';
        const sName = window.currentStoreName || '';
        await addDoc(collection(db, 'financeRecords'), {
            type: document.getElementById('finType').value,
            category: document.getElementById('finCategory').value,
            date: document.getElementById('finDate').value,
            amount: Number(document.getElementById('finAmount').value),
            partner: document.getElementById('finPartner').value,
            project: document.getElementById('finProject').value,
            memo: document.getElementById('finMemo').value,
            tenantId: tId,
            storeName: sName,
            createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'user',
            createdAt: serverTimestamp()
        });

        modal.style.display = 'none';
        form.reset();
        updateAmountPreview(0);
        await loadFinanceData();
    } catch (err) {
        console.error(err);
        alert('저장 실패: ' + err.message);
    } finally {
        if (span) span.textContent = prevText;
        btn.disabled = false;
    }
});

// Auth state observer for safe execution
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadFinanceData();
    }
});

if (auth.currentUser) {
    loadFinanceData();
}

window.loadFinanceData = loadFinanceData;
