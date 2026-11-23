import { db, auth } from './firebase-config.js';
import { collection, doc, getDocs } from 'firebase/firestore';

export const TENANT_MAP = {
    '1791605366': { slug: 'bestwinner', name: 'BEST WINNER', email: 'hexttokenopbnb@gmail.com' },
    '1794710386': { slug: 'baekje', name: '백제갈비', email: 'bestwinner167@gmail.com' },
    '1791002036': { slug: 'daehankimchi', name: '대한김치', email: 'kfu134252@gmail.com' },
    '1793671043': { slug: 'bestmario', name: '베스트마리오' },
    '1793776651': { slug: 'sunvietnam', name: 'sunvietnam' }
};

export const SLUG_TO_TENANT = {
    'bestwinner': '1791605366',
    'baekje': '1794710386',
    'daehankimchi': '1791002036',
    'bestmario': '1793671043',
    'sunvietnam': '1793776651'
};

let _dynamicLoaded = false;

/**
 * Firestore `merchants` 컬렉션에서 신규 SaaS 가맹점을 동적으로 로드해 TENANT_MAP에 등록합니다.
 */
export async function loadDynamicTenants() {
    if (_dynamicLoaded) return TENANT_MAP;
    try {
        const snap = await getDocs(collection(db, 'merchants'));
        snap.forEach((d) => {
            const id = String(d.id);
            const data = d.data() || {};
            const slug = String(data.slug || id).toLowerCase().replace(/[^a-z0-9_-]/g, '') || id;
            const name = data.name || data.storeName || TENANT_MAP[id]?.name || `가맹점 ${id}`;
            TENANT_MAP[id] = {
                ...(TENANT_MAP[id] || {}),
                slug,
                name,
                email: (data.ownerEmail || TENANT_MAP[id]?.email || '').toLowerCase(),
                plan: data.saasPlan || 'starter',
            };
            SLUG_TO_TENANT[slug] = id;
        });
        _dynamicLoaded = true;
    } catch (e) {
        console.warn('loadDynamicTenants warning:', e?.message || e);
    }
    return TENANT_MAP;
}

export function isSuperAdminUser() {
    const email = (auth.currentUser?.email || window.currentUserEmail || '').toLowerCase().trim();
    const role = (window.currentUserRole || '').toUpperCase();
    return email === 'daguri75@gmail.com' || role === 'SUPER_ADMIN' || window.tenantId === 'system_master';
}

export function getCurrentStoreInfo() {
    const isSuper = isSuperAdminUser();
    const params = new URLSearchParams(window.location.search);
    const storeParam = (params.get('store') || params.get('m') || '').toLowerCase().trim();

    // 1. If Super Admin, allow URL param or dropdown selector to switch stores
    if (isSuper) {
        const filterSelect = document.getElementById('filterMerchant');
        let selectedId = '';

        if (storeParam) {
            selectedId = SLUG_TO_TENANT[storeParam] || (TENANT_MAP[storeParam] ? storeParam : (storeParam === 'all' ? 'ALL' : storeParam));
            if (filterSelect && selectedId && filterSelect.value !== selectedId) {
                filterSelect.value = selectedId;
            }
        } else if (filterSelect && filterSelect.value) {
            selectedId = filterSelect.value;
        }

        if (!selectedId) {
            selectedId = '1791605366'; // Default workspace view for Super Admin
        }

        const info = TENANT_MAP[selectedId] || { slug: selectedId === 'ALL' ? 'all' : selectedId, name: window.currentStoreName || '가맹점' };
        syncUrlStoreSlug(info.slug);
        return { storeId: selectedId, ...info };
    }

    // 2. Regular Franchise User: Strictly enforce tenant ID from auth session (NEVER fallback to another store!)
    let myTenantId = String(window.tenantId || '').trim();
    const userEmail = (auth.currentUser?.email || window.currentUserEmail || '').toLowerCase().trim();

    if (userEmail === 'bestwinner167@gmail.com') {
        myTenantId = '1794710386'; // 백제갈비
    } else if (userEmail === 'hexttokenopbnb@gmail.com') {
        myTenantId = '1791605366'; // 베스트위너
    } else if (userEmail === 'kfu134252@gmail.com') {
        myTenantId = '1791002036'; // 대한김치
    }

    // [SECURITY] 미소속/미개설 계정이 타 가맹점(1791605366) 데이터로 폴백되지 않도록 빈 문자열 유지
    if (!myTenantId || myTenantId === 'undefined' || myTenantId === 'null' || myTenantId === 'system_master') {
        return { storeId: '', slug: '', name: '미개설 가맹점', unlinked: true };
    }

    const info = TENANT_MAP[myTenantId] || { slug: myTenantId, name: window.currentStoreName || '가맹점' };

    // Enforce URL slug matching user's store
    syncUrlStoreSlug(info.slug);

    return { storeId: myTenantId, ...info };
}

export function syncUrlStoreSlug(slug) {
    if (!slug) return;
    try {
        const url = new URL(window.location.href);
        const currentParam = url.searchParams.get('store');
        if (currentParam !== slug) {
            url.searchParams.set('store', slug);
            window.history.replaceState({}, '', url.toString());
        }
    } catch (e) {
        // Silently ignore if URL manipulation fails in restricted environments
    }
}

export function getStoreSubcollection(collectionName, explicitStoreId) {
    const sId = explicitStoreId || getCurrentStoreInfo().storeId;
    if (!sId) throw new Error('가맹점 워크스페이스가 연결되어 있지 않습니다. 온보딩을 먼저 완료해 주세요.');
    return collection(db, 'merchants', sId, collectionName);
}

export function getStoreDocRef(collectionName, docId, explicitStoreId) {
    const sId = explicitStoreId || getCurrentStoreInfo().storeId;
    if (!sId) throw new Error('가맹점 워크스페이스가 연결되어 있지 않습니다. 온보딩을 먼저 완료해 주세요.');
    return doc(db, 'merchants', sId, collectionName, docId);
}
