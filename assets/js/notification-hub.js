/**
 * ==========================================================================
 * BEST ERP - Real-time Notification Hub & Zalo Dispatch
 * 실시간 웹 알림 센터 & 베트남 잘로(Zalo) 알림톡 연동 모듈
 * ==========================================================================
 */

const STORAGE_KEY = 'besterp_notifications_v1';
const BEST_ZALO_PHONE = '0981234567'; // 가맹점 대표 Zalo 연락처

// 초기 프리셋 알림 (첫 실행 시 바로 확인할 수 있도록 탑재)
const DEFAULT_ALERTS = [
    {
        id: 'alert_1',
        type: 'report',
        title: '📸 [현장 사진보고] 미딩 송다타워 누수 점검',
        content: '응우옌 반 린 직원이 에어컨 실외기 냉매 충전 및 누수 수리 사진 2장을 등록했습니다.',
        time: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        read: false,
        url: 'field-reports.html',
        zaloMsg: '⚡ [BestERP 현장보고]\n• 제목: 미딩 송다타워 누수 수리 완료\n• 담당: 응우옌 반 린\n• 사진 2장 첨부됨\n👉 확인: https://besterp.netlify.app/admin/field-reports.html'
    },
    {
        id: 'alert_2',
        type: 'coupon',
        title: '🎫 [쿠폰 현장 승인] 50,000 VND 식사 할인권',
        content: '손님(김민수 님)의 바우처 [BC-TEST-2026-BEST]가 매장에서 1초 소진 승인되었습니다.',
        time: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        read: false,
        url: 'coupons.html',
        zaloMsg: '🎟️ [BestERP 쿠폰승인]\n• 코드: BC-TEST-2026-BEST\n• 혜택: 50,000 VND 할인\n• 상태: 사용 완료\n👉 확인: https://besterp.netlify.app/admin/coupons.html'
    },
    {
        id: 'alert_3',
        type: 'stock',
        title: '⚠️ [재고 경보] 동관(15A) 재고 2개 잔여',
        content: '현재 시공 속도 유지 시 48시간 내 품절이 예상됩니다. 사전 발주를 권장합니다.',
        time: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        read: true,
        url: 'materials.html',
        zaloMsg: '⚠️ [BestERP 재고경보]\n• 품목: 동관 15A 배관재\n• 잔여: 2개 (품절 임박)\n👉 확인: https://besterp.netlify.app/admin/materials.html'
    }
];

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

// 로컬 저장소 로드
export function getNotifications() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ALERTS));
            return DEFAULT_ALERTS;
        }
        return JSON.parse(raw);
    } catch (e) {
        return DEFAULT_ALERTS;
    }
}

// 저장
export function saveNotifications(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
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
