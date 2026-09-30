import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, getDoc } from 'firebase/firestore';

const tbody = document.getElementById('contactsTableBody');
const addModal = document.getElementById('addContactModal');
const shareModal = document.getElementById('shareContactModal');

const addForm = document.getElementById('addContactForm');
const shareForm = document.getElementById('shareContactForm');
const empSelect = document.getElementById('shareEmployee');

let allEmployees = [];
let allContactsData = []; // Store raw contact data for graph rendering

const toggleGraphBtn = document.getElementById('toggleGraphBtn');
const graphContainer = document.getElementById('networkGraphContainer');
let networkGraph = null;

document.getElementById('openAddModalBtn').addEventListener('click', () => {
    addModal.style.display = 'flex';
});

toggleGraphBtn.addEventListener('click', () => {
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
        empSelect.innerHTML = '<option value="">소개/연결할 직원을 선택하세요</option>';
        empSnap.forEach(e => {
            const data = e.data();
            allEmployees.push({ id: e.id, name: data.name, position: data.position, dept: data.department });
            empSelect.innerHTML += `<option value="${e.id}">${data.name} (${data.position || data.department})</option>`;
        });

        // Load Contacts
        const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        if (snap.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--text-muted);">등록된 인맥이 없습니다.</td></tr>';
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

            html += `
                <tr>
                    <td style="font-weight:700;">${data.name}</td>
                    <td>
                        <div style="color:var(--text-dark); font-weight:600;">${data.company}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${data.position || ''}</div>
                    </td>
                    <td>${data.phone}</td>
                    <td style="font-size:0.9rem;">
                        <span style="background:#f1f5f9; padding:0.3rem 0.5rem; border-radius:1rem;">
                            👤 ${data.initialRegistrar || '알수없음'}
                        </span>
                    </td>
                    <td>${networkHtml}</td>
                    <td>
                        <button onclick="window.openShareModal('${docSnap.id}', '${data.name}', '${data.company}')" style="padding:0.4rem 0.8rem; background:var(--ai-gradient); color:white; border:none; border-radius:0.5rem; font-size:0.8rem; cursor:pointer;" class="hover-btn">
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
addForm.addEventListener('submit', async (e) => {
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

shareForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnShareSubmit');
    btn.disabled = true;
    btn.textContent = '연결 중...';

    try {
        const contactId = document.getElementById('shareContactId').value;
        const empId = document.getElementById('shareEmployee').value;
        const memo = document.getElementById('shareMemo').value;

        const empObj = allEmployees.find(emp => emp.id === empId);

        // Fetch current document to arrayUnion (safely, since we don't import arrayUnion we'll do read/write)
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
        // Add external contact node
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

        // Add edges based on sharedWith
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
                    // Convert to base64
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Data = reader.result.split(',')[1];
                        try {
                            const { scanBusinessCardAI } = await import('./aiApi.js');
                            const result = await scanBusinessCardAI(base64Data, file.type);

                            // Fill form
                            if (result.name) document.getElementById('addName').value = result.name;
                            if (result.company) document.getElementById('addCompany').value = result.company;
                            if (result.position) document.getElementById('addPosition').value = result.position;
                            if (result.phone) document.getElementById('addPhone').value = result.phone;

                            alert('명함 인식이 완료되었습니다.');
                        } catch (err) {
                            alert(err.message);
                        } finally {
                            ocrLoading.style.display = 'none';
                            ocrInput.value = ''; // reset
                        }
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