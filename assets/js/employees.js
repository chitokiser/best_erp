import { db, auth } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, query, where } from 'firebase/firestore';

const modal = document.getElementById('empModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('btnCancelModal');
const empForm = document.getElementById('empForm');
const tbody = document.getElementById('empTableBody');

// User search elements
const userSearchInput = document.getElementById('userSearchInput');
const btnSearchUser = document.getElementById('btnSearchUser');
const userSearchResults = document.getElementById('userSearchResults');
const selectedUserBadge = document.getElementById('selectedUserBadge');
const badgeUserName = document.getElementById('badgeUserName');
const badgeUserEmail = document.getElementById('badgeUserEmail');
const badgeUserRole = document.getElementById('badgeUserRole');
const btnUnlinkUser = document.getElementById('btnUnlinkUser');
const empLinkedUserId = document.getElementById('empLinkedUserId');
const empLinkedUserEmail = document.getElementById('empLinkedUserEmail');

let allUsersCache = [];
window.empDataMap = {};

// -------------------------------------------------------------
// Load All System Users for Live Search
// -------------------------------------------------------------
async function loadAllUsers() {
    try {
        const snap = await getDocs(collection(db, 'users'));
        allUsersCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.warn("Failed to preload users list:", e);
    }
}

function renderSearchResults(filterText = '') {
    const q = (filterText || userSearchInput.value || '').trim().toLowerCase();
    if (!q) {
        userSearchResults.style.display = 'none';
        userSearchResults.innerHTML = '';
        return;
    }

    const matches = allUsersCache.filter(u => {
        const email = (u.email || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        return email.includes(q) || name.includes(q);
    });

    if (matches.length === 0) {
        userSearchResults.innerHTML = `
            <div style="padding:1rem; text-align:center; color:#64748b; font-size:0.875rem;">
                일치하는 회원이 없습니다.<br>
                <span style="color:#4F46E5; font-weight:600;">'${q}'</span> 계정으로 직접 등록 시, 추후 로그인할 때 직원 권한이 부여됩니다.
            </div>
        `;
        userSearchResults.style.display = 'block';
        return;
    }

    let html = '';
    matches.slice(0, 10).forEach(u => {
        const name = u.name || (u.email ? u.email.split('@')[0] : '미지정');
        const email = u.email || u.id;
        const role = u.role || 'USER';
        
        html += `
            <div class="user-search-item" onclick="window.selectSearchUser('${u.id}')">
                <div>
                    <div class="user-meta-name">${name}</div>
                    <div class="user-meta-email">${email}</div>
                </div>
                <span class="user-role-chip">${role}</span>
            </div>
        `;
    });

    userSearchResults.innerHTML = html;
    userSearchResults.style.display = 'block';
}

window.selectSearchUser = (uid) => {
    const user = allUsersCache.find(u => u.id === uid);
    if (!user) return;

    empLinkedUserId.value = user.id;
    empLinkedUserEmail.value = user.email || '';

    // Auto-fill form fields
    const nameInput = document.getElementById('empName');
    const contactInput = document.getElementById('empContact');
    
    if (nameInput && (!nameInput.value || nameInput.value === '')) {
        nameInput.value = user.name || (user.email ? user.email.split('@')[0] : '');
    }
    if (contactInput) {
        contactInput.value = user.email || '';
    }

    // Show selected badge
    badgeUserName.textContent = user.name || (user.email ? user.email.split('@')[0] : '회원');
    badgeUserEmail.textContent = user.email || user.id;
    badgeUserRole.textContent = user.role || '회원';
    selectedUserBadge.style.display = 'flex';

    // Clear search
    userSearchResults.style.display = 'none';
    userSearchInput.value = '';
};

function unlinkUser() {
    empLinkedUserId.value = '';
    empLinkedUserEmail.value = '';
    selectedUserBadge.style.display = 'none';
}

if (btnUnlinkUser) btnUnlinkUser.addEventListener('click', unlinkUser);

if (userSearchInput) {
    userSearchInput.addEventListener('input', (e) => {
        renderSearchResults(e.target.value);
    });
    userSearchInput.addEventListener('focus', () => {
        if (userSearchInput.value.trim()) {
            renderSearchResults(userSearchInput.value);
        }
    });
}

if (btnSearchUser) {
    btnSearchUser.addEventListener('click', () => {
        renderSearchResults(userSearchInput.value);
    });
}

// Close search dropdown on click outside
window.addEventListener('click', (e) => {
    if (userSearchResults && !e.target.closest('.user-search-box')) {
        userSearchResults.style.display = 'none';
    }
});

// -------------------------------------------------------------
// Load and Render Employees List
// -------------------------------------------------------------
async function loadEmployees() {
    try {
        const snap = await getDocs(collection(db, 'employees'));
        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted);">등록된 직원 데이터가 없습니다.</td></tr>';
            return;
        }

        let html = "";
        window.empDataMap = {};

        const currentTenant = String(window.tenantId || '');
        const isSuper = window.currentUserRole === 'SUPER_ADMIN' || window.currentUserEmail === 'daguri75@gmail.com';

        let records = [];
        snap.forEach(d => {
            const data = d.data();
            window.empDataMap[d.id] = data;

            // In franchise mode, filter by merchantId or tenantId unless super admin
            if (isSuper || !currentTenant || currentTenant === 'system_master') {
                records.push({ id: d.id, ...data });
            } else {
                const docTenant = String(data.tenantId || data.merchantId || '');
                // Show if belongs to this franchise or has no tenant specified (legacy compatibility)
                if (!docTenant || docTenant === currentTenant) {
                    records.push({ id: d.id, ...data });
                }
            }
        });

        if (records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:var(--text-muted);">현재 가맹점에 등록된 직원이 없습니다.</td></tr>';
            return;
        }

        records.forEach(data => {
            const skillsHtml = (data.skills || []).map(s => `<span class="skill-tag">${s.trim()}</span>`).join('');
            const load = Number(data.workload) || 0;
            const loadClass = load > 90 ? 'workload-high' : 'workload-ok';
            const loadText = load > 90 ? load + '% (과부하)' : load + '% (적정)';

            // Linked account badge
            const isLinked = !!data.userId;
            const linkedBadge = isLinked 
                ? `<span style="display:inline-block; font-size:0.75rem; background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; padding:0.15rem 0.4rem; border-radius:0.25rem; font-weight:600; margin-top:0.25rem;">✅ 시스템 연동</span>`
                : `<span style="display:inline-block; font-size:0.75rem; background:#f1f5f9; color:#64748b; padding:0.15rem 0.4rem; border-radius:0.25rem; margin-top:0.25rem;">미연동</span>`;

            html += `
                <tr>
                    <td>
                        <strong style="color:var(--text-dark); font-size:1rem;">${data.name || '-'}</strong>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${data.position || '-'}</div>
                        ${linkedBadge}
                    </td>
                    <td>${data.department || '-'}</td>
                    <td>
                        <div style="font-weight:500;">${data.contact || '-'}</div>
                    </td>
                    <td>${skillsHtml || '-'}</td>
                    <td>
                        <div style="font-weight:700; color:var(--ai-primary); font-size:0.95rem;">${formatVND(data.salary)}</div>
                        <div style="font-size:0.85rem; color:var(--warning); font-weight:600;">${data.performance || '평가 전'}</div>
                    </td>
                    <td class="${loadClass}">${loadText}</td>
                    <td>
                        <button onclick="window.editEmp('${data.id}')" style="padding:0.35rem 0.65rem; background:white; border:1px solid #cbd5e1; border-radius:0.4rem; font-weight:600; cursor:pointer;">수정</button>
                        <button onclick="window.deleteEmp('${data.id}')" style="padding:0.35rem 0.65rem; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:0.4rem; font-weight:600; cursor:pointer; margin-left:0.25rem;">삭제</button>
                        <button onclick="window.location.href='tasks.html?assignee=${data.id}'" style="padding:0.35rem 0.65rem; background:var(--ai-primary); color:white; border:none; border-radius:0.4rem; font-weight:600; cursor:pointer; margin-left:0.25rem;">업무지시</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red;">직원 목록을 불러오는 중 오류가 발생했습니다. (' + err.message + ')</td></tr>';
    }
}

// -------------------------------------------------------------
// Form Submit: Save Employee & Grant Staff Role in Users DB
// -------------------------------------------------------------
empForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const originalText = btn.textContent;
    btn.textContent = '저장 및 권한 부여 중...';
    btn.disabled = true;

    try {
        const skillsArr = document.getElementById('empSkills').value.split(',').map(x => x.trim()).filter(x => x !== '');
        const id = document.getElementById('empId').value;
        const contactEmail = document.getElementById('empContact').value.trim();
        let linkedUid = empLinkedUserId.value.trim();

        // If no explicit user click, search cache by contact email
        let matchedUser = null;
        if (linkedUid) {
            matchedUser = allUsersCache.find(u => u.id === linkedUid);
        } else if (contactEmail) {
            matchedUser = allUsersCache.find(u => (u.email || '').toLowerCase() === contactEmail.toLowerCase());
            if (matchedUser) {
                linkedUid = matchedUser.id;
            }
        }

        const currentTenantId = String(window.tenantId || 'system_master');
        const currentStoreName = window.currentStoreName || '가맹점';

        const payload = {
            name: document.getElementById('empName').value.trim(),
            position: document.getElementById('empPosition').value.trim(),
            department: document.getElementById('empDept').value.trim(),
            workload: Number(document.getElementById('empWorkload').value) || 0,
            contact: contactEmail,
            salary: Number(document.getElementById('empSalary').value) || 0,
            performance: document.getElementById('empPerformance').value,
            skills: skillsArr,
            userId: linkedUid || '',
            email: contactEmail,
            role: 'STAFF',
            tenantId: currentTenantId,
            merchantId: currentTenantId,
            storeName: currentStoreName,
            updatedAt: serverTimestamp()
        };
        
        let savedEmpDocId = id;
        if (id) {
            await updateDoc(doc(db, 'employees', id), payload);
        } else {
            payload.createdAt = serverTimestamp();
            const newDocRef = await addDoc(collection(db, 'employees'), payload);
            savedEmpDocId = newDocRef.id;
        }

        // 🌟 CRITICAL: Grant STAFF Role & Franchise Merchant Binding in Users Collection
        if (linkedUid) {
            try {
                await setDoc(doc(db, 'users', linkedUid), {
                    email: contactEmail,
                    role: 'STAFF',
                    status: '승인완료',
                    position: payload.position,
                    department: payload.department,
                    merchantId: currentTenantId,
                    tenantId: currentTenantId,
                    tenant_id: currentTenantId,
                    storeName: currentStoreName,
                    employeeDocId: savedEmpDocId,
                    updatedAt: serverTimestamp()
                }, { merge: true });
                console.log("Successfully bound user", linkedUid, "as STAFF to merchant", currentTenantId);
            } catch (userSyncErr) {
                console.warn("Failed to sync staff role to users collection:", userSyncErr);
            }
        }

        alert(`'${payload.name}' 직원이 성공적으로 등록되었습니다!\n해당 계정(${contactEmail})으로 로그인 시 가맹점(${currentStoreName}) 서비스에 즉시 접근할 수 있습니다.`);

        modal.style.display = 'none';
        empForm.reset();
        unlinkUser();
        await loadEmployees();
    } catch (err) {
        console.error(err);
        alert('직원 등록 실패: ' + err.message);
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

// -------------------------------------------------------------
// Edit & Delete Handlers
// -------------------------------------------------------------
window.editEmp = (id) => {
    const data = window.empDataMap[id];
    if (!data) return;
    document.getElementById('modalEmpTitle').textContent = '👤 직원 프로필 수정';
    document.getElementById('empId').value = id;
    document.getElementById('empName').value = data.name || '';
    document.getElementById('empPosition').value = data.position || '';
    document.getElementById('empDept').value = data.department || '';
    document.getElementById('empSalary').value = data.salary || '';
    document.getElementById('empPerformance').value = data.performance || '';
    document.getElementById('empWorkload').value = data.workload || 0;
    document.getElementById('empContact').value = data.contact || data.email || '';
    document.getElementById('empSkills').value = (data.skills || []).join(', ');

    // Handle linked user state
    if (data.userId) {
        empLinkedUserId.value = data.userId;
        empLinkedUserEmail.value = data.contact || data.email || '';
        badgeUserName.textContent = data.name || '연동 회원';
        badgeUserEmail.textContent = data.contact || data.userId;
        badgeUserRole.textContent = 'STAFF';
        selectedUserBadge.style.display = 'flex';
    } else {
        unlinkUser();
    }
    
    modal.style.display = 'flex';
};

window.deleteEmp = async (id) => {
    const empData = window.empDataMap[id];
    const name = empData?.name || '해당';
    if (!confirm(`정말 '${name}' 직원을 삭제하시겠습니까?\n(직원 데이터가 제거되며 서비스 권한이 회수됩니다.)`)) return;

    try {
        await deleteDoc(doc(db, 'employees', id));

        // If had linked user, revoke STAFF role back to VIEWER
        if (empData && empData.userId) {
            try {
                await updateDoc(doc(db, 'users', empData.userId), {
                    role: 'VIEWER',
                    status: '대기중',
                    position: '일반 회원',
                    merchantId: null,
                    tenantId: null,
                    updatedAt: serverTimestamp()
                });
            } catch (revokeErr) {
                console.warn("Failed to revoke user role:", revokeErr);
            }
        }

        alert(`'${name}' 직원 데이터가 삭제되었습니다.`);
        loadEmployees();
    } catch(e) {
        alert("삭제 중 오류가 발생했습니다: " + e.message);
    }
};

// -------------------------------------------------------------
// Modal Open / Close Events
// -------------------------------------------------------------
if (openBtn) {
    openBtn.addEventListener('click', () => {
        document.getElementById('modalEmpTitle').textContent = '👤 직원 프로필 등록';
        document.getElementById('empId').value = '';
        empForm.reset();
        unlinkUser();
        modal.style.display = 'flex';
        loadAllUsers(); // Refresh users cache when opening modal
    });
}

if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
if (cancelBtn) cancelBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        modal.style.display = 'none';
    }
});

function formatVND(val) {
    if (!val) return '-';
    return new Intl.NumberFormat('ko-KR').format(val) + ' VND';
}

// Preload users list & initial employee table
loadAllUsers();
loadEmployees();
