import { db } from './firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from 'firebase/firestore';
import { checkAdminAuth } from './auth.js';

let allProducts = [];
let currentEditId = null;
let currentEditSource = 'merchant_products';
let currentUser = null;
let isSuperAdmin = false;
let activeMerchantId = null;

// BEST ERP는 베스트위너 전용 — 다른 가맹점(대한김치 등) 상품은 최고관리자에게도 노출하지 않음
const ERP_MERCHANT_ID = '1791605366';

// 가맹점 ID/영문별칭 상호 호환 매핑 테이블 (BestClubVN 표준)
const KNOWN_MERCHANT_ALIASES = {
    "daehan_kimchi": ["1791002036", "daehan_kimchi"],
    "1791002036": ["1791002036", "daehan_kimchi"],
    "bestwinner": ["1791605366", "bestwinner", "best_winner"],
    "1791605366": ["1791605366", "bestwinner", "best_winner"]
};

function getMerchantName(id) {
    const s = String(id || '').trim();
    if (s === '1791605366' || s === 'bestwinner' || s === 'best_winner') return '베스트위너';
    if (s === '1791002036' || s === 'daehan_kimchi') return '대한김치';
    return s ? `가맹점(${s})` : '공통';
}

function matchesMerchant(productMerchantId, filterMerchantId) {
    if (!filterMerchantId || filterMerchantId === 'ALL' || filterMerchantId === 'all') return true;
    const pStr = String(productMerchantId || '').trim();
    const fStr = String(filterMerchantId || '').trim();
    if (pStr === fStr) return true;
    const aliases = KNOWN_MERCHANT_ALIASES[fStr] || [fStr];
    return aliases.some(a => String(a).trim() === pStr);
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function fetchProducts() {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;
    grid.innerHTML = '<p style="color:#64748b; padding:2rem; grid-column:1/-1; text-align:center;">가맹점 상품 카탈로그를 불러오는 중입니다...</p>';

    try {
        isSuperAdmin = window.currentUserRole === 'SUPER_ADMIN' ||
            (currentUser && currentUser.email && currentUser.email.toLowerCase() === 'daguri75@gmail.com');

        // 가맹점 식별
        activeMerchantId = ERP_MERCHANT_ID;

        // 최고관리자일 경우 가맹점 필터 및 모달 가맹점 선택창 노출
        const filterMerchantEl = document.getElementById('filterMerchant');
        const modalMerchantRow = document.getElementById('modalMerchantRow');
        if (filterMerchantEl) filterMerchantEl.style.display = 'none';
        if (modalMerchantRow) modalMerchantRow.style.display = 'none';

        allProducts = [];

        // 1. Single Source of Truth: merchant_products 컬렉션 로드
        try {
            const mpSnap = await getDocs(collection(db, 'merchant_products'));
            mpSnap.forEach(d => {
                const data = d.data();
                allProducts.push({
                    id: d.id,
                    source: 'merchant_products',
                    name: data.product_name || data.name || '무제 상품',
                    type: data.product_type || 'menu',
                    price: Number(data.price || 0),
                    desc: data.description || data.desc || '',
                    imageUrl: data.image_url || (Array.isArray(data.images) && data.images[0]) || '',
                    status: data.sale_status || data.status || 'published',
                    merchantId: String(data.merchant_id || data.tenantId || ''),
                    createdAt: data.created_at || data.updated_at || null,
                    raw: data
                });
            });
        } catch (mpErr) {
            console.warn('merchant_products 컬렉션 로드 실패:', mpErr);
        }

        // 2. 레거시 menus 컬렉션 호환 로드 (중복 ID 제외)
        try {
            const mSnap = await getDocs(collection(db, 'menus'));
            mSnap.forEach(d => {
                if (!allProducts.some(p => p.id === d.id)) {
                    const data = d.data();
                    allProducts.push({
                        id: d.id,
                        source: 'menus',
                        name: data.name || '무제 메뉴',
                        type: data.product_type || (data.category ? 'menu' : 'menu'),
                        price: Number(data.price || 0),
                        desc: data.desc || data.description || '',
                        imageUrl: data.imageUrl || data.image_url || '',
                        status: data.status === '판매중' ? 'published' : (data.sale_status || 'draft'),
                        merchantId: String(data.tenantId || data.merchant_id || ''),
                        createdAt: data.createdAt || null,
                        raw: data
                    });
                }
            });
        } catch (mErr) {
            console.warn('menus 레거시 컬렉션 로드 스킵:', mErr);
        }

        // 최신 등록순 정렬
        allProducts.sort((a, b) => {
            const tA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const tB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return tB - tA;
        });

        window.loadMenus();
    } catch (e) {
        console.error('fetchProducts 에러:', e);
        grid.innerHTML = `<p style="color:#ef4444; padding:2rem; grid-column:1/-1; text-align:center;">데이터 로드 실패: ${escapeHtml(e.message)}</p>`;
    }
}

window.loadMenus = () => {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    const filterTypeVal = document.getElementById('filterType')?.value || 'ALL';
    const filterStatusVal = document.getElementById('filterStatus')?.value || 'ALL';
    const searchVal = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

    const filtered = allProducts.filter(item => {
        // 1. 가맹점 격리 필터
        if (!matchesMerchant(item.merchantId, ERP_MERCHANT_ID)) {
            return false;
        }

        // 2. 상품 타입 필터
        if (filterTypeVal !== 'ALL' && item.type !== filterTypeVal) {
            return false;
        }

        // 3. 상태 필터
        if (filterStatusVal !== 'ALL') {
            const isLive = item.status === 'published' || item.status === '판매중';
            if (filterStatusVal === 'published' && !isLive) return false;
            if (filterStatusVal === 'draft' && (isLive || item.status === 'sold_out' || item.status === '품절')) return false;
            if (filterStatusVal === 'sold_out' && item.status !== 'sold_out' && item.status !== '품절') return false;
        }

        // 4. 검색 필터
        if (searchVal) {
            const matchName = item.name.toLowerCase().includes(searchVal);
            const matchDesc = item.desc.toLowerCase().includes(searchVal);
            const matchMerchant = item.merchantId.toLowerCase().includes(searchVal);
            if (!matchName && !matchDesc && !matchMerchant) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="color:#64748b; padding:3rem; grid-column:1/-1; text-align:center; font-weight:500;">조건에 해당하는 등록 상품이 없습니다.</p>';
        return;
    }

    grid.innerHTML = filtered.map(m => {
        const isLive = m.status === 'published' || m.status === '판매중';
        const checked = isLive ? 'checked' : '';
        const priceStr = Number(m.price || 0).toLocaleString();

        // 타입 뱃지
        let typeBadgeHtml = '';
        if (m.type === 'physical_product') {
            typeBadgeHtml = '<span class="smart-tag" style="background:#e0f2fe; color:#0369a1;">📦 실물상품</span>';
        } else if (m.type === 'service') {
            typeBadgeHtml = '<span class="smart-tag" style="background:#f3e8ff; color:#6b21a8;">🎫 서비스/티켓</span>';
        } else if (m.type === 'booking') {
            typeBadgeHtml = '<span class="smart-tag" style="background:#ecfdf5; color:#047857;">📅 예약형</span>';
        } else {
            typeBadgeHtml = '<span class="smart-tag" style="background:#fef3c7; color:#b45309;">🍽️ 메뉴</span>';
        }

        // 가맹점 뱃지
        const merchantBadge = `<span class="smart-tag" style="background:#f8fafc; border:1px solid #cbd5e1; color:#475569;">🏪 ${escapeHtml(getMerchantName(m.merchantId))}</span>`;

        // 이미지 HTML
        const imgHtml = m.imageUrl
            ? `<img src="${escapeHtml(m.imageUrl)}" alt="${escapeHtml(m.name)}" class="menu-img" style="object-fit:cover;" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'menu-img',textContent:'📷 이미지 없음'}));"/>`
            : `<div class="menu-img">📷 이미지 없음</div>`;

        return `
        <div class="menu-card">
            <div style="position:relative; width:100%; height:160px; background:#f1f5f9; overflow:hidden;">
                ${imgHtml}
                <div style="position:absolute; top:8px; left:8px; display:flex; gap:4px; flex-wrap:wrap; z-index:2;">
                    ${typeBadgeHtml}
                    ${merchantBadge}
                </div>
            </div>
            <div class="menu-body">
                <h3 class="menu-title" title="${escapeHtml(m.name)}">${escapeHtml(m.name)}</h3>
                <p class="menu-price">₫ ${priceStr}</p>
                <p class="menu-desc">${escapeHtml(m.desc || '상세 설명이 등록되지 않았습니다.')}</p>
                
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.25rem; padding-top:1rem; border-top:1px solid #f1f5f9;">
                    <div style="display:flex; align-items:center; gap:0.5rem;">
                        <label class="toggle-switch">
                            <input type="checkbox" ${checked} onchange="toggleStatus('${m.id}', this.checked, '${m.source}')">
                            <span class="slider"></span>
                        </label>
                        <span style="font-size:0.8rem; font-weight:600; color:${isLive ? '#166534' : '#94a3b8'};">
                            ${isLive ? '판매중 (공개)' : '비공개'}
                        </span>
                    </div>
                    <div>
                        <button onclick="editMenu('${m.id}')" style="background:none; border:none; cursor:pointer; color:#4F46E5; font-size:0.85rem; font-weight:600; margin-right:0.5rem;">수정</button>
                        <button onclick="deleteMenu('${m.id}', '${m.source}')" style="background:none; border:none; cursor:pointer; color:#ef4444; font-size:0.85rem; font-weight:600;">삭제</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
};

window.openMenuModal = () => {
    currentEditId = null;
    currentEditSource = 'merchant_products';

    document.getElementById('modalTitle').textContent = '신규 상품/메뉴 등록';
    document.getElementById('mName').value = '';
    document.getElementById('mDesc').value = '';
    document.getElementById('mPrice').value = '';
    document.getElementById('mImageUrl').value = '';
    document.getElementById('mType').value = 'menu';
    document.getElementById('mStatus').value = 'published';

    // 가맹점 기본값 세팅
    const mSelect = document.getElementById('mMerchantId');
    if (mSelect) {
        const filterVal = document.getElementById('filterMerchant')?.value;
        if (filterVal && filterVal !== 'ALL') {
            mSelect.value = filterVal;
        } else if (activeMerchantId && activeMerchantId !== 'ALL') {
            mSelect.value = activeMerchantId;
        } else {
            mSelect.value = '1791605366';
        }
    }

    const delBtn = document.getElementById('btnDeleteInModal');
    if (delBtn) delBtn.style.display = 'none';

    document.getElementById('btnSaveMenu').textContent = '상품 등록';
    document.getElementById('menuModal').style.display = 'flex';
};

window.editMenu = (id) => {
    const item = allProducts.find(x => x.id === id);
    if (!item) return;

    currentEditId = id;
    currentEditSource = item.source || 'merchant_products';

    document.getElementById('modalTitle').textContent = '상품 정보 수정';
    document.getElementById('mName').value = item.name;
    document.getElementById('mDesc').value = item.desc;
    document.getElementById('mPrice').value = item.price;
    document.getElementById('mImageUrl').value = item.imageUrl || '';
    document.getElementById('mType').value = item.type || 'menu';
    document.getElementById('mStatus').value = (item.status === '판매중' ? 'published' : item.status) || 'published';

    const mSelect = document.getElementById('mMerchantId');
    if (mSelect && item.merchantId) {
        mSelect.value = item.merchantId;
    }

    const delBtn = document.getElementById('btnDeleteInModal');
    if (delBtn) {
        delBtn.style.display = 'block';
        delBtn.onclick = () => window.deleteMenu(id, currentEditSource);
    }

    document.getElementById('btnSaveMenu').textContent = '수정 완료';
    document.getElementById('menuModal').style.display = 'flex';
};

document.getElementById('btnSaveMenu')?.addEventListener('click', async () => {
    const name = document.getElementById('mName').value.trim();
    if (!name) return alert('상품/메뉴명을 입력하세요.');

    const price = Number(document.getElementById('mPrice').value) || 0;
    const desc = document.getElementById('mDesc').value.trim();
    const type = document.getElementById('mType').value;
    const status = document.getElementById('mStatus').value;
    const imageUrl = document.getElementById('mImageUrl').value.trim();

    const merchantId = ERP_MERCHANT_ID;

    const saveBtn = document.getElementById('btnSaveMenu');
    saveBtn.disabled = true;
    saveBtn.textContent = '처리 중...';

    // BestClubVN & BestERP 공통 스키마 규격
    const data = {
        merchant_id: String(merchantId),
        product_name: name,
        product_type: type,
        price: price,
        description: desc,
        sale_status: status,
        image_url: imageUrl,
        updated_at: serverTimestamp()
    };

    try {
        if (currentEditId) {
            await updateDoc(doc(db, 'merchant_products', currentEditId), data);
            alert('✅ 상품 정보가 성공적으로 수정되었습니다.');
        } else {
            data.created_at = serverTimestamp();
            await addDoc(collection(db, 'merchant_products'), data);
            alert('✅ BestERP 카탈로그에 신규 상품이 등록되었습니다.\n가맹점 쇼핑몰 및 BestClubVN 통합몰(/mall.html)에 실시간 노출됩니다.');
        }
        document.getElementById('menuModal').style.display = 'none';
        await fetchProducts();
    } catch (e) {
        console.error('상품 저장 오류:', e);
        alert('저장 실패: ' + e.message);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = currentEditId ? '수정 완료' : '상품 등록';
    }
});

window.toggleStatus = async (id, isChecked, source) => {
    const newStatus = isChecked ? 'published' : 'draft';
    const targetColl = source === 'menus' ? 'menus' : 'merchant_products';

    try {
        const updatePayload = {
            sale_status: newStatus,
            status: isChecked ? '판매중' : '품절',
            updated_at: serverTimestamp()
        };
        await updateDoc(doc(db, targetColl, id), updatePayload);

        const idx = allProducts.findIndex(x => x.id === id);
        if (idx !== -1) {
            allProducts[idx].status = newStatus;
        }
        window.loadMenus();
    } catch (e) {
        alert('상태 변경 실패: ' + e.message);
        window.loadMenus();
    }
};

window.deleteMenu = async (id, source) => {
    if (!confirm('정말 이 상품을 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.')) return;

    const targetColl = source === 'menus' ? 'menus' : 'merchant_products';

    try {
        await deleteDoc(doc(db, targetColl, id));
        alert('✅ 상품이 삭제되었습니다.');
        allProducts = allProducts.filter(x => x.id !== id);
        document.getElementById('menuModal').style.display = 'none';
        window.loadMenus();
    } catch (e) {
        alert('삭제 실패: ' + e.message);
    }
};

// 권한 확인 및 초기화
checkAdminAuth(
    (user) => {
        currentUser = user;
        fetchProducts();
    },
    (errMsg) => {
        const grid = document.getElementById('menuGrid');
        if (grid) {
            grid.innerHTML = `<p style="color:#ef4444; padding:3rem; grid-column:1/-1; text-align:center;">${escapeHtml(errMsg || '로그인이 필요한 화면입니다.')}</p>`;
        }
    }
);
