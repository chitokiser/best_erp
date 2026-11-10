import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, getDoc, writeBatch } from 'firebase/firestore';
import { zaloFriendsData } from './zaloFriendsData.js';

const tbody = document.getElementById('contactsTableBody');
const addModal = document.getElementById('addContactModal');
const shareModal = document.getElementById('shareContactModal');
const zaloModal = document.getElementById('zaloImportModal');

const addForm = document.getElementById('addContactForm');
const shareForm = document.getElementById('shareContactForm');
const empSelect = document.getElementById('shareEmployee');

let allEmployees = [];
let allContactsData = []; // Store raw contact data for graph rendering

const toggleGraphBtn = document.getElementById('toggleGraphBtn');
const graphContainer = document.getElementById('networkGraphContainer');
let networkGraph = null;

document.getElementById('openAddModalBtn')?.addEventListener('click', () => {
    addModal.style.display = 'flex';
});

toggleGraphBtn?.addEventListener('click', () => {
    if (graphContainer.style.display === 'none') {
        graphContainer.style.display = 'block';
        toggleGraphBtn.innerHTML = '🕸️ 그래프 뷰어 닫기';
        renderGraph(); // Draw graph when opened
    } else {
        graphContainer.style.display = 'none';
        toggleGraphBtn.innerHTML = '🕸️ 그래프 뷰어 열기';
    }
});

// Load DB
async function loadContacts() {
    try {
        // Load employees first for mapping and sharing options
        const empSnap = await getDocs(collection(db, 'employees'));
        allEmployees = [];
        if (empSelect) empSelect.innerHTML = '<option value="">소개/연결할 직원을 선택하세요</option>';
        empSnap.forEach(e => {
            const data = e.data();
            allEmployees.push({ id: e.id, name: data.name, position: data.position, dept: data.department });
            if (empSelect) empSelect.innerHTML += `<option value="${e.id}">${data.name} (${data.position || data.department})</option>`;
        });

        // Load Contacts
        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">등록된 인맥이 없습니다. [Zalo 친구 일괄 가져오기]를 눌러보세요!</td></tr>';
            return;
        }

        let html = '';
        allContactsData = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            data.id = docSnap.id;
            allContactsData.push(data);

            // Build Network Badges (Connections)
            let networkHtml = '';
            if (data.sharedWith && data.sharedWith.length > 0) {
                data.sharedWith.forEach(conn => {
                    const emp = allEmployees.find(e => e.id === conn.empId);
                    const empName = emp ? `${emp.name} ${emp.position}` : conn.empName;
                    networkHtml += `
                        <div style="margin-bottom:0.5rem; background:#f8fafc; padding:0.4rem; border-radius:0.5rem; border:1px solid #e2e8f0;">
                           <span class="network-tag">연결됨</span> <strong>${empName}</strong>
                           <div class="network-path">↳ ${conn.memo || '메모 없음'}</div>
                        </div>
                    `;
                });
            } else {
                networkHtml = '<span style="color:#94a3b8; font-size:0.85rem;">사내 연결 라인 없음</span>';
            }

            const avatarHtml = data.avatar 
                ? `<img src="${data.avatar}" style="width:34px; height:34px; border-radius:50%; object-fit:cover; border:1px solid #E2E8F0; flex-shrink:0;">`
                : `<div style="width:34px; height:34px; border-radius:50%; background:#EEF2FF; color:#4F46E5; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0;">${(data.name || '?').charAt(0)}</div>`;

            const zaloBadge = data.zaloId 
                ? `<div style="margin-top:0.15rem;">
                    <span style="display:inline-flex; align-items:center; gap:0.25rem; background:#E0F2FE; color:#0369A1; font-size:0.72rem; padding:0.1rem 0.4rem; border-radius:0.25rem; font-weight:700;">
                        <span style="background:#0068FF; color:white; border-radius:0.2rem; padding:0 0.25rem; font-size:0.65rem;">Zalo</span>
                        ${data.aliasName ? `<span style="color:#64748B; font-weight:500;">(${data.zName})</span>` : ''}
                    </span>
                   </div>`
                : '';

            html += `
                <tr>
                    <td style="font-weight:700;">
                        <div style="display:flex; align-items:center; gap:0.65rem;">
                            ${avatarHtml}
                            <div>
                                <div style="color:#0F172A; font-size:0.95rem;">${data.name}</div>
                                ${zaloBadge}
                            </div>
                        </div>
                    </td>
                    <td>
                        <div style="color:var(--text-dark); font-weight:600;">${data.company || '기타 인맥'}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${data.position || ''}</div>
                    </td>
                    <td>${data.phone || '<span style="color:#94a3b8; font-size:0.85rem;">Zalo 메신저</span>'}</td>
                    <td style="font-size:0.9rem;">
                        <span style="background:#f1f5f9; padding:0.3rem 0.5rem; border-radius:1rem;">
                            👤 ${data.initialRegistrar || '알수없음'}
                        </span>
                    </td>
                    <td>${networkHtml}</td>
                    <td>
                        <button onclick="window.openShareModal('${docSnap.id}', '${data.name}', '${data.company || ''}')" style="padding:0.4rem 0.8rem; background:var(--ai-gradient); color:white; border:none; border-radius:0.5rem; font-size:0.8rem; cursor:pointer;" class="hover-btn">
                            🤝 소개하기
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // If graph is currently visible, update it
        if (graphContainer.style.display === 'block') {
            renderGraph();
        }

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">데이터 로드 중 오류가 발생했습니다.</td></tr>';
    }
}

// Add New Contact
addForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnAddSubmit');
    btn.disabled = true;
    btn.textContent = '등록 중...';

    try {
        await addDoc(collection(db, 'contacts'), {
            name: document.getElementById('addName').value,
            company: document.getElementById('addCompany').value,
            position: document.getElementById('addPosition').value,
            phone: document.getElementById('addPhone').value,
            initialRegistrar: document.getElementById('addRegistrar').value || '기명 확인 불가',
            sharedWith: [], // Array of connections { empId, empName, memo, date }
            createdAt: serverTimestamp()
        });
        addModal.style.display = 'none';
        addForm.reset();
        await loadContacts();
    } catch (err) {
        console.error(err);
        alert('등록 실패: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '인맥 DB 추가';
    }
});

// Share / Connect Logic
window.openShareModal = (id, name, company) => {
    document.getElementById('shareContactId').value = id;
    document.getElementById('shareContactDisplay').textContent = `${company} ${name}`;
    shareModal.style.display = 'flex';
};

shareForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnShareSubmit');
    btn.disabled = true;
    btn.textContent = '연결 중...';

    try {
        const contactId = document.getElementById('shareContactId').value;
        const empId = document.getElementById('shareEmployee').value;
        const memo = document.getElementById('shareMemo').value;

        const empObj = allEmployees.find(emp => emp.id === empId);

        const docRef = doc(db, 'contacts', contactId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let shares = docSnap.data().sharedWith || [];
            shares.push({
                empId: empId,
                empName: empObj.name,
                memo: memo,
                date: new Date().toISOString()
            });
            await updateDoc(docRef, { sharedWith: shares });

            shareModal.style.display = 'none';
            shareForm.reset();
            alert(`해당 인맥이 ${empObj.name}님에게 성공적으로 소개(연결)되었습니다.`);
            await loadContacts();
        }
    } catch (err) {
        console.error(err);
        alert('연결 실패: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '인맥 라인 연결하기';
    }
});

// Graph Rendering Logic using vis.js
function renderGraph() {
    if (!window.vis) return;

    const nodesData = [];
    const edgesData = [];
    const addedNodeIds = new Set();

    // 1. Add all employees as central nodes
    allEmployees.forEach(emp => {
        if (!addedNodeIds.has(emp.id)) {
            nodesData.push({
                id: emp.id,
                label: `${emp.name}\n(${emp.position || emp.dept})`,
                shape: 'hexagon',
                color: { background: '#6366f1', border: '#4338ca' },
                font: { color: 'white', face: 'Inter' },
                size: 25
            });
            addedNodeIds.add(emp.id);
        }
    });

    // 2. Add contacts and connections
    allContactsData.forEach(contact => {
        if (!addedNodeIds.has(contact.id)) {
            nodesData.push({
                id: contact.id,
                label: `${contact.name}\n${contact.company}`,
                shape: 'dot',
                color: { background: '#10b981', border: '#059669' },
                font: { color: '#1e293b', face: 'Inter' },
                size: 15
            });
            addedNodeIds.add(contact.id);
        }

        if (contact.sharedWith && contact.sharedWith.length > 0) {
            contact.sharedWith.forEach(conn => {
                edgesData.push({
                    from: contact.id,
                    to: conn.empId,
                    label: conn.memo ? conn.memo.substring(0, 15) + (conn.memo.length > 15 ? '...' : '') : '',
                    font: { align: 'middle', size: 10, color: '#64748b' },
                    arrows: { to: { enabled: true, scaleFactor: 0.5 } },
                    color: { color: '#cbd5e1', highlight: '#818CF8' },
                    length: 150
                });
            });
        }
    });

    const container = document.getElementById('mynetwork');
    const data = {
        nodes: new vis.DataSet(nodesData),
        edges: new vis.DataSet(edgesData)
    };
    const options = {
        physics: {
            forceAtlas2Based: {
                gravitationalConstant: -50,
                centralGravity: 0.01,
                springLength: 100,
                springConstant: 0.08
            },
            maxVelocity: 50,
            solver: 'forceAtlas2Based',
            timestep: 0.35,
            stabilization: { iterations: 150 }
        },
        interaction: {
            hover: true,
            tooltipDelay: 200,
            zoomView: true,
            dragView: true
        }
    };

    if (networkGraph) {
        networkGraph.destroy();
    }
    networkGraph = new vis.Network(container, data, options);
}

// -------------------------------------------------------------
// Zalo Friends Import Modal & Batch Execution
// -------------------------------------------------------------
const openZaloBtn = document.getElementById('openZaloImportBtn');
const closeZaloBtn = document.getElementById('closeZaloModalBtn');
const cancelZaloBtn = document.getElementById('btnCancelZaloModal');
const btnConfirmZalo = document.getElementById('btnConfirmZaloImport');
const zaloPreviewList = document.getElementById('zaloPreviewList');
const zaloFriendCount = document.getElementById('zaloFriendCount');
const zaloDuplicateNotice = document.getElementById('zaloDuplicateNotice');
const csvFileInput = document.getElementById('csvFileInput');

let currentZaloQueue = [];

function openZaloModal() {
    if (!zaloModal) return;

    // Check which items are already in allContactsData
    currentZaloQueue = zaloFriendsData.map(fr => {
        const alreadyExists = allContactsData.some(c => 
            c.name === fr.name || (fr.zaloId && c.zaloId === fr.zaloId)
        );
        return { ...fr, isRegistered: alreadyExists };
    });

    const unregCount = currentZaloQueue.filter(f => !f.isRegistered).length;
    if (zaloFriendCount) zaloFriendCount.textContent = currentZaloQueue.length;
    if (zaloDuplicateNotice) {
        zaloDuplicateNotice.textContent = unregCount < currentZaloQueue.length 
            ? `(${currentZaloQueue.length - unregCount}명 이미 등록됨, ${unregCount}명 신규 등록 가능)`
            : '(134명 모두 신규 등록 대기)';
    }

    renderZaloPreviewList(currentZaloQueue);
    zaloModal.style.display = 'flex';
}

function renderZaloPreviewList(list) {
    if (!zaloPreviewList) return;
    zaloPreviewList.innerHTML = list.map(item => `
        <div style="background:#F8FAFC; border:1px solid ${item.isRegistered ? '#E2E8F0' : '#BAE6FD'}; border-radius:0.6rem; padding:0.65rem 0.8rem; display:flex; align-items:center; gap:0.65rem; ${item.isRegistered ? 'opacity:0.6;' : ''}">
            ${item.avatar 
                ? `<img src="${item.avatar}" style="width:36px; height:36px; border-radius:50%; object-fit:cover; border:1px solid #CBD5E1; flex-shrink:0;">`
                : `<div style="width:36px; height:36px; border-radius:50%; background:#E0F2FE; color:#0284C7; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.85rem; flex-shrink:0;">${item.name.charAt(0)}</div>`
            }
            <div style="min-width:0; flex:1;">
                <div style="font-weight:700; color:#0F172A; font-size:0.875rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    ${item.name}
                </div>
                <div style="display:flex; align-items:center; gap:0.35rem; margin-top:0.15rem; font-size:0.75rem;">
                    <span style="background:#E2E8F0; color:#475569; padding:0.1rem 0.35rem; border-radius:0.25rem; font-weight:600;">${item.company}</span>
                    ${item.isRegistered 
                        ? '<span style="color:#059669; font-weight:700;">✓ 등록됨</span>'
                        : '<span style="color:#0284C7; font-weight:600;">대기</span>'
                    }
                </div>
            </div>
        </div>
    `).join('');
}

openZaloBtn?.addEventListener('click', openZaloModal);
closeZaloBtn?.addEventListener('click', () => { if (zaloModal) zaloModal.style.display = 'none'; });
cancelZaloBtn?.addEventListener('click', () => { if (zaloModal) zaloModal.style.display = 'none'; });

// Batch import execution
btnConfirmZalo?.addEventListener('click', async () => {
    const toImport = currentZaloQueue.filter(f => !f.isRegistered);

    if (toImport.length === 0) {
        alert('모든 Zalo 인맥이 이미 등록되어 있습니다.');
        return;
    }

    if (!confirm(`총 ${toImport.length}명의 Zalo 인맥을 인맥 DB에 일괄 등록하시겠습니까?`)) {
        return;
    }

    btnConfirmZalo.disabled = true;
    btnConfirmZalo.innerHTML = '<span>⏳</span> DB 등록 중...';

    try {
        const colRef = collection(db, 'contacts');
        const chunkSize = 400; // Firestore writeBatch limit is 500

        for (let i = 0; i < toImport.length; i += chunkSize) {
            const chunk = toImport.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(fr => {
                const docRef = doc(colRef);
                batch.set(docRef, {
                    name: fr.name,
                    company: fr.company || 'Zalo 인맥',
                    position: fr.position || '',
                    phone: fr.phone || '',
                    zaloId: fr.zaloId || '',
                    avatar: fr.avatar || '',
                    zName: fr.zName || '',
                    aliasName: fr.aliasName || '',
                    initialRegistrar: 'Zalo 동기화 (Bestwinner)',
                    sharedWith: [],
                    createdAt: serverTimestamp()
                });
            });

            await batch.commit();
        }

        alert(`🎉 축하합니다! ${toImport.length}명의 Zalo 인맥이 성공적으로 인맥 DB에 등록되었습니다.`);
        if (zaloModal) zaloModal.style.display = 'none';
        await loadContacts();

    } catch (err) {
        console.error(err);
        alert('일괄 등록 중 오류 발생: ' + err.message);
    } finally {
        btnConfirmZalo.disabled = false;
        btnConfirmZalo.innerHTML = '<span>🚀</span> 전체 일괄 등록하기';
    }
});

// CSV file upload handler
csvFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length <= 1) {
            alert('CSV 파일에 데이터가 없습니다.');
            return;
        }

        // Header check
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const nameIdx = headers.findIndex(h => /name|이름|성명/i.test(h));
        const companyIdx = headers.findIndex(h => /company|회사|소속/i.test(h));
        const phoneIdx = headers.findIndex(h => /phone|전화|연락처|mobile/i.test(h));

        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            const name = cols[nameIdx !== -1 ? nameIdx : 0];
            if (!name) continue;
            parsed.push({
                name: name,
                company: companyIdx !== -1 ? cols[companyIdx] : 'CSV 가져오기',
                phone: phoneIdx !== -1 ? cols[phoneIdx] : '',
                position: '',
                avatar: '',
                isRegistered: false
            });
        }

        if (parsed.length === 0) {
            alert('유효한 연락처 데이터를 찾을 수 없습니다.');
            return;
        }

        currentZaloQueue = parsed;
        if (zaloFriendCount) zaloFriendCount.textContent = parsed.length;
        if (zaloDuplicateNotice) zaloDuplicateNotice.textContent = `(외부 CSV 파일 ${parsed.length}건 불러옴)`;
        renderZaloPreviewList(parsed);
        alert(`CSV 파일에서 ${parsed.length}건의 연락처를 성공적으로 불러왔습니다. [전체 일괄 등록하기]를 눌러 저장하세요.`);

    } catch (err) {
        console.error(err);
        alert('CSV 파싱 오류: ' + err.message);
    }
});

loadContacts();

// Handle OCR
document.addEventListener('DOMContentLoaded', () => {
    const ocrInputs = [document.getElementById('ocrCamera'), document.getElementById('ocrGallery')];
    const ocrLoading = document.getElementById('ocrLoading');
    ocrInputs.forEach(input => {
        if (input) {
            input.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                ocrLoading.style.display = 'block';

                try {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const img = new Image();
                        img.onload = async () => {
                            const canvas = document.createElement('canvas');
                            const MAX_WIDTH = 1000;
                            const MAX_HEIGHT = 1000;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                            } else {
                                if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);

                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            const base64Data = compressedDataUrl.split(',')[1];
                            const mimeType = 'image/jpeg';

                            try {
                                const { scanBusinessCardAI } = await import('./aiApi.js');
                                const result = await scanBusinessCardAI(base64Data, mimeType);

                                if (result.name) document.getElementById('addName').value = result.name;
                                if (result.company) document.getElementById('addCompany').value = result.company;
                                if (result.position) document.getElementById('addPosition').value = result.position;
                                if (result.phone) document.getElementById('addPhone').value = result.phone;

                                alert('명함 인식이 완료되었습니다.');
                            } catch (err) {
                                alert(err.message);
                            } finally {
                                ocrLoading.style.display = 'none';
                                input.value = '';
                            }
                        };
                        img.src = reader.result;
                    };
                    reader.readAsDataURL(file);
                } catch (e) {
                    console.error(e);
                    alert('오류 발생');
                    ocrLoading.style.display = 'none';
                }
            });
        }
    });
});
