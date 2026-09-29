import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const modal = document.getElementById('empModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const empForm = document.getElementById('empForm');
const tbody = document.getElementById('empTableBody');

// Overridden below
closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

window.empDataMap = {};
async function loadEmployees() {
    try {
        const snap = await getDocs(collection(db, 'employees'));
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--text-muted);">등록된 직원 데이터가 없습니다.</td></tr>';
            return;
        }

        let html = ""; window.empDataMap = {};
        snap.forEach(doc => {
            const data = doc.data();
            window.empDataMap[doc.id] = data;
            const skillsHtml = (data.skills || []).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('');
            const load = data.workload || 0;
            const loadClass = load > 90 ? 'workload-high' : 'workload-ok';
            const loadText = load > 90 ? load + '% (과부하)' : load + '% (적정)';

            html += `
                <tr>
                    <td>
                        <strong style="color:var(--text-dark);">${data.name || '-'}</strong>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${data.position || '-'}</div>
                    </td>
                    <td>${data.department || '-'}</td>
                    <td>${data.contact || '-'}</td>
                    <td>${skillsHtml || '-'}</td>
                    <td>
                        <div style="font-weight:600; color:var(--ai-primary);">${formatVND(data.salary)}</div>
                        <div style="font-size:0.85rem; color:var(--warning);">${data.performance || '평가 전'}</div>
                    </td>
                    <td class="${loadClass}">${loadText}</td>
                    <td>
                        <button onclick="window.editEmp('${doc.id}')" style="padding:0.25rem 0.5rem; background:white; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer;">수정</button>
                        <button onclick="window.deleteEmp('${doc.id}')" style="padding:0.25rem 0.5rem; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:4px; cursor:pointer; margin-left:0.25rem;">삭제</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">오류가 발생했습니다.</td></tr>';
    }
}

empForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    btn.textContent = '저장 중...';
    btn.disabled = true;

    try {
        const skillsArr = document.getElementById('empSkills').value.split(',').filter(x => x.trim() !== '');
        const id = document.getElementById('empId').value;
        const payload = {
            name: document.getElementById('empName').value,
            position: document.getElementById('empPosition').value,
            department: document.getElementById('empDept').value,
            workload: Number(document.getElementById('empWorkload').value),
            contact: document.getElementById('empContact').value,
            salary: Number(document.getElementById('empSalary').value) || 0,
            performance: document.getElementById('empPerformance').value,
            skills: skillsArr
        };
        
        if (id) {
            await updateDoc(doc(db, 'employees', id), payload);
            alert("정상적으로 수정되었습니다.");
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'employees'), payload);
            alert("정상적으로 등록되었습니다.");
        }

        modal.style.display = 'none';
        empForm.reset();
        await loadEmployees();
    } catch (err) {
        console.error(err);
        alert('저장 실패: ' + err.message);
    } finally {
        btn.textContent = '저장하기';
        btn.disabled = false;
    }
});

loadEmployees();


window.editEmp = (id) => {
    const data = window.empDataMap[id];
    if(!data) return;
    document.getElementById('modalEmpTitle').textContent = '직원 프로필 수정';
    document.getElementById('empId').value = id;
    document.getElementById('empName').value = data.name || '';
    document.getElementById('empPosition').value = data.position || '';
    document.getElementById('empDept').value = data.department || '';
    document.getElementById('empSalary').value = data.salary || '';
    document.getElementById('empPerformance').value = data.performance || '';
    document.getElementById('empWorkload').value = data.workload || 0;
    document.getElementById('empContact').value = data.contact || '';
    document.getElementById('empSkills').value = (data.skills || []).join(', ');
    
    document.getElementById('empModal').style.display = 'flex';
};

window.deleteEmp = async (id) => {
    if(!confirm("정말 이 직원을 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'employees', id));
        alert("접속자의 직원 데이터가 삭제되었습니다.");
        loadEmployees();
    } catch(e) {
        alert("삭제 오류: " + e.message);
    }
};

openBtn.addEventListener('click', () => {
    document.getElementById('modalEmpTitle').textContent = '직원 프로필 등록';
    document.getElementById('empId').value = '';
    empForm.reset();
    modal.style.display = 'flex';
});


function formatVND(val) {
    if(!val) return '-';
    return new Intl.NumberFormat('ko-KR').format(val) + ' VND';
}