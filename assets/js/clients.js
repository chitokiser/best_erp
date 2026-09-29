import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const modal = document.getElementById('clientModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const form = document.getElementById('clientForm');
const tbody = document.getElementById('clientTableBody');

openBtn.addEventListener('click', () => {
    document.getElementById('cliLastContact').valueAsDate = new Date();
    modal.style.display = 'flex';
});
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

async function loadClientData() {
    try {
        const snap = await getDocs(collection(db, 'clients'));
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">등록된 고객 데이터가 없습니다.</td></tr>';
            return;
        }

        let html = '';
        let stats = { total: 0, vip: 0, new: 0, risk: 0 };

        // MVP: Fetch and render all records
        snap.forEach(doc => {
            const data = doc.data();
            stats.total++;

            const grade = data.grade || 'NORMAL';
            if (grade === 'VIP') stats.vip++;
            else if (grade === 'NEW') stats.new++;
            else if (grade === 'RISK') stats.risk++;

            let badgeHtml = '';
            if (grade === 'VIP') badgeHtml = '<span class="type-badge badge-vip">🌟 VIP</span>';
            else if (grade === 'NEW') badgeHtml = '<span class="type-badge badge-new">✨ 신규</span>';
            else if (grade === 'RISK') badgeHtml = '<span class="type-badge badge-risk">⚠️ 이탈위험</span>';
            else badgeHtml = '<span class="type-badge badge-normal">일반</span>';

            html += `
                <tr>
                    <td>
                        <strong style="color:var(--text-dark); font-size:1.05rem;">${data.name || '-'}</strong>
                    </td>
                    <td>${badgeHtml}</td>
                    <td>
                        <div style="font-weight:600;">${data.contactName || '-'}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${data.phone || '-'}</div>
                    </td>
                    <td style="font-weight:600; color:var(--text-dark);">${data.lastContact || '-'}</td>
                    <td style="color:var(--text-muted); line-height:1.4;">${data.memo || '-'}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('statTotal').textContent = stats.total + ' 개사';
        document.getElementById('statVip').textContent = stats.vip + ' 개사';
        document.getElementById('statNew').textContent = stats.new + ' 개사';
        document.getElementById('statRisk').textContent = stats.risk + ' 개사';

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">오류가 발생했습니다. (권한 또는 네트워크 문제)</td></tr>';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    btn.textContent = '저장 중...';
    btn.disabled = true;

    try {
        await addDoc(collection(db, 'clients'), {
            name: document.getElementById('cliName').value,
            grade: document.getElementById('cliGrade').value,
            contactName: document.getElementById('cliContactName').value,
            phone: document.getElementById('cliPhone').value,
            lastContact: document.getElementById('cliLastContact').value,
            memo: document.getElementById('cliMemo').value,
            createdAt: serverTimestamp()
        });

        modal.style.display = 'none';
        form.reset();
        await loadClientData();
    } catch (err) {
        console.error(err);
        alert('저장 실패: ' + err.message);
    } finally {
        btn.textContent = '고객 정보 저장하기';
        btn.disabled = false;
    }
});

loadClientData();
