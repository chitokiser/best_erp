import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';
import { checkAdminAuth } from './auth.js';

let allMenus = [];
let currentEditId = null;

async function fetchMenus() {
    const grid = document.getElementById('menuGrid');
    grid.innerHTML = '<p style="color:#64748b; padding:2rem; grid-column:1/-1; text-align:center;">메뉴 데이터를 불러오는 중입니다...</p>';
    
    try {
        // Multi-tenant isolation query
        const q = query(collection(db, 'menus'), where('tenantId', '==', window.tenantId));
        const snap = await getDocs(q);
        
        allMenus = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.loadMenus();
    } catch (e) {
        console.error(e);
        grid.innerHTML = `<p style="color:red;">데이터 로드 실패: ${e.message}</p>`;
    }
}

window.loadMenus = () => {
    const grid = document.getElementById('menuGrid');
    const cat = document.getElementById('filterCategory').value;
    const search = document.getElementById('filterSearch').value.toLowerCase();
    
    let filtered = allMenus.filter(m => {
        let sc = true, sn = true;
        if (cat !== 'ALL') sc = m.category === cat;
        if (search) sn = (m.name || '').toLowerCase().includes(search);
        return sc && sn;
    });
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#64748b; padding:2rem; grid-column:1/-1; text-align:center;">검색된 메뉴가 없습니다.</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(m => {
        let tagHtml = '';
        if (m.tags && Array.isArray(m.tags)) {
            m.tags.forEach(t => {
                if (t === 'HIT') tagHtml += `<span class="smart-tag tag-hit">🔥 HIT</span>`;
                if (t === 'REC') tagHtml += `<span class="smart-tag tag-rec">👍 추천</span>`;
                if (t === 'NEW') tagHtml += `<span class="smart-tag tag-new">✨ 신메뉴</span>`;
            });
        }
        
        const priceStr = Number(m.price || 0).toLocaleString();
        const checked = m.status === '판매중' ? 'checked' : '';
        
        return `
        <div class="menu-card">
            <div class="menu-img">📷 이미지 준비중</div>
            <div class="menu-body">
                <div class="tag-row">${tagHtml}</div>
                <h3 class="menu-title">${m.name}</h3>
                <p class="menu-price">₫ ${priceStr}</p>
                <p class="menu-desc">${m.desc || '설명 없음'}</p>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; padding-top:1rem; border-top:1px solid #f1f5f9;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label class="toggle-switch">
                            <input type="checkbox" ${checked} onchange="toggleStatus('${m.id}', this.checked)">
                            <span class="slider"></span>
                        </label>
                        <span style="font-size:0.8rem; font-weight:600; color:${m.status==='판매중'?'#166534':'#94a3b8'};">${m.status==='판매중'?'판매중':'품절'}</span>
                    </div>
                    <div>
                        <button onclick="editMenu('${m.id}')" style="background:none; border:none; cursor:pointer; color:#4F46E5; font-size:0.85rem; font-weight:600; margin-right:0.5rem;">수정</button>
                        <button onclick="deleteMenu('${m.id}')" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:0.85rem; font-weight:600;">삭제</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.openMenuModal = () => {
    currentEditId = null;
    document.getElementById('modalTitle').textContent = '신규 메뉴 등록';
    document.getElementById('mName').value = '';
    document.getElementById('mDesc').value = '';
    document.getElementById('mPrice').value = '';
    document.getElementById('mCategory').value = '돼지고기';
    document.querySelectorAll('.tag-cb').forEach(cb => cb.checked = false);
    
    document.getElementById('btnSaveMenu').textContent = '메뉴 등록';
    document.getElementById('menuModal').style.display = 'flex';
};

window.editMenu = (id) => {
    const m = allMenus.find(x => x.id === id);
    if (!m) return;
    currentEditId = id;
    
    document.getElementById('modalTitle').textContent = '메뉴 수정';
    document.getElementById('mName').value = m.name;
    document.getElementById('mDesc').value = m.desc || '';
    document.getElementById('mPrice').value = m.price;
    document.getElementById('mCategory').value = m.category || '돼지고기';
    
    document.querySelectorAll('.tag-cb').forEach(cb => {
        cb.checked = m.tags && m.tags.includes(cb.value);
    });
    
    document.getElementById('btnSaveMenu').textContent = '수정 완료';
    document.getElementById('menuModal').style.display = 'flex';
};

document.getElementById('btnSaveMenu').addEventListener('click', async () => {
    const name = document.getElementById('mName').value.trim();
    if (!name) return alert('메뉴명을 입력하세요.');
    
    const price = Number(document.getElementById('mPrice').value) || 0;
    const desc = document.getElementById('mDesc').value.trim();
    const cat = document.getElementById('mCategory').value;
    
    const tags = [];
    document.querySelectorAll('.tag-cb:checked').forEach(cb => tags.push(cb.value));
    
    document.getElementById('btnSaveMenu').disabled = true;
    document.getElementById('btnSaveMenu').textContent = '처리 중...';
    
    const data = {
        name, desc, price, category: cat, tags,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'menus', currentEditId), data);
        } else {
            data.status = '판매중';
            data.tenantId = window.tenantId; // Multi-tenant binding!!
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, 'menus'), data);
        }
        document.getElementById('menuModal').style.display = 'none';
        await fetchMenus();
    } catch (e) {
        alert(e.message);
    } finally {
        document.getElementById('btnSaveMenu').disabled = false;
    }
});

window.toggleStatus = async (id, isChecked) => {
    const newStatus = isChecked ? '판매중' : '품절';
    try {
        await updateDoc(doc(db, 'menus', id), { status: newStatus });
        const idx = allMenus.findIndex(x => x.id === id);
        if (idx !== -1) allMenus[idx].status = newStatus;
        loadMenus(); // Only re-render locally for speed
    } catch (e) {
        alert('상태 변경 실패: ' + e.message);
        loadMenus(); // revert toggle
    }
};

window.deleteMenu = async (id) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        await deleteDoc(doc(db, 'menus', id));
        allMenus = allMenus.filter(x => x.id !== id);
        loadMenus();
    } catch (e) {
        alert(e.message);
    }
}

checkAdminAuth(() => fetchMenus());
