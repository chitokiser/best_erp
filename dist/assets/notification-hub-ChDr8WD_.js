var e=`besterp_notifications_v1`,t=`0981234567`,n=[{id:`alert_1`,type:`report`,title:`📸 [현장 사진보고] 미딩 송다타워 누수 점검`,content:`응우옌 반 린 직원이 에어컨 실외기 냉매 충전 및 누수 수리 사진 2장을 등록했습니다.`,time:new Date(Date.now()-9e5).toISOString(),read:!1,url:`field-reports.html`,zaloMsg:`⚡ [BestERP 현장보고]
• 제목: 미딩 송다타워 누수 수리 완료
• 담당: 응우옌 반 린
• 사진 2장 첨부됨
👉 확인: https://besterp.netlify.app/admin/field-reports.html`},{id:`alert_2`,type:`coupon`,title:`🎫 [쿠폰 현장 승인] 50,000 VND 식사 할인권`,content:`손님(김민수 님)의 바우처 [BC-TEST-2026-BEST]가 매장에서 1초 소진 승인되었습니다.`,time:new Date(Date.now()-27e5).toISOString(),read:!1,url:`coupons.html`,zaloMsg:`🎟️ [BestERP 쿠폰승인]
• 코드: BC-TEST-2026-BEST
• 혜택: 50,000 VND 할인
• 상태: 사용 완료
👉 확인: https://besterp.netlify.app/admin/coupons.html`},{id:`alert_3`,type:`stock`,title:`⚠️ [재고 경보] 동관(15A) 재고 2개 잔여`,content:`현재 시공 속도 유지 시 48시간 내 품절이 예상됩니다. 사전 발주를 권장합니다.`,time:new Date(Date.now()-72e5).toISOString(),read:!0,url:`materials.html`,zaloMsg:`⚠️ [BestERP 재고경보]
• 품목: 동관 15A 배관재
• 잔여: 2개 (품절 임박)
👉 확인: https://besterp.netlify.app/admin/materials.html`}];function r(){try{let e=window.AudioContext||window.webkitAudioContext;if(!e)return;let t=new e,n=[587.33,880,1174.66],r=t.currentTime;n.forEach((e,n)=>{let i=t.createOscillator(),a=t.createGain();i.type=`sine`,i.frequency.setValueAtTime(e,r+n*.08),a.gain.setValueAtTime(.12,r+n*.08),a.gain.exponentialRampToValueAtTime(.001,r+n*.08+.32),i.connect(a),a.connect(t.destination),i.start(r+n*.08),i.stop(r+n*.08+.32)})}catch(e){console.warn(`AudioContext 재생 불가:`,e)}}function i(){try{let t=localStorage.getItem(e);return t?JSON.parse(t):(localStorage.setItem(e,JSON.stringify(n)),n)}catch{return n}}function a(t){try{localStorage.setItem(e,JSON.stringify(t))}catch{}}function o(e){let t=e.zaloMsg||`[BestERP 알림] ${e.title}\n${e.content}\nhttps://besterp.netlify.app/admin/${e.url||`dashboard.html`}`;navigator.share?navigator.share({title:e.title,text:t,url:`https://besterp.netlify.app/admin/${e.url||`dashboard.html`}`}).catch(()=>{s(t)}):s(t)}function s(e){navigator.clipboard?navigator.clipboard.writeText(e).then(()=>{alert(`📋 [알림 복사 완료]
알림 내용이 클립보드에 복사되었습니다. 잘로(Zalo) 대화방에 바로 붙여넣기 하실 수 있습니다!`),window.open(`https://zalo.me/${t}`,`_blank`)}).catch(()=>{window.open(`https://zalo.me/${t}`,`_blank`)}):window.open(`https://zalo.me/${t}`,`_blank`)}function c(){let e=document.querySelector(`.nav-header-bar`)||document.querySelector(`.top-nav`);if(!e||document.getElementById(`btnNotificationHub`))return;let n=document.createElement(`div`);n.style.cssText=`display:inline-flex; align-items:center; position:relative; margin-left:auto; margin-right:0.75rem;`,n.innerHTML=`
        <button id="btnNotificationHub" onclick="window.toggleNotificationModal()" title="실시간 알림 센터" style="background:#f1f5f9; border:1px solid #cbd5e1; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:1.15rem; position:relative; transition:all 0.2s;">
            🔔
            <span id="notifBadgeCount" style="position:absolute; top:-3px; right:-3px; background:#ef4444; color:white; font-size:0.65rem; font-weight:800; padding:0.1rem 0.35rem; border-radius:999px; border:2px solid white; display:none;">0</span>
        </button>
    `;let r=e.querySelector(`.mobile-nav-toggle`);if(r?e.insertBefore(n,r):e.appendChild(n),!document.getElementById(`notifModalBackdrop`)){let e=document.createElement(`div`);e.id=`notifModalBackdrop`,e.onclick=e=>{e.target.id===`notifModalBackdrop`&&window.toggleNotificationModal(!1)},e.style.cssText=`display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.45); backdrop-filter:blur(2px); z-index:10000; justify-content:flex-end;`,e.innerHTML=`
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
                    <button onclick="window.open('https://zalo.me/${t}', '_blank')" style="background:#0284c7; color:white; border:none; padding:0.4rem 0.85rem; border-radius:0.35rem; font-size:0.75rem; font-weight:700; cursor:pointer;">
                        잘로 바로가기 →
                    </button>
                </div>
            </div>
        `,document.body.appendChild(e)}window.toggleNotificationModal=e=>{let t=document.getElementById(`notifModalBackdrop`);if(!t)return;let n=typeof e==`boolean`?e:t.style.display===`none`;t.style.display=n?`flex`:`none`,n&&u()},window.markAllNotificationsRead=()=>{let e=i();e.forEach(e=>e.read=!0),a(e),u(),l()},window.triggerZaloShare=e=>{let t=i();t[e]&&o(t[e])},l()}function l(){let e=i().filter(e=>!e.read).length,t=document.getElementById(`notifBadgeCount`);t&&(e>0?(t.textContent=e>9?`9+`:e,t.style.display=`inline-block`):t.style.display=`none`)}function u(){let e=i(),t=document.getElementById(`notifListContainer`),n=document.getElementById(`notifUnreadSummary`),r=e.filter(e=>!e.read).length;if(n&&(n.textContent=`읽지 않은 알림 ${r}개`),t){if(e.length===0){t.innerHTML=`
            <div style="padding:3rem 1rem; text-align:center; color:#94a3b8; font-size:0.875rem;">
                새로운 알림이 없습니다.
            </div>
        `;return}t.innerHTML=e.map((e,t)=>{let n=!e.read,r=d(e.time);return`
            <div style="background:${n?`#f0fdf4`:`#ffffff`}; border:1px solid ${n?`#bbf7d0`:`#e2e8f0`}; border-radius:0.75rem; padding:0.85rem; box-shadow:0 1px 3px rgba(0,0,0,0.03); transition:all 0.15s;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <strong style="font-size:0.85rem; color:#1e293b; display:flex; align-items:center; gap:0.25rem;">
                        ${e.title}
                        ${n?`<span style="width:6px; height:6px; background:#10b981; border-radius:50%; display:inline-block;"></span>`:``}
                    </strong>
                    <span style="font-size:0.7rem; color:#94a3b8;">${r}</span>
                </div>
                <p style="font-size:0.8rem; color:#475569; margin:0.35rem 0 0.65rem 0; line-height:1.45;">
                    ${e.content}
                </p>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #f1f5f9; padding-top:0.5rem;">
                    <a href="${e.url||`dashboard.html`}" style="font-size:0.75rem; font-weight:700; color:var(--ai-primary); text-decoration:none;">
                        페이지 바로가기 →
                    </a>
                    <button onclick="window.triggerZaloShare(${t})" style="background:#0284c7; color:white; border:none; padding:0.25rem 0.6rem; border-radius:0.3rem; font-size:0.7rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:0.25rem;">
                        <span>💬</span> Zalo 전송
                    </button>
                </div>
            </div>
        `}).join(``)}}function d(e){if(!e)return``;let t=Math.floor((Date.now()-new Date(e).getTime())/1e3);return t<60?`방금 전`:t<3600?`${Math.floor(t/60)}분 전`:t<86400?`${Math.floor(t/3600)}시간 전`:`${Math.floor(t/86400)}일 전`}export{r as n,c as t};