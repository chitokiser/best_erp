import { auth, db } from './firebase-config.js';
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    increment
} from 'firebase/firestore';
import { checkAdminAuth } from './auth.js';

let storedClients = [];
let currentUser = null;
let isSuperAdmin = false;
let activeMerchantId = '1791605366';

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

function matchesMerchant(merchantId, filterMerchantId) {
    if (!filterMerchantId || filterMerchantId === 'ALL' || filterMerchantId === 'all') return true;
    const pStr = String(merchantId || '').trim();
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

async function loadClients() {
    const tbody = document.getElementById('menteeTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:#64748b;">멘티 및 제휴 구매 고객 데이터를 통합 조회하는 중입니다...</td></tr>';
    }

    try {
        isSuperAdmin = window.currentUserRole === 'SUPER_ADMIN' ||
            (currentUser && currentUser.email && currentUser.email.toLowerCase() === 'daguri75@gmail.com');

        activeMerchantId = (window.tenantId && window.tenantId !== 'system_master')
            ? window.tenantId
            : (window.currentMerchantId || (isSuperAdmin ? 'ALL' : '1791605366'));

        const filterMerchantEl = document.getElementById('CRM_filterMerchant');
        if (filterMerchantEl) {
            filterMerchantEl.style.display = isSuperAdmin ? 'inline-block' : 'none';
        }

        const clientMap = new Map(); // key -> Client Object
        const myEmail = (currentUser?.email || auth.currentUser?.email || window.currentUserEmail || '').toLowerCase().trim();
        const myUid = currentUser?.uid || auth.currentUser?.uid || window.currentUserUid || '';

        // ----------------------------------------------------
        // 1. 내 직속 멘티(Mentees) 회원 수집
        // ----------------------------------------------------
        try {
            const userQueries = [];
            if (myEmail) {
                userQueries.push(getDocs(query(collection(db, 'users'), where('mentorAddressInput', '==', myEmail))).catch(() => ({ docs: [] })));
                userQueries.push(getDocs(query(collection(db, 'users'), where('mentorEmail', '==', myEmail))).catch(() => ({ docs: [] })));
            }
            if (myUid) {
                userQueries.push(getDocs(query(collection(db, 'users'), where('mentorUid', '==', myUid))).catch(() => ({ docs: [] })));
            }

            if (isSuperAdmin) {
                userQueries.push(getDocs(collection(db, 'users')).catch(() => ({ docs: [] })));
            } else if (activeMerchantId && activeMerchantId !== 'ALL') {
                userQueries.push(getDocs(query(collection(db, 'users'), where('registeredMerchantId', '==', activeMerchantId))).catch(() => ({ docs: [] })));
                userQueries.push(getDocs(query(collection(db, 'users'), where('merchantId', '==', activeMerchantId))).catch(() => ({ docs: [] })));
            }

            const querySnaps = await Promise.all(userQueries);
            const userDocsSeen = new Set();

            querySnaps.forEach(snap => {
                (snap.docs || []).forEach(docSnap => {
                    if (userDocsSeen.has(docSnap.id)) return;
                    userDocsSeen.add(docSnap.id);

                    const ud = docSnap.data();
                    const email = (ud.email || '').toLowerCase().trim();
                    // 가맹점주 본인 계정은 멘티 목록에서 제외
                    if (!isSuperAdmin && (docSnap.id === myUid || (myEmail && email === myEmail))) return;

                    const key = email || docSnap.id;

                    const client = {
                        id: docSnap.id,
                        uid: docSnap.id,
                        email: ud.email || '',
                        name: ud.name || '멘티 고객',
                        phone: ud.phone || '',
                        merchantId: ud.registeredMerchantId || ud.merchantId || ud.registeredStoreId || activeMerchantId,
                        isMentee: true,
                        isBuyer: false,
                        registeredAt: ud.createdAt || ud.registeredAt || null,
                        lastEventAt: ud.lastEventAt || null,
                        points: Number(ud.points || ud.pointBalance || ud.generatedForMentor || 0),
                        purchaseCount: 0,
                        totalSpend: 0,
                        orders: []
                    };
                    clientMap.set(key, client);
                });
            });
        } catch (menteeErr) {
            console.warn('멘티 회원 조회 오류/스킵:', menteeErr);
        }

        // ----------------------------------------------------
        // 2. 내 상품 구매 고객(Buyers from merchant_orders) 수집
        //    - 내 멘티가 아니면 '제휴 회원(affiliate)'으로 자동 분류
        // ----------------------------------------------------
        try {
            const ordersSnap = await getDocs(collection(db, 'merchant_orders'));
            ordersSnap.forEach(d => {
                const ord = d.data();
                const ordMerchantId = String(ord.merchant_id || ord.merchantId || '');

                // 가맹점 필터 (내 가맹점에 들어온 주문인지 검증)
                let belongsToMe = false;
                if (isSuperAdmin) {
                    belongsToMe = true;
                } else {
                    belongsToMe = matchesMerchant(ordMerchantId, activeMerchantId);
                }

                if (!belongsToMe) return;

                const buyerEmail = (ord.buyer_email || ord.email || '').trim().toLowerCase();
                const buyerUid = ord.buyer_id || ord.buyer_uid || ord.userId || ord.user_id || '';
                const buyerName = ord.buyer_name || ord.name || '';
                const buyerPhone = ord.buyer_phone || ord.phone || ord.contact || '';
                const amount = Number(ord.total_amount || ord.amount || 0);

                // 이메일 또는 UID로 기존 멘티 매칭 확인
                let client = (buyerEmail && clientMap.get(buyerEmail)) || (buyerUid && clientMap.get(buyerUid)) || null;
                if (!client && buyerUid) {
                    for (const existing of clientMap.values()) {
                        if (existing.uid === buyerUid) {
                            client = existing;
                            break;
                        }
                    }
                }

                const key = buyerEmail || buyerUid || ('buyer_order_' + d.id);

                if (!client) {
                    // 다른 가맹점/경로를 통해 가입한 회원이 내 가맹점에서 구매한 경우 -> 제휴 회원 (affiliate)
                    client = {
                        id: buyerUid || d.id,
                        uid: buyerUid,
                        email: buyerEmail,
                        name: buyerName || '제휴 구매고객',
                        phone: buyerPhone,
                        merchantId: ordMerchantId || activeMerchantId,
                        isMentee: false,
                        isBuyer: true,
                        registeredAt: ord.created_at || ord.createdAt || null,
                        lastEventAt: null,
                        points: 0,
                        purchaseCount: 0,
                        totalSpend: 0,
                        orders: []
                    };
                    clientMap.set(key, client);
                } else {
                    // 이미 내 멘티로 등록된 회원이 상품도 구매한 경우 (멘티 + 구매고객)
                    client.isBuyer = true;
                    if ((!client.name || client.name === '멘티 고객') && buyerName) {
                        client.name = buyerName;
                    }
                    if (!client.phone && buyerPhone) {
                        client.phone = buyerPhone;
                    }
                    if (!client.uid && buyerUid) {
                        client.uid = buyerUid;
                    }
                }

                client.purchaseCount += 1;
                client.totalSpend += amount;
                client.orders.push({
                    orderId: d.id,
                    ...ord
                });
            });
        } catch (orderErr) {
            console.warn('merchant_orders 조회 실패/스킵:', orderErr);
        }

        // ----------------------------------------------------
        // 3. 데이터 구조화 및 정렬
        // ----------------------------------------------------
        storedClients = Array.from(clientMap.values()).map(c => {
            // 주문 내역 최신순 정렬
            c.orders.sort((a, b) => {
                const tA = a.created_at?.toMillis?.() || (a.created_at?.seconds ? a.created_at.seconds * 1000 : 0);
                const tB = b.created_at?.toMillis?.() || (b.created_at?.seconds ? b.created_at.seconds * 1000 : 0);
                return tB - tA;
            });

            // 고객 유형 판별 (mentee / both / affiliate)
            if (c.isMentee && c.isBuyer) {
                c.relationType = 'both';
            } else if (c.isBuyer) {
                c.relationType = 'affiliate';
            } else {
                c.relationType = 'mentee';
            }

            return c;
        });

        // 멘티+구매고객(both) 및 고액 구매자 우선 정렬
        storedClients.sort((a, b) => {
            if (a.relationType === 'both' && b.relationType !== 'both') return -1;
            if (b.relationType === 'both' && a.relationType !== 'both') return 1;
            return b.totalSpend - a.totalSpend;
        });

        window.renderMentees();
    } catch (e) {
        console.error('loadClients 에러:', e);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="color:#ef4444; text-align:center; padding:2rem;">데이터 로드 실패: ${escapeHtml(e.message)}</td></tr>`;
        }
    }
}

window.renderMentees = function() {
    const tbody = document.getElementById('menteeTableBody');
    if (!tbody) return;

    const filterMerchantVal = document.getElementById('CRM_filterMerchant')?.value || 'ALL';
    const filterRelationVal = document.getElementById('CRM_filterRelation')?.value || 'all';
    const filterAmtVal = document.getElementById('CRM_filterAmount')?.value || 'all';
    const searchVal = (document.getElementById('CRM_search')?.value || '').trim().toLowerCase();

    const filtered = storedClients.filter(c => {
        // 1. 가맹점 필터 (최고관리자 모드)
        if (isSuperAdmin && filterMerchantVal !== 'ALL') {
            if (!matchesMerchant(c.merchantId, filterMerchantVal)) return false;
        }

        // 2. 고객 관계 필터 (전체 / 내 멘티만 / 멘티+구매 / 제휴 회원만)
        if (filterRelationVal !== 'all') {
            if (filterRelationVal === 'both' && c.relationType !== 'both') return false;
            if ((filterRelationVal === 'affiliate' || filterRelationVal === 'buyer') && c.relationType !== 'affiliate') return false;
            if (filterRelationVal === 'mentee' && !c.isMentee) return false;
        }

        // 3. 실적 필터
        if (filterAmtVal !== 'all') {
            if (filterAmtVal === 'purchased' && c.purchaseCount === 0) return false;
            if (filterAmtVal === '5000' && c.points < 5000) return false;
            if (filterAmtVal === '1000' && c.points < 1000) return false;
        }

        // 4. 검색 필터 (이름, 이메일, 전화번호, 구매상품명)
        if (searchVal) {
            const matchName = c.name.toLowerCase().includes(searchVal);
            const matchEmail = c.email.toLowerCase().includes(searchVal);
            const matchPhone = (c.phone || '').toLowerCase().includes(searchVal);
            const matchOrderItems = c.orders.some(o => {
                const summary = (o.items || []).map(it => it.name || it.product_name || '').join(' ').toLowerCase();
                return summary.includes(searchVal);
            });
            if (!matchName && !matchEmail && !matchPhone && !matchOrderItems) return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:3rem; color:#64748b;">조건에 일치하는 고객/멘티 데이터가 없습니다.</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(c => {
        // 회원 구분 뱃지
        let relBadge = '';
        if (c.relationType === 'both') {
            relBadge = '<span class="tag-status" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700;">🌟 내 멘티 + 구매</span>';
        } else if (c.relationType === 'affiliate') {
            relBadge = '<span class="tag-status" style="background:#e0f2fe; color:#0369a1; border:1px solid #bae6fd; font-weight:700;">🤝 제휴 회원</span>';
        } else {
            relBadge = '<span class="tag-status" style="background:#f1f5f9; color:#475569; border:1px solid #e2e8f0; font-weight:600;">👥 내 멘티 회원</span>';
        }

        // 계정 & 연락처
        const emailStr = c.email ? escapeHtml(c.email) : `<span style="color:#94a3b8; font-family:monospace;">${escapeHtml(c.id.substring(0, 10))}...</span>`;
        const phoneStr = c.phone ? `<br><span style="font-size:0.75rem; color:#64748b;">📞 ${escapeHtml(c.phone)}</span>` : '';

        // 구매 실적
        let spendHtml = '';
        if (c.purchaseCount > 0) {
            spendHtml = `<strong style="color:#2563eb; font-size:0.95rem;">₫ ${c.totalSpend.toLocaleString()}</strong><br><span style="font-size:0.75rem; color:#64748b;">(총 ${c.purchaseCount}회 구매)</span>`;
        } else {
            spendHtml = '<span style="color:#94a3b8; font-size:0.85rem;">구매 이력 없음</span>';
        }

        // 포인트
        const pStr = Number(c.points || 0).toLocaleString();

        // 회원 등급
        let tierBadge = `<span class="tag-status tag-new">신규 (NEW)</span>`;
        if (c.totalSpend >= 2000000 || c.points >= 5000) {
            tierBadge = `<span class="tag-status tag-vip">VIP (우수)</span>`;
        } else if (c.purchaseCount > 0 || c.points >= 1000) {
            tierBadge = `<span class="tag-status tag-normal">일반</span>`;
        }

        html += `
            <tr>
                <td>${relBadge}</td>
                <td style="font-size:0.88rem;">${emailStr}${phoneStr}</td>
                <td style="font-weight:600; color:#1e293b;">${escapeHtml(c.name)}</td>
                <td>${spendHtml}</td>
                <td style="color:#059669; font-weight:800;">${pStr} P</td>
                <td>${tierBadge}</td>
                <td>
                    <button onclick="viewOrders('${c.id}')" 
                        style="padding:0.4rem 0.8rem; border:1px solid #cbd5e1; border-radius:0.4rem; background:white; cursor:pointer; font-size:0.78rem; font-weight:600; color:#334155; white-space:nowrap;">
                        📋 구매상세 ${c.purchaseCount > 0 ? `(${c.purchaseCount}건)` : ''}
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
};

window.viewOrders = function(clientId) {
    const client = storedClients.find(x => x.id === clientId);
    if (!client) return;

    const modal = document.getElementById('orderDetailModal');
    const titleEl = document.getElementById('orderModalTitle');
    const custInfoEl = document.getElementById('orderModalCustomerInfo');
    const contentEl = document.getElementById('orderModalContent');

    titleEl.textContent = `🛍️ [${client.name}] 고객 상세 구매 및 회원 내역`;

    // 회원 관계 표시명
    let relLabel = '내 가맹점 직속 멘티 회원';
    if (client.relationType === 'both') relLabel = '내 멘티 & 상품 구매 고객 (VIP)';
    else if (client.relationType === 'affiliate') relLabel = '🤝 제휴 회원 (타 가맹점 가입 · 내 가맹점 구매고객)';

    custInfoEl.innerHTML = `
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.5rem; line-height:1.6;">
            <div><strong>이메일:</strong> ${escapeHtml(client.email || '미입력')}</div>
            <div><strong>연락처:</strong> ${escapeHtml(client.phone || '미등록')}</div>
            <div><strong>회원 구분:</strong> <span style="color:#4F46E5; font-weight:700;">${relLabel}</span></div>
            <div><strong>보유 포인트:</strong> <span style="color:#059669; font-weight:700;">${(client.points || 0).toLocaleString()} P</span></div>
            <div><strong>총 결제 횟수:</strong> <strong>${client.purchaseCount}회</strong></div>
            <div><strong>총 결제 누적액:</strong> <strong style="color:#ef4444;">₫ ${client.totalSpend.toLocaleString()}</strong></div>
        </div>
    `;

    if (client.orders.length === 0) {
        contentEl.innerHTML = `
            <div style="text-align:center; padding:2.5rem; color:#64748b; background:#f8fafc; border-radius:0.5rem; border:1px dashed #cbd5e1;">
                <p style="font-size:1.1rem; margin:0 0 0.5rem 0; font-weight:600; color:#475569;">📦 등록된 상품 구매 이력이 없습니다.</p>
                <p style="font-size:0.85rem; margin:0;">가맹점 웹, 매장 QR 코드 이벤트 또는 초대를 통해 가입한 <strong>내 직속 멘티</strong> 회원입니다.</p>
            </div>
        `;
    } else {
        let orderCardsHtml = client.orders.map(o => {
            const dateStr = o.created_at?.toDate ? o.created_at.toDate().toLocaleString() : (o.created_at?.seconds ? new Date(o.created_at.seconds * 1000).toLocaleString() : '최근');
            const itemsSummary = (o.items || []).map(it => `${escapeHtml(it.name || it.product_name || '상품')} x ${it.qty || 1}개`).join(', ') || '주문 상품 정보';
            
            // 상태 뱃지
            let statusBadge = '<span style="color:#2563eb; font-weight:bold;">접수됨</span>';
            if (o.status === 'completed') statusBadge = '<span style="color:#10b981; font-weight:bold;">✅ 완료/정산완료</span>';
            else if (o.status === 'shipped') statusBadge = '<span style="color:#3b82f6; font-weight:bold;">🚀 발송/배송완료</span>';
            else if (o.status === 'payment_confirmed') statusBadge = '<span style="color:#059669; font-weight:bold;">💰 결제확인</span>';
            else if (o.status === 'cancelled') statusBadge = '<span style="color:#ef4444; font-weight:bold;">취소됨</span>';

            const payMethodStr = o.payment_method === 'bm_wallet' ? '내 지갑 BM' : (o.payment_method === 'bank_transfer' ? '계좌이체' : '일반 결제');

            return `
                <div style="border:1px solid #e2e8f0; border-radius:0.75rem; padding:1.25rem; margin-bottom:1rem; background:white; box-shadow:0 2px 4px rgba(0,0,0,0.02);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; border-bottom:1px solid #f1f5f9; padding-bottom:0.5rem; font-size:0.85rem; color:#64748b;">
                        <span>주문번호: <strong>${escapeHtml(o.orderId || '')}</strong></span>
                        <span>${dateStr}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                        <div style="font-weight:700; color:#1e293b; font-size:1rem;">
                            ${itemsSummary}
                        </div>
                        <div style="font-size:1.15rem; font-weight:800; color:#ef4444;">
                            ₫ ${Number(o.total_amount || o.amount || 0).toLocaleString()}
                        </div>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#475569; margin-top:0.5rem;">
                        <span>결제 수단: ${payMethodStr}</span>
                        <span>진행 상태: ${statusBadge}</span>
                    </div>
                </div>
            `;
        }).join('');

        contentEl.innerHTML = orderCardsHtml;
    }

    modal.style.display = 'flex';
};

window.exportToCSV = function() {
    let csv = '회원구분,계정ID,이메일,이름,연락처,구매건수,총구매액(VND),누적포인트(P)\n';
    storedClients.forEach(c => {
        const relStr = c.relationType === 'both' ? '내멘티+구매' : (c.relationType === 'affiliate' ? '제휴회원(구매고객)' : '내멘티');
        csv += `"${relStr}","${c.id}","${c.email}","${c.name}","${c.phone}",${c.purchaseCount},${c.totalSpend},${c.points}\n`;
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `BEST_ERP_CRM_Clients_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
};

// 권한 확인 후 로드
checkAdminAuth(
    (user) => {
        currentUser = user;
        window.currentUserEmail = user.email;
        loadClients();
    },
    () => {
        const currentUrl = window.location.pathname + window.location.search;
        window.location.href = '../login.html?redirect=' + encodeURIComponent(currentUrl);
    }
);
