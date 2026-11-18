import { db, auth, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, setDoc, deleteDoc, getDocs, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { scanReceiptAI } from './aiApi.js';

import { getCurrentStoreInfo, getStoreSubcollection, getStoreDocRef, TENANT_MAP, isSuperAdminUser } from './tenant-router.js';

function getCurrentStoreId() {
    return getCurrentStoreInfo().storeId;
}

function getStoreFinanceCollection(storeId) {
    return getStoreSubcollection('financeRecords', storeId);
}

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

// Receipt OCR elements
const openReceiptOcrBtn = document.getElementById('openReceiptOcrBtn');
const receiptFileInput = document.getElementById('receiptFileInput');
const receiptPreviewBox = document.getElementById('receiptPreviewBox');
const receiptThumbImg = document.getElementById('receiptThumbImg');
const receiptOcrBadge = document.getElementById('receiptOcrBadge');
const receiptFileName = document.getElementById('receiptFileName');
const receiptItemSummaryText = document.getElementById('receiptItemSummaryText');
const receiptOcrProgress = document.getElementById('receiptOcrProgress');
const btnRemoveReceipt = document.getElementById('btnRemoveReceipt');

let currentReceiptDataUrl = '';
let currentReceiptMimeType = 'image/jpeg';
let currentReceiptItems = [];

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

const finRegistrantInput = document.getElementById('finRegistrant');
const finSpenderInput = document.getElementById('finSpender');
const spenderAutoBadge = document.getElementById('spenderAutoBadge');

function getDefaultRegistrantName() {
    const email = (auth.currentUser?.email || window.currentUserEmail || '').trim();
    const emailLower = email.toLowerCase();
    if (emailLower === 'daguri75@gmail.com') return '최철웅 (daguri75@gmail.com)';
    if (emailLower === 'hexttokenopbnb@gmail.com') return 'BEST WINNER 대표 (hexttokenopbnb@gmail.com)';
    if (emailLower === 'bestwinner167@gmail.com') return '백제갈비 대표 (bestwinner167@gmail.com)';
    if (emailLower === 'kfu134252@gmail.com') return '대한김치 대표 (kfu134252@gmail.com)';

    const rawName = (window.currentUserName || auth.currentUser?.displayName || '').trim();
    const cleanName = (rawName && rawName !== 'Winner Best') ? rawName : '';
    if (cleanName && email) return `${cleanName} (${email})`;
    if (cleanName) return cleanName;
    if (email) return email;
    return window.currentStoreName ? `${window.currentStoreName} 담당자` : '관리자';
}

function getResolvedRegistrantAndSpender() {
    const rawReg = (finRegistrantInput?.value || '').trim();
    const registrant = rawReg || getDefaultRegistrantName();
    const rawSpender = (finSpenderInput?.value || '').trim();
    // 지출자를 별도 입력하지 않을 경우 등록자가 지출자로 자동 등록
    const spender = rawSpender || registrant;
    return { registrant, spender, isSpenderSeparate: Boolean(rawSpender && rawSpender !== registrant) };
}

function syncSpenderBadgeUI() {
    const { registrant, spender, isSpenderSeparate } = getResolvedRegistrantAndSpender();
    if (finSpenderInput) {
        finSpenderInput.placeholder = `미입력 시 '${registrant}'(등록자)로 자동 등록`;
    }
    if (spenderAutoBadge) {
        if (isSpenderSeparate) {
            spenderAutoBadge.textContent = `지출자 별도 지정: ${spender}`;
            spenderAutoBadge.style.background = '#DBEAFE';
            spenderAutoBadge.style.color = '#1E40AF';
        } else {
            spenderAutoBadge.textContent = '미입력 시 등록자로 자동 등록';
            spenderAutoBadge.style.background = '#ECFDF5';
            spenderAutoBadge.style.color = '#047857';
        }
    }
}

if (finRegistrantInput) {
    finRegistrantInput.addEventListener('input', syncSpenderBadgeUI);
}
if (finSpenderInput) {
    finSpenderInput.addEventListener('input', syncSpenderBadgeUI);
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
    if (finRegistrantInput && !finRegistrantInput.value.trim()) {
        finRegistrantInput.value = getDefaultRegistrantName();
    }
    syncSpenderBadgeUI();
    modal.style.display = 'flex';
    setType('INCOME');
    updateAmountPreview(amountInput ? amountInput.value : 0);
    setTimeout(() => {
        if (amountInput) amountInput.focus();
    }, 100);
}

function closeModal() {
    modal.style.display = 'none';
    clearReceiptPreview();
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
    const sums = {
        INCOME: 0,
        EXPENSE: 0,
        RECEIVABLE: 0,
        PAYABLE: 0
    };
    let html = '';

    try {
        const isSuper = isSuperAdminUser();
        const curStoreInfo = getCurrentStoreInfo();
        const curStoreId = curStoreInfo.storeId;
        const filterSelect = document.getElementById('filterMerchant');

        // 🚨 ABSOLUTE MULTI-TENANT ISOLATION:
        // selectedMerchant is ONLY valid for Super Admin!
        // Regular Franchise Users (e.g. Daehan Kimchi CEO) CANNOT view 'ALL' or other stores!
        const selectedMerchant = isSuper ? (filterSelect && filterSelect.value ? filterSelect.value : curStoreId) : curStoreId;
        const targetStoreId = isSuper ? ((selectedMerchant && selectedMerchant !== 'ALL') ? selectedMerchant : curStoreId) : curStoreId;
        const targetInfo = TENANT_MAP[targetStoreId] || curStoreInfo;

        const recordMap = new Map();

        const addRecordDoc = (d, defaultStoreName = '') => {
            if (!d) return;
            const data = d.data ? d.data() : d;
            const id = d.id || data.id;
            if (!id || recordMap.has(id)) return;

            // 🚨 STRICT DATA BOUNDARY: Reject foreign store records if not Super Admin
            if (!isSuper) {
                const recTenant = String(data.tenantId || data.merchantId || '').trim();
                const recStoreName = String(data.storeName || '').trim();
                if (recTenant && recTenant !== targetStoreId) return;
                if (targetStoreId === '1791002036' && (recTenant === '1791605366' || recStoreName === 'BEST WINNER')) return;
                if (targetStoreId === '1791605366' && (recTenant === '1791002036' || recStoreName.includes('대한김치'))) return;
            }

            recordMap.set(id, {
                id: id,
                ...data,
                storeName: data.storeName || defaultStoreName || targetInfo.name || '가맹점'
            });
        };

        if (isSuper && selectedMerchant === 'ALL') {
            // Super Admin ALL mode: load across all franchise stores
            const storeIds = ['1791605366', '1794710386', '1791002036', '1793671043', '1793776651'];
            for (const sId of storeIds) {
                try {
                    const snap = await getDocs(collection(db, 'merchants', sId, 'financeRecords'));
                    snap.forEach(d => addRecordDoc(d, TENANT_MAP[sId]?.name));
                } catch (e) {
                    console.warn(`Fetch error for store ${sId}:`, e);
                }
            }
        } else {
            // 🚨 STRICT ISOLATED STORE SUBCOLLECTION:
            // Load ONLY from merchants/{targetStoreId}/financeRecords
            try {
                const storeRef = collection(db, 'merchants', targetStoreId, 'financeRecords');
                const snap = await getDocs(storeRef);
                for (const d of snap.docs) {
                    const data = d.data();
                    const dTenant = String(data.tenantId || data.merchantId || '').trim();
                    const dStoreName = String(data.storeName || '').trim();

                    // 🚨 SPECIFIC PURGE FOR DAEHAN KIMCHI (1791002036):
                    // "이 지출내역 및 영수증은 대한김치 ceo가 등록한게 아니다. 대한김치측에서는 모두 삭제해"
                    // Delete any record not created by Daehan Kimchi CEO (kfu134252@gmail.com)
                    if (targetStoreId === '1791002036') {
                        const isErroneousRecord = (
                            data.partner === 'CÔNG TY CP INFINIS' ||
                            data.partner === 'AEON' ||
                            String(data.memo || '').includes('김치류') ||
                            String(data.memo || '').includes('SDA 333') ||
                            (data.createdBy && data.createdBy !== 'kfu134252@gmail.com') ||
                            !data.createdBy
                        );
                        if (isErroneousRecord) {
                            console.warn(`[PURGING ERRONEOUS RECORD FROM DAEHAN KIMCHI] ${d.id}`);
                            try {
                                await deleteDoc(doc(db, 'merchants', '1791002036', 'financeRecords', d.id));
                            } catch (delErr) {
                                console.error('Purge error:', delErr);
                            }
                            continue; // DO NOT DISPLAY!
                        }
                    }

                    // 🚨 SANITIZATION: Purge any foreign store record that was erroneously synced here in the past
                    if (dTenant && dTenant !== targetStoreId) {
                        console.warn(`[DATA ISOLATION PURGE] Removing foreign store record ${d.id} (tenant ${dTenant}) from store ${targetStoreId}`);
                        try {
                            await deleteDoc(doc(db, 'merchants', targetStoreId, 'financeRecords', d.id));
                        } catch (delErr) {}
                        continue; // Exclude from display
                    }

                    if (targetStoreId === '1791002036' && (dStoreName === 'BEST WINNER' || dTenant === '1791605366')) {
                        console.warn(`[DATA ISOLATION PURGE] Removing Best Winner record ${d.id} from Daehan Kimchi`);
                        try {
                            await deleteDoc(doc(db, 'merchants', targetStoreId, 'financeRecords', d.id));
                        } catch (delErr) {}
                        continue;
                    }

                    addRecordDoc(d, targetInfo.name);
                }
            } catch (e) {
                console.warn('Store financeRecords error:', e);
            }
        }

        // 3-B. 📱 QR 결제 매출 (transactions: pay_merchant, receive_bt) & 쇼핑몰 주문 매출 (merchant_orders) 자동 합산
        const STORE_ALIASES = {
            '1791605366': ['1791605366', 'bestwinner', 'best_winner'],
            '1794710386': ['1794710386', 'baekje_galbi', 'baekjegalbi'],
            '1791002036': ['1791002036', 'daehan_kimchi', 'daehankimchi'],
            '1793671043': ['1793671043', 'best_mario', 'bestmario'],
            '1793776651': ['1793776651', 'sunvietnam']
        };
        const normalizeStoreId = (rawId) => {
            const s = String(rawId || '').trim();
            for (const [canon, list] of Object.entries(STORE_ALIASES)) {
                if (list.includes(s)) return canon;
            }
            return s;
        };
        const matchesTargetStore = (rawId) => {
            if (isSuper && selectedMerchant === 'ALL') return true;
            const norm = normalizeStoreId(rawId);
            return norm && norm === targetStoreId;
        };
        const toDateString = (ts) => {
            try {
                if (!ts) return new Date().toISOString().slice(0, 10);
                if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(ts)) return ts.slice(0, 10);
                const d = ts.toDate ? ts.toDate() : (ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts));
                if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
                return d.toISOString().slice(0, 10);
            } catch (_) {
                return new Date().toISOString().slice(0, 10);
            }
        };

        try {
            const [qrTxSnap, ordersSnap] = await Promise.all([
                getDocs(query(collection(db, 'transactions'), where('type', 'in', ['pay_merchant', 'receive_bt']))).catch(() => ({ docs: [] })),
                getDocs(collection(db, 'merchant_orders')).catch(() => ({ docs: [] }))
            ]);

            const seenQrTxHashes = new Set();
            const pendingQrRecords = [];
            const uidsToLookup = new Set();

            (qrTxSnap.docs || []).forEach(docSnap => {
                const tx = docSnap.data() || {};
                if (!matchesTargetStore(tx.merchantId)) return;

                const amountVnd = Number(tx.amountVnd || (tx.amountKrw ? Math.round(Number(tx.amountKrw) * 18) : 0));
                if (!amountVnd || amountVnd <= 0) return;

                const txKey = String(tx.txHash || tx.rewardId || docSnap.id);
                if (seenQrTxHashes.has(txKey) || recordMap.has(`QR_${txKey}`)) return;
                seenQrTxHashes.add(txKey);

                const buyerUid = String(tx.uid || tx.buyerUid || '').trim();
                if (buyerUid) uidsToLookup.add(buyerUid);

                pendingQrRecords.push({
                    docId: `qr_tx_${txKey}`,
                    txKey,
                    tx,
                    buyerUid,
                    amountVnd,
                    canonStoreId: normalizeStoreId(tx.merchantId) || targetStoreId
                });
            });

            // 고객 프로필 조회 (이름/이메일 표시용)
            const userProfileMap = new Map();
            if (uidsToLookup.size > 0) {
                await Promise.all(Array.from(uidsToLookup).map(async (u) => {
                    try {
                        const uSnap = await getDoc(doc(db, 'users', u));
                        if (uSnap.exists()) {
                            userProfileMap.set(u, uSnap.data() || {});
                        }
                    } catch (_) {}
                }));
            }

            pendingQrRecords.forEach(({ docId, tx, buyerUid, amountVnd, canonStoreId }) => {
                if (recordMap.has(docId)) return;
                const uData = userProfileMap.get(buyerUid) || {};
                const buyerEmail = (tx.buyerEmail || uData.email || '').trim();
                const rawBuyerName = (tx.buyerName || uData.name || uData.displayName || '').trim();
                const cleanBuyerName = (rawBuyerName && rawBuyerName !== 'Winner Best')
                    ? rawBuyerName
                    : (buyerEmail ? buyerEmail.split('@')[0] : (buyerUid ? `고객(${buyerUid.slice(0, 6)})` : 'QR 결제 고객'));
                const buyerLabel = buyerEmail ? `${cleanBuyerName} (${buyerEmail})` : cleanBuyerName;
                const issuedBt = Number(tx.issuedBt || tx.bt || 0);
                const storeDispName = TENANT_MAP[canonStoreId]?.name || tx.merchantName || targetInfo.name || '가맹점';

                recordMap.set(docId, {
                    id: docId,
                    type: 'INCOME',
                    category: '📱 QR 결제 매출',
                    amount: amountVnd,
                    date: toDateString(tx.createdAt),
                    partner: buyerLabel,
                    project: `매장 QR 결제${issuedBt > 0 ? ` · BT ${issuedBt}장 지급` : ''}`,
                    registrant: 'QR 자동정산 시스템',
                    spender: buyerLabel,
                    memo: `[QR 결제 매출] ${storeDispName} QR 결제 완료 (${formatCurrency(amountVnd)} VND${issuedBt > 0 ? ` / 보너스티켓 ${issuedBt} BT 지급` : ''})`,
                    tenantId: canonStoreId,
                    merchantId: canonStoreId,
                    storeName: storeDispName,
                    isAutoSyncedSales: true,
                    syncBadgeText: '📱 QR매출'
                });
            });

            // 온라인/매장 주문 (merchant_orders) 매출 연동 (QR txHash와 중복되지 않는 완료/결제 주문)
            (ordersSnap.docs || []).forEach(docSnap => {
                const ord = docSnap.data() || {};
                const rawMId = ord.merchant_id || ord.merchantId || ord.tenantId || ord.storeId || '';
                if (!matchesTargetStore(rawMId)) return;
                if (ord.status === '취소' || ord.status === 'cancelled') return;

                if (ord.txHash && seenQrTxHashes.has(String(ord.txHash))) return;

                const amountVnd = Number(ord.total_amount || ord.totalAmount || ord.amount || 0);
                if (!amountVnd || amountVnd <= 0) return;

                const docId = `order_inc_${docSnap.id}`;
                if (recordMap.has(docId)) return;

                const canonStoreId = normalizeStoreId(rawMId) || targetStoreId;
                const storeDispName = TENANT_MAP[canonStoreId]?.name || targetInfo.name || '가맹점';
                const buyerEmail = (ord.buyer_email || ord.email || '').trim();
                const buyerName = (ord.buyer_name || ord.name || (buyerEmail ? buyerEmail.split('@')[0] : '주문 고객')).trim();
                const buyerLabel = buyerEmail ? `${buyerName} (${buyerEmail})` : buyerName;
                const itemsDesc = Array.isArray(ord.items) && ord.items.length > 0
                    ? ord.items.map(it => `${it.name || it.product_name || '상품'} x${it.qty || 1}`).join(', ')
                    : '매장/온라인 주문';

                recordMap.set(docId, {
                    id: docId,
                    type: 'INCOME',
                    category: ord.payment_method === 'bm_wallet' ? '📱 QR 결제 매출' : '🛍️ 주문 매출',
                    amount: amountVnd,
                    date: toDateString(ord.paid_at || ord.created_at || ord.createdAt),
                    partner: buyerLabel,
                    project: ord.payment_method === 'bm_wallet' ? '매장 QR 결제' : '쇼핑몰/온라인 주문',
                    registrant: '주문 자동정산',
                    spender: buyerLabel,
                    memo: `[매출 자동연동] ${itemsDesc}`,
                    tenantId: canonStoreId,
                    merchantId: canonStoreId,
                    storeName: storeDispName,
                    isAutoSyncedSales: true,
                    syncBadgeText: ord.payment_method === 'bm_wallet' ? '📱 QR매출' : '🛍️ 주문매출'
                });
            });
        } catch (salesSyncErr) {
            console.warn('QR/Order sales sync warning:', salesSyncErr);
        }

        // 4. DYNAMIC VIRTUAL PAYROLL INJECTION & EMPLOYEE SPENDER DATALIST: Strictly isolated per store!
        let virtualPayrolls = [];
        const spenderEmpNames = new Set();
        try {
            const empSnap = await getDocs(collection(db, 'employees'));
            const now = new Date();
            const curYYYYMM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const payDate = curYYYYMM + '-25';
            
            empSnap.forEach(e => {
                const edata = e.data();
                const eTenant = String(edata.tenantId || edata.merchantId || '').trim();

                // 🚨 CRITICAL: Employee MUST belong to targetStoreId!
                let isMyStoreEmp = false;
                if (isSuper && selectedMerchant === 'ALL') {
                    isMyStoreEmp = true;
                } else {
                    isMyStoreEmp = (eTenant === targetStoreId);
                    if (!eTenant && targetStoreId === '1791605366') {
                        isMyStoreEmp = true;
                    }
                }

                if (!isMyStoreEmp) return; // REJECT ANY EMPLOYEE FROM OTHER STORES!

                if (edata.name) {
                    const empLabel = edata.position ? `${edata.name} (${edata.position})` : edata.name;
                    spenderEmpNames.add(empLabel);
                }

                if (edata.salary && Number(edata.salary) > 0) {
                    virtualPayrolls.push({
                        id: 'virtual_payroll_' + e.id,
                        type: 'PAYABLE',
                        category: '인건비/급여',
                        amount: Number(edata.salary),
                        date: payDate,
                        partner: (edata.name || '직원') + ' (' + (edata.position||'') + ')',
                        project: edata.department || '가맹점 공통',
                        registrant: '시스템 자동생성',
                        spender: (edata.name || '직원') + (edata.position ? ` (${edata.position})` : ''),
                        memo: `[시스템 자동생성] ${now.getMonth()+1}월 정기 급여 지급예정`,
                        tenantId: targetStoreId,
                        storeName: edata.storeName || TENANT_MAP[eTenant]?.name || targetInfo.name || '가맹점'
                    });
                }
            });
        } catch (empErr) {
            console.warn("Employees payroll fetch warning:", empErr);
        }

        const spenderDatalist = document.getElementById('spenderEmpList');
        if (spenderDatalist) {
            spenderDatalist.innerHTML = Array.from(spenderEmpNames)
                .map(name => `<option value="${name.replace(/"/g, '&quot;')}"></option>`)
                .join('');
        }

        let records = Array.from(recordMap.values());
        // Merge virtual payroll records
        records = records.concat(virtualPayrolls);

        records.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        window.__financeRecordsMap = {};
        if (records.length === 0) {
            html = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:3.5rem 1rem; color:var(--text-muted);">
                        <div style="font-size:2.5rem; margin-bottom:0.75rem;">🧾</div>
                        <div style="font-size:1.05rem; font-weight:700; color:#1E293B; margin-bottom:0.35rem;">등록된 수입/지출 내역이 없습니다.</div>
                        <div style="font-size:0.85rem; color:#64748B;">위의 <b>[📸 AI 영수증 자동 지출 등록]</b> 버튼을 누르면 영수증 사진을 올려 즉시 지출로 등록할 수 있습니다.</div>
                    </td>
                </tr>
            `;
        } else {
            records.forEach(data => {
                if (data.id) window.__financeRecordsMap[data.id] = data;
                const type = data.type || 'INCOME';
                const amount = Number(data.amount) || 0;

                sums[type] = (sums[type] || 0) + amount;

                let badgeHtml = '';
                if (type === 'INCOME') badgeHtml = '<span class="type-badge badge-income">수입</span>';
                else if (type === 'EXPENSE') badgeHtml = '<span class="type-badge badge-expense">지출</span>';
                else if (type === 'RECEIVABLE') badgeHtml = '<span class="type-badge badge-receivable">받을 돈</span>';
                else if (type === 'PAYABLE') badgeHtml = '<span class="type-badge badge-payable">지출예정(줄돈)</span>';

                const partner = data.partner || '-';
                const project = data.project || '-';
                const receiptImg = data.receiptUrl || data.receiptPhoto || data.imageUrl || data.photoUrl || (Array.isArray(data.photos) && data.photos[0]) || '';
                const items = data.receiptItems || [];
                const hasReceipt = Boolean(receiptImg || items.length > 0);

                const storeBadge = (isSuper && selectedMerchant === 'ALL')
                    ? `<span style="font-size:0.75rem; background:#EEF2FF; color:#4338CA; border:1px solid #C7D2FE; padding:0.15rem 0.45rem; border-radius:0.3rem; font-weight:700; margin-right:0.35rem;">🏬 ${data.storeName || '가맹점'}</span>`
                    : '';

                let receiptBadgeHtml = '';
                if (hasReceipt) {
                    receiptBadgeHtml = `
                        <div style="margin-top:0.4rem; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                            ${receiptImg ? `
                                <img src="${receiptImg}" alt="영수증" style="width:38px; height:38px; object-fit:cover; border-radius:0.35rem; border:1.5px solid #10B981; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.1);" onclick="event.stopPropagation(); window.openReceiptInspectionModal(window.__financeRecordsMap['${data.id}'])" title="🔍 영수증 원본 크게보기">
                            ` : ''}
                            <button type="button" class="btn-inspect-receipt" data-record-id="${data.id}" style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.75rem; background:#ECFDF5; color:#065F46; border:1px solid #A7F3D0; padding:0.3rem 0.65rem; border-radius:0.4rem; font-weight:800; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:all 0.15s;">
                                <span>🧾</span> 영수증 검토 ${items.length > 0 ? `<span style="background:#D1FAE5; color:#047857; padding:0.05rem 0.35rem; border-radius:999px; font-size:0.7rem;">${items.length}품목</span>` : ''}
                            </button>
                        </div>
                    `;
                }

                const isVirtual = String(data.id || '').startsWith('virtual_payroll_');
                const isAutoSales = Boolean(data.isAutoSyncedSales);
                const registrantDisp = data.registrant || data.createdBy || (isVirtual ? '시스템 자동' : '-');
                const spenderDisp = data.spender || data.registrant || data.createdBy || (isVirtual ? data.partner : '-');
                const actorRoleLabel = (type === 'INCOME' || type === 'RECEIVABLE') ? '💰 결제자' : '💳 지출자';

                const deleteActionHtml = isVirtual
                    ? `<span style="color:#94A3B8; font-size:0.75rem;">자동급여</span>`
                    : isAutoSales
                        ? `<span style="color:#059669; background:#ECFDF5; border:1px solid #A7F3D0; padding:0.25rem 0.5rem; border-radius:0.35rem; font-size:0.72rem; font-weight:700; white-space:nowrap;">${data.syncBadgeText || '📱 QR매출'}</span>`
                        : `<button type="button" class="btn-delete-row" data-record-id="${data.id}" data-memo="${(data.memo || data.partner || '').replace(/"/g, '&quot;')}" style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.75rem; background:#FEE2E2; color:#B91C1C; border:1px solid #FECACA; padding:0.32rem 0.65rem; border-radius:0.4rem; font-weight:700; cursor:pointer; transition:all 0.15s;" title="지출 내역 영구 삭제">
                               <span>🗑️</span> 삭제
                           </button>`;

                html += `
                    <tr>
                        <td class="col-date">${data.date || '-'}</td>
                        <td class="col-type">
                            ${badgeHtml}
                            <div class="fin-cat">${data.category || '기타/미분류'}</div>
                        </td>
                        <td class="col-amount" style="color:${type === 'EXPENSE' || type === 'PAYABLE' ? '#DC2626' : '#059669'};">${type === 'EXPENSE' || type === 'PAYABLE' ? '−' : '+'}${formatCurrency(amount)}<span class="fin-unit">VND</span></td>
                        <td class="col-partner">
                            <div style="color:var(--text-dark); font-weight:600;">${storeBadge}${partner}</div>
                            <div style="font-size:0.85rem; color:var(--text-muted);">${project}</div>
                        </td>
                        <td class="col-actor">
                            <div class="fin-actor-row">
                                <span class="fin-actor-tag" style="background:#ECFDF5; color:#047857; border:1px solid #A7F3D0;">${actorRoleLabel}</span>
                                <span class="fin-actor-name" style="color:#0F172A; font-weight:700;" title="${String(spenderDisp).replace(/"/g, '&quot;')}">${spenderDisp}</span>
                            </div>
                            <div class="fin-actor-row">
                                <span class="fin-actor-tag" style="background:#EEF2FF; color:#4F46E5;">✍️ 등록자</span>
                                <span class="fin-actor-name" style="color:#64748B;" title="${String(registrantDisp).replace(/"/g, '&quot;')}">${registrantDisp}</span>
                            </div>
                        </td>
                        <td class="col-memo">
                            <div>${data.memo || '-'}</div>
                            ${receiptBadgeHtml}
                        </td>
                        <td class="col-manage">
                            ${deleteActionHtml}
                        </td>
                    </tr>
                `;
            });
        }

        tbody.innerHTML = html;
        document.getElementById('sumIncome').textContent = formatCurrency(sums.INCOME || 0) + ' VND';
        document.getElementById('sumExpense').textContent = formatCurrency(sums.EXPENSE || 0) + ' VND';
        document.getElementById('sumReceivable').textContent = formatCurrency(sums.RECEIVABLE || 0) + ' VND';
        document.getElementById('sumPayable').textContent = formatCurrency(sums.PAYABLE || 0) + ' VND';

    } catch (err) {
        console.error('loadFinanceData error:', err);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:red; padding:2rem;">오류가 발생했습니다: ' + (err.message || '데이터를 불러오는 중 문제가 발생했습니다.') + '</td></tr>';
    }
}

window.deleteFinanceRecord = async (recordId, memo = '') => {
    if (!recordId) return;
    if (!confirm(`정말 이 지출/수입 내역을 삭제하시겠습니까?\n\n내역: ${memo || recordId}`)) return;

    try {
        const curStoreInfo = getCurrentStoreInfo();
        const curStoreId = curStoreInfo.storeId;
        const targetStoreId = (isSuperAdminUser() && document.getElementById('filterMerchant')?.value && document.getElementById('filterMerchant').value !== 'ALL')
            ? document.getElementById('filterMerchant').value
            : curStoreId;

        await deleteDoc(doc(db, 'merchants', targetStoreId, 'financeRecords', recordId));

        // Also attempt to delete from root if exists
        try {
            await deleteDoc(doc(db, 'financeRecords', recordId));
        } catch (e) {}

        alert('지출 내역이 성공적으로 삭제되었습니다.');
        await loadFinanceData();
    } catch (err) {
        console.error('Delete finance record error:', err);
        alert('삭제 실패: ' + (err.message || '권한 문제일 수 있습니다.'));
    }
};

// Client-side image compression helper
function compressImage(dataUrl, maxWidth = 1400, maxHeight = 1800, quality = 0.82) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const span = btn.querySelector('span');
    const prevText = span ? span.textContent : '저장하기';
    if (span) span.textContent = '영수증 및 지출 저장 중...';
    btn.disabled = true;

    try {
        const curStoreId = getCurrentStoreId();
        const tId = curStoreId;
        const sName = window.currentStoreName || '';
        let receiptUrl = '';
        if (currentReceiptDataUrl && currentReceiptDataUrl.startsWith('data:image')) {
            try {
                // Compress photo before uploading for fast transfer and crisp archival
                const compressedDataUrl = await compressImage(currentReceiptDataUrl, 1400, 1800, 0.82);
                if (storage) {
                    const storageRef = ref(storage, `receipts/${tId}/${Date.now()}_receipt.jpg`);
                    const uploadRes = await uploadString(storageRef, compressedDataUrl, 'data_url');
                    receiptUrl = await getDownloadURL(uploadRes.ref);
                }
                if (!receiptUrl) {
                    receiptUrl = await compressImage(currentReceiptDataUrl, 800, 1000, 0.65);
                }
            } catch (storageErr) {
                console.warn('Receipt upload to storage failed, using compressed data fallback:', storageErr);
                receiptUrl = await compressImage(currentReceiptDataUrl, 800, 1000, 0.65);
            }
        }

        // 등록자 명시 & 실제 지출자 (미입력 시 등록자가 지출자로 자동 등록)
        const { registrant, spender } = getResolvedRegistrantAndSpender();

        const storeFinanceRef = getStoreFinanceCollection(curStoreId);
        const newRecordData = {
            type: document.getElementById('finType').value,
            category: document.getElementById('finCategory').value,
            date: document.getElementById('finDate').value,
            amount: Number(document.getElementById('finAmount').value),
            partner: document.getElementById('finPartner').value,
            project: document.getElementById('finProject').value,
            memo: document.getElementById('finMemo').value,
            registrant: registrant,
            spender: spender,
            receiptUrl: receiptUrl,
            receiptItems: currentReceiptItems || [],
            tenantId: curStoreId,
            merchantId: curStoreId,
            storeName: sName,
            createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'user',
            createdAt: serverTimestamp()
        };

        const addedDocRef = await addDoc(storeFinanceRef, newRecordData);

        // Also save to root financeRecords with tenantId for backward compatibility
        try {
            await setDoc(doc(db, 'financeRecords', addedDocRef.id), newRecordData, { merge: true });
        } catch (rootSaveErr) {}

        clearReceiptPreview();

        modal.style.display = 'none';
        form.reset();
        if (finRegistrantInput) finRegistrantInput.value = getDefaultRegistrantName();
        syncSpenderBadgeUI();
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
        if (finRegistrantInput && !finRegistrantInput.value.trim()) {
            finRegistrantInput.value = getDefaultRegistrantName();
            syncSpenderBadgeUI();
        }
        if (window.tenantId || window.currentUserRole) {
            loadFinanceData();
        }
    }
});

if (auth.currentUser && (window.tenantId || window.currentUserRole)) {
    loadFinanceData();
}

window.loadFinanceData = loadFinanceData;

// Beep chime helper
function playSuccessChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
}

// Receipt Inspector Viewer State
let currentReceiptRotation = 0;
let currentReceiptZoom = 1;

function updateReceiptViewerTransform() {
    const img = document.getElementById('receiptModalFullImg');
    if (img) {
        img.style.transform = `rotate(${currentReceiptRotation}deg) scale(${currentReceiptZoom})`;
    }
}

document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    currentReceiptZoom = Math.min(currentReceiptZoom + 0.25, 3.5);
    updateReceiptViewerTransform();
});
document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    currentReceiptZoom = Math.max(currentReceiptZoom - 0.25, 0.5);
    updateReceiptViewerTransform();
});
document.getElementById('btnRotateReceipt')?.addEventListener('click', () => {
    currentReceiptRotation = (currentReceiptRotation + 90) % 360;
    updateReceiptViewerTransform();
});
document.getElementById('btnResetZoom')?.addEventListener('click', () => {
    currentReceiptZoom = 1;
    currentReceiptRotation = 0;
    updateReceiptViewerTransform();
});

window.openReceiptInspectionModal = (record) => {
    currentReceiptRotation = 0;
    currentReceiptZoom = 1;
    updateReceiptViewerTransform();

    const inspectModal = document.getElementById('receiptImageModal');
    const img = document.getElementById('receiptModalFullImg');
    const dlLink = document.getElementById('receiptDownloadLink');

    if (!inspectModal || !img) return;

    const receiptImg = record.receiptUrl || record.receiptPhoto || record.imageUrl || record.photoUrl || (Array.isArray(record.photos) && record.photos[0]) || '';
    img.src = receiptImg || '';
    img.style.display = receiptImg ? 'block' : 'none';

    if (dlLink) {
        if (receiptImg) {
            dlLink.style.display = 'inline-flex';
            dlLink.href = receiptImg;
            dlLink.setAttribute('download', `receipt_${record.date || 'date'}.jpg`);
        } else {
            dlLink.style.display = 'none';
        }
    }

    const storeEl = document.getElementById('auditStoreName');
    if (storeEl) storeEl.textContent = record.partner || record.storeName || '영수증 거래처';

    const dateEl = document.getElementById('auditDate');
    if (dateEl) dateEl.textContent = `결제일자: ${record.date || '-'}`;

    const amountEl = document.getElementById('auditAmount');
    if (amountEl) amountEl.textContent = `${formatCurrency(record.amount || 0)} VND`;

    const catEl = document.getElementById('auditCategory');
    if (catEl) catEl.textContent = record.category || '식자재/원부자재';

    const typeEl = document.getElementById('auditTypeBadge');
    if (typeEl) {
        typeEl.textContent = record.type === 'INCOME' ? '수입' : '지출';
        typeEl.style.color = record.type === 'INCOME' ? '#059669' : '#DC2626';
    }

    const fallbackPeople = getResolvedRegistrantAndSpender();
    const resolvedReg = record.registrant || record.createdBy || fallbackPeople.registrant || '-';
    const resolvedSpd = record.spender || record.registrant || record.createdBy || fallbackPeople.spender || '-';

    const regEl = document.getElementById('auditRegistrant');
    if (regEl) regEl.textContent = resolvedReg;

    const spdEl = document.getElementById('auditSpender');
    if (spdEl) spdEl.textContent = resolvedSpd;

    const memoEl = document.getElementById('auditMemo');
    if (memoEl) memoEl.textContent = record.memo || '기록된 메모 없음';

    // Populate itemized list
    const itemsListEl = document.getElementById('auditItemsList');
    const itemsCountEl = document.getElementById('auditItemsCount');
    const items = record.receiptItems || [];

    if (itemsCountEl) itemsCountEl.textContent = `${items.length}개 품목`;

    if (itemsListEl) {
        if (items.length === 0) {
            itemsListEl.innerHTML = '<div style="color:#94A3B8; text-align:center; padding:1.5rem;">단일 지출 내역 (세부 품목 없음)</div>';
        } else {
            itemsListEl.innerHTML = items.map((it, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0.6rem; background:#F8FAFC; border-radius:0.4rem; border:1px solid #F1F5F9;">
                    <div style="font-weight:600; color:#1E293B; max-width:65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <span style="color:#64748B; font-size:0.75rem; margin-right:0.3rem;">#${idx + 1}</span>${it.name || '품목'}
                        ${it.quantity > 1 ? `<span style="font-size:0.75rem; color:#4F46E5; background:#EEF2FF; padding:0.1rem 0.35rem; border-radius:0.2rem; margin-left:0.25rem;">x${it.quantity}</span>` : ''}
                    </div>
                    <div style="font-weight:700; color:#0F172A;">
                        ${it.price ? formatCurrency(it.price) + ' VND' : '-'}
                    </div>
                </div>
            `).join('');
        }
    }

    const auditSubmitBtn = document.getElementById('btnAuditConfirmSubmit');
    if (auditSubmitBtn) {
        if (record.id) {
            auditSubmitBtn.style.display = 'none';
        } else {
            auditSubmitBtn.style.display = 'inline-flex';
        }
    }

    inspectModal.style.display = 'flex';
};

window.closeReceiptInspector = () => {
    const inspectModal = document.getElementById('receiptImageModal');
    if (inspectModal) inspectModal.style.display = 'none';
};

// Table event delegation for receipt inspector and delete row
tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-inspect-receipt');
    if (btn) {
        const recordId = btn.dataset.recordId;
        const record = window.__financeRecordsMap?.[recordId];
        if (record) {
            openReceiptInspectionModal(record);
        }
        return;
    }

    const delBtn = e.target.closest('.btn-delete-row');
    if (delBtn) {
        const recordId = delBtn.dataset.recordId;
        const memo = delBtn.dataset.memo || '';
        if (window.deleteFinanceRecord) {
            window.deleteFinanceRecord(recordId, memo);
        }
        return;
    }
});

let isReceiptAnalyzing = false;

function clearReceiptPreview() {
    isReceiptAnalyzing = false;
    currentReceiptDataUrl = '';
    currentReceiptItems = [];
    if (receiptFileInput) receiptFileInput.value = '';
    if (receiptPreviewBox) receiptPreviewBox.style.display = 'none';
    if (receiptThumbImg) receiptThumbImg.src = '';
    if (receiptItemSummaryText) receiptItemSummaryText.textContent = '';
    if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
    const quickBtn = document.getElementById('btnQuickSubmitReceipt');
    if (quickBtn) quickBtn.style.display = 'none';
}

const triggerPreviewInspect = () => {
    if (!currentReceiptDataUrl) return;
    const { registrant, spender } = getResolvedRegistrantAndSpender();

    if (isReceiptAnalyzing) {
        openReceiptInspectionModal({
            receiptUrl: currentReceiptDataUrl,
            partner: '⏳ AI 정밀 분석 진행 중... (2~4초)',
            date: document.getElementById('finDate')?.value || new Date().toISOString().split('T')[0],
            amount: 0,
            category: '식자재/원부자재',
            type: 'EXPENSE',
            registrant,
            spender,
            receiptItems: [],
            memo: '⏳ AI가 영수증의 상호명, 결제일자, 총 결제금액 및 세부 품목을 정밀 분석하고 있습니다.\n분석이 완료되면 이 화면에 자동으로 즉시 채워집니다. 잠시만 기다려주세요.'
        });
        return;
    }

    openReceiptInspectionModal({
        receiptUrl: currentReceiptDataUrl,
        partner: document.getElementById('finPartner')?.value || '작성 중 거래처',
        date: document.getElementById('finDate')?.value || new Date().toISOString().split('T')[0],
        amount: Number(document.getElementById('finAmount')?.value) || 0,
        category: document.getElementById('finCategory')?.value || '식자재/원부자재',
        type: document.getElementById('finType')?.value || 'EXPENSE',
        registrant,
        spender,
        receiptItems: currentReceiptItems || [],
        memo: document.getElementById('finMemo')?.value || '영수증 등록 전 사전 검토'
    });
};

document.getElementById('receiptThumbContainer')?.addEventListener('click', triggerPreviewInspect);
document.getElementById('linkPreviewInspect')?.addEventListener('click', triggerPreviewInspect);

document.getElementById('btnQuickSubmitReceipt')?.addEventListener('click', () => {
    if (form) form.requestSubmit();
});

document.getElementById('btnAuditConfirmSubmit')?.addEventListener('click', () => {
    window.closeReceiptInspector();
    if (form) form.requestSubmit();
});

if (btnRemoveReceipt) {
    btnRemoveReceipt.addEventListener('click', clearReceiptPreview);
}

if (openReceiptOcrBtn) {
    openReceiptOcrBtn.addEventListener('click', () => {
        openModal();
        setType('EXPENSE');
        if (receiptFileInput) {
            setTimeout(() => { receiptFileInput.click(); }, 200);
        }
    });
}

if (receiptFileInput) {
    receiptFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        isReceiptAnalyzing = true;
        if (receiptFileName) receiptFileName.textContent = file.name;

        // Display progress
        if (receiptPreviewBox) receiptPreviewBox.style.display = 'flex';
        if (receiptOcrProgress) receiptOcrProgress.style.display = 'block';
        if (receiptOcrBadge) {
            receiptOcrBadge.textContent = '⏳ AI 영수증 분석 중... (2~4초)';
            receiptOcrBadge.style.background = '#EFF6FF';
            receiptOcrBadge.style.color = '#1E40AF';
        }
        if (receiptItemSummaryText) {
            receiptItemSummaryText.textContent = '영수증 이미지를 분석하여 총액과 세부 품목을 추출하고 있습니다...';
        }

        try {
            // Read file into Data URL
            const rawDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            currentReceiptDataUrl = rawDataUrl;
            if (receiptThumbImg) receiptThumbImg.src = rawDataUrl;

            // Compress & standardize to clean JPEG (~1500px, 0.85 quality)
            // Fixes HEIC/PNG/WebP, eliminates mobile payload timeouts, and cuts processing time in half
            const optimizedJpegDataUrl = await compressImage(rawDataUrl, 1600, 2000, 0.85);
            currentReceiptDataUrl = optimizedJpegDataUrl;
            currentReceiptMimeType = 'image/jpeg';
            if (receiptThumbImg) receiptThumbImg.src = optimizedJpegDataUrl;

            // Extract base64 payload
            const base64Data = optimizedJpegDataUrl.split(',')[1];
            const ocrResult = await scanReceiptAI(base64Data, 'image/jpeg');

            isReceiptAnalyzing = false;

            // Auto-fill form fields
            setType('EXPENSE');

            const dateInput = document.getElementById('finDate');
            if (dateInput && ocrResult.date) dateInput.value = ocrResult.date;

            if (ocrResult.totalAmount && amountInput) {
                amountInput.value = ocrResult.totalAmount;
                updateAmountPreview(ocrResult.totalAmount);
            }

            const catInput = document.getElementById('finCategory');
            if (catInput && ocrResult.category) catInput.value = ocrResult.category;

            const partnerInput = document.getElementById('finPartner');
            if (partnerInput && ocrResult.storeName) partnerInput.value = ocrResult.storeName;

            const projectInput = document.getElementById('finProject');
            if (projectInput && !projectInput.value) {
                projectInput.value = '가맹점 매장 운영';
            }

            currentReceiptItems = ocrResult.items || [];
            const memoInput = document.getElementById('finMemo');
            if (memoInput) {
                const itemsDesc = currentReceiptItems.length > 0 
                    ? currentReceiptItems.map(it => `${it.name}${it.quantity > 1 ? ' x' + it.quantity : ''}${it.price ? ' (' + formatCurrency(it.price) + ')' : ''}`).join(', ')
                    : '';
                memoInput.value = `[AI 영수증 자동정리] ${ocrResult.summary || ''}${itemsDesc ? '\n품목: ' + itemsDesc : ''}`;
            }

            // Update UI badges
            if (receiptOcrBadge) {
                receiptOcrBadge.textContent = '✅ AI 영수증 분석 완료';
                receiptOcrBadge.style.background = '#DCFCE7';
                receiptOcrBadge.style.color = '#166534';
            }
            if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
            if (receiptItemSummaryText) {
                receiptItemSummaryText.textContent = `🏬 ${ocrResult.storeName || '상호명'} | 💰 ${formatCurrency(ocrResult.totalAmount)} ${ocrResult.currency || 'VND'} | ${ocrResult.summary || '지출 항목 정리 완료'}`;
            }

            // Show quick submit button in receipt card
            const quickBtn = document.getElementById('btnQuickSubmitReceipt');
            if (quickBtn) quickBtn.style.display = 'inline-flex';

            // Also update the main submit button label dynamically for clear visibility
            const submitBtn = document.getElementById('btnSubmit');
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) {
                    span.textContent = `💾 ${formatCurrency(ocrResult.totalAmount)} VND 지출 등록 (저장)`;
                }
            }

            // If user has the inspector modal already open, live-update it with extracted data!
            const inspectModal = document.getElementById('receiptImageModal');
            if (inspectModal && inspectModal.style.display === 'flex') {
                const { registrant, spender } = getResolvedRegistrantAndSpender();
                openReceiptInspectionModal({
                    receiptUrl: currentReceiptDataUrl,
                    partner: ocrResult.storeName || '영수증 거래처',
                    date: ocrResult.date,
                    amount: ocrResult.totalAmount,
                    category: ocrResult.category,
                    type: 'EXPENSE',
                    registrant,
                    spender,
                    receiptItems: currentReceiptItems,
                    memo: `[AI 영수증 자동정리] ${ocrResult.summary || ''}`
                });
            }

            playSuccessChime();

        } catch (scanErr) {
            isReceiptAnalyzing = false;
            console.error("Receipt OCR error:", scanErr);
            if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
            if (receiptOcrBadge) {
                receiptOcrBadge.textContent = '⚠️ 수동 검토 필요';
                receiptOcrBadge.style.background = '#FEF3C7';
                receiptOcrBadge.style.color = '#92400E';
            }
            if (receiptItemSummaryText) {
                receiptItemSummaryText.textContent = `분석 중 오류 발생 (${scanErr.message || '네트워크 확인 필요'}). 사진은 저장 가능하며 금액을 직접 입력할 수 있습니다.`;
            }
        }
    });
}

// URL param action=receipt auto-trigger
setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'receipt') {
        openModal();
        setType('EXPENSE');
        if (receiptFileInput) {
            setTimeout(() => { receiptFileInput.click(); }, 300);
        }
    }
}, 300);
