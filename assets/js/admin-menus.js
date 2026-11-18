import { db, auth } from './firebase-config.js';
import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    getDoc,
    serverTimestamp
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const SUPER_ADMIN_EMAILS = ['daguri75@gmail.com'];
let isSuperAdmin = false;
let activeMerchantId = 'ALL';
let editingDocId = null;
let editingSourceCollection = 'merchant_products';
let cachedItems = [];
let dynamicMerchantNames = {};

const KNOWN_MERCHANT_ALIASES = {
    "1794710386": ["1794710386", "baekje_galbi", "baekjegalbi", "baekje"],
    "baekje_galbi": ["1794710386", "baekje_galbi", "baekjegalbi", "baekje"],
    "1791605366": ["1791605366", "bestwinner", "best_winner"],
    "bestwinner": ["1791605366", "bestwinner", "best_winner"],
    "1791002036": ["1791002036", "daehankimchi", "daehan_kimchi"],
    "daehankimchi": ["1791002036", "daehankimchi", "daehan_kimchi"],
    "1793671043": ["1793671043", "bestmario", "best_mario"],
    "1793776651": ["1793776651", "sunvietnam", "sun_vietnam"]
};

function normalizeMerchantId(id) {
    const s = String(id || '').trim();
    if (s === 'baekje_galbi' || s === 'baekjegalbi' || s === 'baekje') return '1794710386';
    if (s === 'bestwinner' || s === 'best_winner') return '1791605366';
    if (s === 'daehankimchi' || s === 'daehan_kimchi') return '1791002036';
    return s;
}

function getMerchantName(id) {
    const s = String(id || '').trim();
    const norm = normalizeMerchantId(s);
    if (norm === '1794710386') return '백제갈비';
    if (norm === '1791605366') return '베스트위너';
    if (norm === '1791002036') return '대한김치';
    if (norm === '1793671043') return '베스트마리오';
    if (norm === '1793776651') return 'sunvietnam';
    if (dynamicMerchantNames[norm]) return dynamicMerchantNames[norm];
    if (dynamicMerchantNames[s]) return dynamicMerchantNames[s];
    return s || '미지정';
}

function matchesMerchant(docMerchantId, selectedFilter) {
    if (!selectedFilter || selectedFilter === 'ALL') return true;
    const target = String(docMerchantId || '').trim();
    const filter = String(selectedFilter || '').trim();
    if (target === filter) return true;
    if (normalizeMerchantId(target) === normalizeMerchantId(filter)) return true;
    const aliases = KNOWN_MERCHANT_ALIASES[filter] || KNOWN_MERCHANT_ALIASES[normalizeMerchantId(filter)];
    if (aliases && aliases.includes(target)) return true;
    return false;
}

function getTypeLabel(type) {
    switch (type) {
        case 'menu': return '🍽️ 메뉴(F&B)';
        case 'physical_product': return '📦 실물상품';
        case 'service': return '🎫 서비스/티켓';
        case 'booking': return '📅 예약형';
        default: return '📦 일반상품';
    }
}

function getStatusBadge(status) {
    switch (status) {
        case 'published':
            return `<span style="font-size:0.72rem; background:#dcfce7; color:#15803d; padding:0.2rem 0.5rem; border-radius:999px; font-weight:700;">판매중</span>`;
        case 'draft':
            return `<span style="font-size:0.72rem; background:#f1f5f9; color:#475569; padding:0.2rem 0.5rem; border-radius:999px; font-weight:700;">임시저장</span>`;
        case 'sold_out':
            return `<span style="font-size:0.72rem; background:#fee2e2; color:#b91c1c; padding:0.2rem 0.5rem; border-radius:999px; font-weight:700;">품절</span>`;
        default:
            return `<span style="font-size:0.72rem; background:#dcfce7; color:#15803d; padding:0.2rem 0.5rem; border-radius:999px; font-weight:700;">판매중</span>`;
    }
}

async function syncMerchantsDropdown() {
    try {
        const snap = await getDocs(collection(db, "merchants"));
        const filterEl = document.getElementById('filterMerchant');
        const modalEl = document.getElementById('mMerchantId');
        snap.forEach(d => {
            const data = d.data() || {};
            const id = String(data.merchantId || d.id).trim();
            const name = String(data.name || id).trim();
            if (!id) return;
            dynamicMerchantNames[id] = name;
            [filterEl, modalEl].forEach(sel => {
                if (!sel) return;
                const exists = Array.from(sel.options).some(opt => opt.value === id);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = id;
                    opt.textContent = `🏪 ${name} (${id})`;
                    sel.appendChild(opt);
                }
            });
        });
    } catch (e) {
        console.warn("merchants 컬렉션 로드 건너뜀:", e.message);
    }
}

function updateCategoryFilterOptions() {
    const catSelect = document.getElementById('filterCategory');
    if (!catSelect) return;
    const prevValue = catSelect.value || 'ALL';
    const categories = new Set();

    cachedItems.forEach(item => {
        if (activeMerchantId !== 'ALL' && !matchesMerchant(item.merchantId, activeMerchantId)) return;
        const cat = String(item.category || '').trim();
        if (cat) categories.add(cat);
    });

    catSelect.innerHTML = `<option value="ALL">전체 세부 카테고리 (${categories.size})</option>`;
    Array.from(categories).sort((a, b) => a.localeCompare(b, 'ko')).forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });

    if (Array.from(catSelect.options).some(o => o.value === prevValue)) {
        catSelect.value = prevValue;
    } else {
        catSelect.value = 'ALL';
    }
}

window.onMerchantFilterChange = function (val) {
    activeMerchantId = val || 'ALL';
    const modalSelect = document.getElementById('mMerchantId');
    if (modalSelect && activeMerchantId !== 'ALL') {
        modalSelect.value = normalizeMerchantId(activeMerchantId);
    }
    updateCategoryFilterOptions();
    loadMenus(false);
};

onAuthStateChanged(auth, async (user) => {
    const email = (user?.email || '').toLowerCase();
    isSuperAdmin = SUPER_ADMIN_EMAILS.includes(email) || window.tenantId === 'system_master';

    await syncMerchantsDropdown();

    const urlMerchant = new URLSearchParams(window.location.search).get('merchant');
    let resolvedTenant = window.tenantId;

    // 만약 일반 가맹점 계정으로 로그인했는데 window.tenantId가 아직 기본값이면 users/{uid}에서 가맹점 ID 확인
    if (user && (!resolvedTenant || resolvedTenant === '1791605366') && !isSuperAdmin) {
        try {
            const uSnap = await getDoc(doc(db, "users", user.uid));
            if (uSnap.exists() && uSnap.data().merchantId) {
                resolvedTenant = String(uSnap.data().merchantId);
                window.tenantId = resolvedTenant;
            }
        } catch (_) { /* ignore */ }
    }

    const filterEl = document.getElementById('filterMerchant');
    const modalMerchantRow = document.getElementById('modalMerchantRow');
    const modalMerchantSelect = document.getElementById('mMerchantId');

    if (urlMerchant) {
        activeMerchantId = normalizeMerchantId(urlMerchant);
    } else if (isSuperAdmin) {
        activeMerchantId = 'ALL';
    } else if (resolvedTenant && resolvedTenant !== 'system_master') {
        activeMerchantId = normalizeMerchantId(resolvedTenant);
    } else {
        activeMerchantId = 'ALL';
    }

    if (filterEl) {
        filterEl.style.display = 'inline-block';
        if (Array.from(filterEl.options).some(o => o.value === activeMerchantId)) {
            filterEl.value = activeMerchantId;
        } else {
            filterEl.value = 'ALL';
        }
    }
    if (modalMerchantRow) {
        modalMerchantRow.style.display = 'block';
    }
    if (modalMerchantSelect && activeMerchantId !== 'ALL') {
        modalMerchantSelect.value = activeMerchantId;
    }

    loadMenus(true);
});

async function fetchAllCatalogItems() {
    const itemsMap = new Map();

    // 1. 주 컬렉션: merchant_products (BestClubVN 및 백제갈비 공식 연동 컬렉션)
    try {
        const mpSnap = await getDocs(collection(db, "merchant_products"));
        mpSnap.forEach((docSnap) => {
            const d = docSnap.data();
            const mId = normalizeMerchantId(d.merchant_id || d.merchantId || '1791605366');
            const name = d.product_name || d.name || '이름 없음';
            const imageUrl = (Array.isArray(d.images) && d.images.length > 0) ? d.images[0] : (d.imageUrl || d.image || '');
            itemsMap.set(docSnap.id, {
                id: docSnap.id,
                sourceCollection: 'merchant_products',
                merchantId: mId,
                name: name,
                nameVi: d.product_name_vi || '',
                menuCode: d.menu_code || '',
                category: d.category || '',
                type: d.product_type || (d.category ? 'menu' : 'physical_product'),
                price: Number(d.price) || 0,
                status: d.sale_status || 'published',
                description: d.description || '',
                imageUrl: imageUrl,
                salesChannel: ['in_store', 'online', 'both'].includes(d.sales_channel) ? d.sales_channel : 'both',
                inventory: d.inventory ?? 999
            });
        });
    } catch (e) {
        console.warn("merchant_products 조회 실패:", e);
    }

    // 2. 레거시 컬렉션: menus (하위 호환)
    try {
        const legacySnap = await getDocs(collection(db, "menus"));
        legacySnap.forEach((docSnap) => {
            if (itemsMap.has(docSnap.id)) return;
            const d = docSnap.data();
            const mId = normalizeMerchantId(d.merchantId || d.merchant_id || '1791605366');
            itemsMap.set(docSnap.id, {
                id: docSnap.id,
                sourceCollection: 'menus',
                merchantId: mId,
                name: d.name || d.product_name || '이름 없음',
                nameVi: d.product_name_vi || '',
                menuCode: d.menu_code || '',
                category: d.category || '',
                type: d.product_type || 'menu',
                price: Number(d.price) || 0,
                status: d.sale_status || 'published',
                description: d.description || '',
                imageUrl: d.imageUrl || (Array.isArray(d.images) && d.images[0]) || '',
                inventory: d.inventory ?? 999
            });
        });
    } catch (e) {
        console.warn("menus 레거시 조회 건너뜀:", e.message);
    }

    return Array.from(itemsMap.values());
}

window.loadMenus = async function (forceRefresh = false) {
    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    const filterEl = document.getElementById('filterMerchant');
    if (filterEl && filterEl.value) {
        activeMerchantId = filterEl.value;
    }
    const typeFilter = document.getElementById('filterType')?.value || 'ALL';
    const categoryFilter = document.getElementById('filterCategory')?.value || 'ALL';
    const statusFilter = document.getElementById('filterStatus')?.value || 'ALL';
    const searchKeyword = (document.getElementById('filterSearch')?.value || '').trim().toLowerCase();

    try {
        if (forceRefresh || cachedItems.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:3rem; color:#64748b;">데이터를 불러오는 중...</div>`;
            cachedItems = await fetchAllCatalogItems();
            updateCategoryFilterOptions();
        }

        const filtered = cachedItems.filter(item => {
            if (activeMerchantId !== 'ALL' && !matchesMerchant(item.merchantId, activeMerchantId)) {
                return false;
            }
            if (typeFilter !== 'ALL' && item.type !== typeFilter) {
                return false;
            }
            if (categoryFilter !== 'ALL' && String(item.category || '').trim() !== categoryFilter) {
                return false;
            }
            if (statusFilter !== 'ALL' && item.status !== statusFilter) {
                return false;
            }
            if (searchKeyword) {
                const hay = `${item.name} ${item.nameVi || ''} ${item.category || ''} ${item.description} ${item.merchantId} ${getMerchantName(item.merchantId)}`.toLowerCase();
                if (!hay.includes(searchKeyword)) return false;
            }
            return true;
        });

        // 백제갈비 등 메뉴 코드 순 + 가맹점별 깔끔한 정렬
        filtered.sort((a, b) => {
            if (a.merchantId !== b.merchantId) {
                if (a.merchantId === '1794710386') return -1;
                if (b.merchantId === '1794710386') return 1;
            }
            return String(a.name || '').localeCompare(String(b.name || ''), 'ko');
        });

        grid.innerHTML = '';

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color:#94a3b8;">
                조건에 맞는 등록된 상품/메뉴가 없습니다. 우측 상단 <b>[+ 신규 상품/메뉴 등록]</b> 버튼으로 추가해 보세요.
            </div>`;
            return;
        }

        filtered.forEach((item) => {
            const card = document.createElement('div');
            card.className = 'menu-card';

            const imgHtml = item.imageUrl
                ? `<div class="menu-img" style="background-image: url('${item.imageUrl}'); background-size: cover; background-position: center;"></div>`
                : `<div class="menu-img">🍽️ 이미지 없음</div>`;

            const merchantBadge = `<span style="font-size:0.7rem; background:#e0e7ff; color:#3730a3; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:700;">🏪 ${getMerchantName(item.merchantId)} (${item.merchantId})</span>`;
            const CH = { in_store: ['🏬 매장 전용', '#9a3412', '#ffedd5'], online: ['📦 온라인 전용', '#1e40af', '#dbeafe'], both: ['🏬+🌐 매장·온라인', '#166534', '#dcfce7'] };
            const ch = CH[item.salesChannel] || CH.both;
            const channelBadge = item.sourceCollection === 'merchant_products'
                ? `<span style="font-size:0.7rem; background:${ch[2]}; color:${ch[1]}; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:700;">${ch[0]}</span>`
                : '';
            const categoryBadge = item.category
                ? `<span style="font-size:0.7rem; background:#fef3c7; color:#92400e; padding:0.15rem 0.45rem; border-radius:0.25rem; font-weight:700;">📂 ${item.category}</span>`
                : '';

            card.innerHTML = `
                ${imgHtml}
                <div class="menu-body">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.4rem; margin-bottom:0.4rem; flex-wrap:wrap;">
                        <span style="font-size:0.75rem; background:#eef2ff; color:#4F46E5; padding:0.2rem 0.5rem; border-radius:0.25rem; font-weight:700;">${getTypeLabel(item.type)}</span>
                        ${getStatusBadge(item.status)}
                    </div>
                    <div style="margin-bottom:0.45rem; display:flex; gap:0.35rem; flex-wrap:wrap;">${merchantBadge}${categoryBadge}${channelBadge}</div>
                    <h3 class="menu-title">${item.name}</h3>
                    ${item.nameVi ? `<div style="font-size:0.8rem; color:#b45309; font-weight:600; margin-bottom:0.35rem;">🇻🇳 ${item.nameVi}</div>` : ''}
                    <p class="menu-desc">${item.description || '상세 설명이 없습니다.'}</p>
                    <div class="menu-footer">
                        <span class="menu-price">${Number(item.price).toLocaleString()} VND</span>
                        <div style="display:flex; gap:0.35rem;">
                            <button onclick="editItem('${item.id}')" style="background:#e0e7ff; color:#4338ca; border:none; padding:0.4rem 0.75rem; border-radius:0.4rem; cursor:pointer; font-weight:600; font-size:0.82rem;">✏️ 수정</button>
                            <button onclick="deleteMenu('${item.id}', '${item.sourceCollection}')" style="background:#fee2e2; color:#ef4444; border:none; padding:0.4rem 0.75rem; border-radius:0.4rem; cursor:pointer; font-weight:600; font-size:0.82rem;">삭제</button>
                        </div>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error loading menus:", error);
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:2rem; color:#ef4444;">데이터 로드 오류: ${error.message}</div>`;
    }
};

window.openMenuModal = function () {
    editingDocId = null;
    editingSourceCollection = 'merchant_products';
    document.getElementById('modalTitle').textContent = '신규 상품/메뉴 등록';
    document.getElementById('mType').value = 'menu';
    const catInput = document.getElementById('mCategory');
    if (catInput) catInput.value = '';
    document.getElementById('mName').value = '';
    document.getElementById('mImageUrl').value = '';
    document.getElementById('mDesc').value = '';
    document.getElementById('mPrice').value = '';
    document.getElementById('mStatus').value = 'published';
    const chNew = document.getElementById('mSalesChannel');
    if (chNew) chNew.value = 'both';

    const mSelect = document.getElementById('mMerchantId');
    if (mSelect) {
        const targetM = (activeMerchantId && activeMerchantId !== 'ALL')
            ? normalizeMerchantId(activeMerchantId)
            : '1794710386';
        mSelect.value = targetM;
    }

    const delBtn = document.getElementById('btnDeleteInModal');
    if (delBtn) delBtn.style.display = 'none';

    document.getElementById('menuModal').style.display = 'flex';
};

window.editItem = function (id) {
    const item = cachedItems.find(x => x.id === id);
    if (!item) return;

    editingDocId = item.id;
    editingSourceCollection = item.sourceCollection || 'merchant_products';

    document.getElementById('modalTitle').textContent = '상품/메뉴 수정';
    document.getElementById('mType').value = item.type || 'menu';
    const catInput = document.getElementById('mCategory');
    if (catInput) catInput.value = item.category || '';
    document.getElementById('mName').value = item.name || '';
    document.getElementById('mImageUrl').value = item.imageUrl || '';
    document.getElementById('mDesc').value = item.description || '';
    document.getElementById('mPrice').value = item.price || 0;
    document.getElementById('mStatus').value = item.status || 'published';
    const chEdit = document.getElementById('mSalesChannel');
    if (chEdit) chEdit.value = item.salesChannel || 'both';

    const mSelect = document.getElementById('mMerchantId');
    if (mSelect) {
        const normId = normalizeMerchantId(item.merchantId);
        if (!Array.from(mSelect.options).some(opt => opt.value === normId)) {
            const opt = document.createElement('option');
            opt.value = normId;
            opt.textContent = `${getMerchantName(normId)} (${normId})`;
            mSelect.appendChild(opt);
        }
        mSelect.value = normId;
    }

    const delBtn = document.getElementById('btnDeleteInModal');
    if (delBtn) {
        delBtn.style.display = 'inline-block';
        delBtn.onclick = async () => {
            await window.deleteMenu(item.id, editingSourceCollection);
            document.getElementById('menuModal').style.display = 'none';
        };
    }

    document.getElementById('menuModal').style.display = 'flex';
};

document.getElementById('btnSaveMenu')?.addEventListener('click', async () => {
    const type = document.getElementById('mType').value || 'menu';
    const category = (document.getElementById('mCategory')?.value || '').trim();
    const name = document.getElementById('mName').value.trim();
    const imageUrl = document.getElementById('mImageUrl').value.trim();
    const desc = document.getElementById('mDesc').value.trim();
    const price = parseInt(document.getElementById('mPrice').value, 10) || 0;
    const status = document.getElementById('mStatus').value || 'published';
    const salesChannelRaw = document.getElementById('mSalesChannel')?.value || 'both';
    const salesChannel = ['in_store', 'online', 'both'].includes(salesChannelRaw) ? salesChannelRaw : 'both';

    if (!name || price <= 0) {
        alert("상품/메뉴명과 판매가(VND)를 올바르게 입력해주세요.");
        return;
    }

    const selectedMerchant = document.getElementById('mMerchantId')?.value
        || (activeMerchantId !== 'ALL' ? activeMerchantId : '1794710386');
    const merchantId = normalizeMerchantId(selectedMerchant);

    const payload = {
        merchant_id: String(merchantId),
        merchantId: String(merchantId),
        merchant_name: getMerchantName(merchantId),
        product_name: name,
        category: category,
        product_type: type,
        price: price,
        currency: 'VND',
        inventory: 999,
        sale_status: status,
        sales_channel: salesChannel,
        description: desc,
        images: imageUrl ? [imageUrl] : [],
        updated_at: serverTimestamp()
    };

    const btn = document.getElementById('btnSaveMenu');
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '저장 중...';

    try {
        if (editingDocId) {
            if (editingSourceCollection === 'merchant_products') {
                await updateDoc(doc(db, "merchant_products", editingDocId), payload);
            } else {
                await addDoc(collection(db, "merchant_products"), {
                    ...payload,
                    created_at: serverTimestamp()
                });
                await deleteDoc(doc(db, "menus", editingDocId));
            }
        } else {
            await addDoc(collection(db, "merchant_products"), {
                ...payload,
                created_at: serverTimestamp()
            });
        }

        document.getElementById('menuModal').style.display = 'none';
        await loadMenus(true);
    } catch (e) {
        console.error("Save error:", e);
        alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
        btn.disabled = false;
        btn.textContent = origText;
    }
});

window.deleteMenu = async function (id, sourceCollection = 'merchant_products') {
    if (!confirm("정말 이 상품/메뉴를 삭제하시겠습니까?\n삭제 시 가맹점 홈페이지 및 BestClubVN 쇼핑몰에서도 즉시 제거됩니다.")) return;
    try {
        await deleteDoc(doc(db, sourceCollection, id));
        if (sourceCollection === 'merchant_products') {
            try { await deleteDoc(doc(db, "menus", id)); } catch (_) { /* ignore */ }
        }
        await loadMenus(true);
    } catch (e) {
        alert("삭제 실패: " + e.message);
    }
};
