/**
 * ==========================================================================
 * BEST ERP - Real-time Notification Hub & Zalo Dispatch
 * 실시간 웹 알림 센터 & 베트남 잘로(Zalo) 알림톡 연동 모듈
 * ==========================================================================
 */

import { db, auth } from './firebase-config.js';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { loadDynamicTenants, getCurrentStoreInfo } from './tenant-router.js';

const STORAGE_KEY = 'besterp_notifications_v1';
const LIVE_READ_KEY = 'besterp_order_alerts_read_v1';
// 예전 버전이 첫 실행 때 넣어 둔 예시 알림. 실제 데이터가 아니므로 화면에서 뺀다.
const DEMO_ALERT_IDS = new Set(['alert_1', 'alert_2', 'alert_3']);
// 결제 대기(송금 전) 온라인 주문은 최근 것만 알린다
const NEW_ORDER_ALERT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const BEST_ZALO_PHONE = '0981234567'; // 가맹점 대표 Zalo 연락처

// Web Audio API 무손실 D5-A5-D6 알림 차임벨
export function playNotificationSound() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();

        const notes = [587.33, 880.00, 1174.66]; // D5 -> A5 -> D6
        const now = ctx.currentTime;

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0.12, now + idx * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.32);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.32);
        });
    } catch (e) {
        console.warn('AudioContext 재생 불가:', e);
    }
}

// 로컬 저장소 로드 (예시 알림 제외)
function getLocalNotifications() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        if (!Array.isArray(list)) return [];
        const real = list.filter(x => x && !DEMO_ALERT_IDS.has(x.id));
        if (real.length !== list.length) {
            // 예전에 저장된 예시 알림을 브라우저 저장소에서도 지운다
            localStorage.setItem(STORAGE_KEY, JSON.stringify(real));
        }
        return real;
    } catch (e) {
        return [];
    }
}

// 실시간 주문 알림(입금확인 요청 · 신규 온라인 주문) + 로컬 알림을 최신순으로 합친다
export function getNotifications() {
    const readKeys = getLiveReadKeys();
    const live = Array.from(liveOrderAlerts.values()).map(a => ({ ...a, read: readKeys.has(a.id) }));
    return [...live, ...getLocalNotifications()]
        .sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());
}

// 저장 (실시간 주문 알림은 읽음 여부만 따로 보관)
export function saveNotifications(list) {
    try {
        const readKeys = getLiveReadKeys();
        const local = [];
        list.forEach(item => {
            if (item.live) {
                if (item.read) readKeys.add(item.id);
            } else {
                local.push(item);
            }
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
        localStorage.setItem(LIVE_READ_KEY, JSON.stringify(Array.from(readKeys).slice(-500)));
    } catch (e) {}
}

function getLiveReadKeys() {
    try {
        const arr = JSON.parse(localStorage.getItem(LIVE_READ_KEY) || '[]');
        return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
        return new Set();
    }
}

// ==========================================================================
// 실시간 주문 알림: merchant_orders 에서 이 가맹점의 결제 대기 / 입금확인 요청 주문을 구독
// (BestClubVN 쇼핑몰 주문 → payment_status 'awaiting_payment' → 고객 '송금 확인 요청' 시 'deposit_requested')
// ==========================================================================
const liveOrderAlerts = new Map(); // alertId -> alert
const liveOrderDocs = new Map();   // `${listenerKey}` -> Map(orderId -> order)
let liveUnsubs = [];
let liveStarted = false;
let liveInitialDone = false;

function tsToIso(v) {
    if (!v) return null;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    if (typeof v.seconds === 'number') return new Date(v.seconds * 1000).toISOString();
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
}

function escHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function orderToAlert(id, o) {
    const status = String(o.status || '').toLowerCase();
    if (['cancelled', 'canceled', '취소', 'completed', 'shipped', 'payment_confirmed'].includes(status)) return null;
    const pay = String(o.payment_status || '');
    const amount = Number(o.total_amount || o.totalAmount || o.amount || 0);
    const buyer = o.buyer_name || (o.buyer_email ? String(o.buyer_email).split('@')[0] : '') || '고객';
    const items = (Array.isArray(o.items) ? o.items : [])
        .map(it => `${it.product_name || it.name || '상품'} × ${Number(it.qty || it.quantity || 1)}`)
        .join(', ');
    const isDelivery = !o.tableNumber && !!(o.shipping_address || o.shipping_phone);
    const shipTxt = isDelivery ? ` · 배송지: ${o.shipping_address || '-'}` : '';
    const url = `kitchen-orders.html${window.location.search || ''}`;
    const shortId = id.slice(0, 8);

    if (pay === 'deposit_requested') {
        return {
            id: `order:${id}:deposit`,
            live: true,
            type: 'payment',
            title: `💰 [입금확인 요청] ${escHtml(buyer)} · ${amount.toLocaleString()} VND`,
            content: `송금자 <strong>${escHtml(o.depositor_name || '미입력')}</strong> 님이 계좌이체 확인을 요청했습니다. 통장 확인 후 주문 알림판에서 <strong>입금 확인</strong>을 눌러 주세요.<br/>주문 ${escHtml(shortId)} · ${escHtml(items || '상품 정보 없음')}${escHtml(shipTxt)}`,
            time: tsToIso(o.deposit_requested_at) || tsToIso(o.updated_at) || tsToIso(o.created_at) || new Date().toISOString(),
            url,
            zaloMsg: `💰 [BestERP 입금확인 요청]\n• 주문: ${shortId}\n• 고객: ${buyer}\n• 송금자: ${o.depositor_name || '미입력'}\n• 금액: ${amount.toLocaleString()} VND\n• 상품: ${items}${isDelivery ? `\n• 배송지: ${o.shipping_address || '-'}` : ''}`
        };
    }
    if (pay === 'awaiting_payment' && isDelivery) {
        const created = tsToIso(o.created_at);
        if (created && Date.now() - new Date(created).getTime() > NEW_ORDER_ALERT_WINDOW_MS) return null;
        return {
            id: `order:${id}:new`,
            live: true,
            type: 'order',
            title: `🛒 [신규 온라인 주문] ${escHtml(buyer)} · ${amount.toLocaleString()} VND`,
            content: `배송 주문이 접수되었습니다. 고객 결제(송금) 전입니다.<br/>주문 ${escHtml(shortId)} · ${escHtml(items || '상품 정보 없음')}${escHtml(shipTxt)}`,
            time: created || new Date().toISOString(),
            url,
            zaloMsg: `🛒 [BestERP 신규 온라인 주문]\n• 주문: ${shortId}\n• 고객: ${buyer}\n• 금액: ${amount.toLocaleString()} VND\n• 상품: ${items}\n• 배송지: ${o.shipping_address || '-'}`
        };
    }
    return null;
}

function rebuildLiveAlerts() {
    const before = new Set(liveOrderAlerts.keys());
    liveOrderAlerts.clear();
    liveOrderDocs.forEach(orders => {
        orders.forEach((o, id) => {
            const alert = orderToAlert(id, o);
            if (alert) liveOrderAlerts.set(alert.id, alert);
        });
    });
    const readKeys = getLiveReadKeys();
    const hasNewUnread = Array.from(liveOrderAlerts.keys()).some(k => !before.has(k) && !readKeys.has(k));
    if (liveInitialDone && hasNewUnread) {
        playNotificationSound();
    }
    updateBadge();
    const modal = document.getElementById('notifModalBackdrop');
    if (modal && modal.style.display !== 'none') renderNotificationItems();
}

function waitForTenant(timeoutMs = 15000) {
    return new Promise(resolve => {
        const started = Date.now();
        const tick = () => {
            const t = window.tenantId;
            if ((t && t !== 'undefined' && t !== 'null') || window.currentUserRole || Date.now() - started > timeoutMs) {
                resolve();
                return;
            }
            setTimeout(tick, 300);
        };
        tick();
    });
}

function stopLiveOrderAlerts() {
    liveUnsubs.forEach(fn => { try { fn(); } catch (_) {} });
    liveUnsubs = [];
    liveOrderDocs.clear();
    liveOrderAlerts.clear();
    liveStarted = false;
    liveInitialDone = false;
    updateBadge();
}

async function startLiveOrderAlerts() {
    if (liveStarted) return;
    liveStarted = true;
    await waitForTenant();
    await loadDynamicTenants();
    const info = getCurrentStoreInfo();
    const sid = String(info.storeId || '').trim();
    if (!sid || sid === 'ALL') return; // 전체 보기/미소속 계정은 구독하지 않음

    // 주문의 merchant_id 는 문자열·숫자·슬러그가 섞여 있다
    const candidates = [sid];
    const num = Number(sid);
    if (Number.isFinite(num) && String(num) === sid) candidates.push(num);
    if (info.slug && info.slug !== sid) candidates.push(info.slug);

    let pending = candidates.length;
    candidates.forEach((mid, idx) => {
        const key = `m${idx}`;
        liveOrderDocs.set(key, new Map());
        const q = query(
            collection(db, 'merchant_orders'),
            where('merchant_id', '==', mid),
            where('payment_status', 'in', ['deposit_requested', 'awaiting_payment']),
            limit(50)
        );
        let first = true;
        const unsub = onSnapshot(q, snap => {
            const map = new Map();
            snap.docs.forEach(d => map.set(d.id, d.data()));
            liveOrderDocs.set(key, map);
            if (first) {
                first = false;
                pending -= 1;
                if (pending <= 0) liveInitialDone = true;
            }
            rebuildLiveAlerts();
        }, err => {
            console.warn('실시간 주문 알림 구독 실패:', err?.message || err);
            if (first) {
                first = false;
                pending -= 1;
                if (pending <= 0) liveInitialDone = true;
            }
        });
        liveUnsubs.push(unsub);
    });
}

// 잘로(Zalo) 공유 핸들러
export function shareToZalo(alertItem) {
    const text = alertItem.zaloMsg || `[BestERP 알림] ${alertItem.title}\n${alertItem.content}\nhttps://besterp.netlify.app/admin/${alertItem.url || 'dashboard.html'}`;
    
    // 모바일 Web Share API 시도
    if (navigator.share) {
        navigator.share({
            title: alertItem.title,
            text: text,
            url: `https://besterp.netlify.app/admin/${alertItem.url || 'dashboard.html'}`
        }).catch(() => {
            openZaloDirect(text);
        });
    } else {
        openZaloDirect(text);
    }
}

function openZaloDirect(text) {
    // 클립보드에 복사 후 Zalo 열기
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            alert('📋 [알림 복사 완료]\n알림 내용이 클립보드에 복사되었습니다. 잘로(Zalo) 대화방에 바로 붙여넣기 하실 수 있습니다!');
            window.open(`https://zalo.me/${BEST_ZALO_PHONE}`, '_blank');
        }).catch(() => {
            window.open(`https://zalo.me/${BEST_ZALO_PHONE}`, '_blank');
        });
    } else {
        window.open(`https://zalo.me/${BEST_ZALO_PHONE}`, '_blank');
    }
}

// 알림 센터 UI 초기화 및 헤더에 종 버튼 자동 마운트
export function initNotificationHub() {
    // 1. 헤더 종 버튼 주입
    const navBar = document.querySelector('.nav-header-bar') || document.querySelector('.top-nav');
    if (!navBar || document.getElementById('btnNotificationHub')) return;

    const bellWrap = document.createElement('div');
    bellWrap.style.cssText = 'display:inline-flex; align-items:center; position:relative; margin-left:auto; margin-right:0.75rem;';
    bellWrap.innerHTML = `
        <button id="btnNotificationHub" onclick="window.toggleNotificationModal()" title="실시간 알림 센터" style="background:#f1f5f9; border:1px solid #cbd5e1; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.15rem; position:relative; transition:all 0.2s;">
            🔔
            <span id="notifBadgeCount" style="position:absolute; top:-3px; right:-3px; background:#ef4444; color:white; font-size:0.65rem; font-weight:800; padding:0.1rem 0.35rem; border-radius:999px; border:2px solid white; display:none;">0</span>
        </button>
    `;

    // 모바일 토글 버튼 앞에 삽입
    const toggleBtn = navBar.querySelector('.mobile-nav-toggle');
    if (toggleBtn) {
        navBar.insertBefore(bellWrap, toggleBtn);
    } else {
        navBar.appendChild(bellWrap);
    }

    // 2. 알림 센터 모달 마운트
    if (!document.getElementById('notifModalBackdrop')) {
        const modalEl = document.createElement('div');
        modalEl.id = 'notifModalBackdrop';
        modalEl.onclick = (e) => {
            if (e.target.id === 'notifModalBackdrop') window.toggleNotificationModal(false);
        };
        modalEl.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.45); backdrop-filter:blur(2px); z-index:10000; justify-content:flex-end;';
        modalEl.innerHTML = `
            <div id="notifModalDrawer" style="background:white; width:100%; max-width:440px; height:100%; display:flex; flex-direction:column; box-shadow:-8px 0 25px rgba(0,0,0,0.15); animation:slideInRight 0.25s ease-out;">
                <!-- Header -->
                <div style="background:var(--ai-gradient); color:white; padding:1.15rem 1.25rem; display:flex; justify-content:space-between; align-items:center;">
                    <div style="display:flex; align-items:center; gap:0.4rem;">
                        <span style="font-size:1.2rem;">🔔</span>
                        <h3 style="margin:0; font-size:1.1rem; font-weight:800;">실시간 알림 센터</h3>
                    </div>
                    <button onclick="window.toggleNotificationModal(false)" style="background:rgba(255,255,255,0.2); border:none; color:white; width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:0.9rem; font-weight:700;">✕</button>
                </div>

                <!-- Sub-bar -->
                <div style="padding:0.75rem 1.25rem; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; color:#64748b; font-weight:600;" id="notifUnreadSummary">읽지 않은 알림 0개</span>
                    <button onclick="window.markAllNotificationsRead()" style="background:none; border:none; color:var(--ai-primary); font-size:0.775rem; font-weight:700; cursor:pointer;">모두 읽음 표시</button>
                </div>

                <!-- Notification List Body -->
                <div id="notifListContainer" style="flex:1; overflow-y:auto; padding:1rem; display:flex; flex-direction:column; gap:0.65rem;">
                    <!-- Items go here -->
                </div>

                <!-- Footer Zalo Direct -->
                <div style="padding:0.85rem 1.25rem; border-top:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.75rem; color:#64748b;">
                        💬 베트남 Zalo 상담: <strong style="color:#0284c7;">098-123-4567</strong>
                    </div>
                    <button onclick="window.open('https://zalo.me/${BEST_ZALO_PHONE}', '_blank')" style="background:#0284c7; color:white; border:none; padding:0.4rem 0.85rem; border-radius:0.35rem; font-size:0.75rem; font-weight:700; cursor:pointer;">
                        잘로 바로가기 →
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);
    }

    // 3. 전역 함수 바인딩
    window.toggleNotificationModal = (forceState) => {
        const modal = document.getElementById('notifModalBackdrop');
        if (!modal) return;
        const isShow = typeof forceState === 'boolean' ? forceState : modal.style.display === 'none';
        modal.style.display = isShow ? 'flex' : 'none';
        if (isShow) {
            renderNotificationItems();
        }
    };

    window.markAllNotificationsRead = () => {
        const list = getNotifications();
        list.forEach(item => item.read = true);
        saveNotifications(list);
        renderNotificationItems();
        updateBadge();
    };

    window.triggerZaloShare = (index) => {
        const list = getNotifications();
        if (list[index]) {
            shareToZalo(list[index]);
        }
    };

    updateBadge();

    // 4. 실시간 주문(입금확인 요청) 알림 구독 — 로그인 후 시작, 로그아웃 시 해제
    onAuthStateChanged(auth, user => {
        if (user) {
            startLiveOrderAlerts().catch(e => console.warn('실시간 주문 알림 시작 실패:', e?.message || e));
        } else {
            stopLiveOrderAlerts();
        }
    });
}

function updateBadge() {
    const list = getNotifications();
    const unread = list.filter(x => !x.read).length;
    const badge = document.getElementById('notifBadgeCount');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 9 ? '9+' : unread;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderNotificationItems() {
    const list = getNotifications();
    const container = document.getElementById('notifListContainer');
    const summary = document.getElementById('notifUnreadSummary');
    const unreadCount = list.filter(x => !x.read).length;

    if (summary) summary.textContent = `읽지 않은 알림 ${unreadCount}개`;

    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div style="padding:3rem 1rem; text-align:center; color:#94a3b8; font-size:0.875rem;">
                새로운 알림이 없습니다.
            </div>
        `;
        return;
    }

    container.innerHTML = list.map((item, idx) => {
        const isUnread = !item.read;
        const timeStr = formatTimeAgo(item.time);

        return `
            <div style="background:${isUnread ? '#f0fdf4' : '#ffffff'}; border:1px solid ${isUnread ? '#bbf7d0' : '#e2e8f0'}; border-radius:0.75rem; padding:0.85rem; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.15s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong style="font-size:0.85rem; color:#1e293b; display:flex; align-items:center; gap:0.25rem;">
                        ${item.title}
                        ${isUnread ? '<span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span>' : ''}
                    </strong>
                    <span style="font-size:0.7rem; color:#94a3b8;">${timeStr}</span>
                </div>
                <p style="font-size:0.8rem; color:#475569; margin:0.35rem 0 0.65rem 0; line-height:1.45;">
                    ${item.content}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:0.5rem;">
                    <a href="${item.url || 'dashboard.html'}" style="font-size:0.75rem; font-weight:700; color:var(--ai-primary); text-decoration:none;">
                        페이지 바로가기 →
                    </a>
                    <button onclick="window.triggerZaloShare(${idx})" style="background:#0284c7; color:white; border:none; padding:0.25rem 0.6rem; border-radius:0.3rem; font-size:0.7rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;">
                        <span>💬</span> Zalo 전송
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function formatTimeAgo(timeStr) {
    if (!timeStr) return '';
    const diff = Math.floor((Date.now() - new Date(timeStr).getTime()) / 1000);
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
}
