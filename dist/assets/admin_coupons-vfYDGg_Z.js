import{D as e,E as t,S as n,T as r,k as i,n as a,v as o,w as s}from"./firebase-config-BURgN9gX.js";/* empty css              */import{t as c}from"./auth-iIMH-e68.js";/* empty css              */import{t as l}from"./notification-hub-ChDr8WD_.js";l();var u=`1791605366`,d=null,f=!1,p=[],m={"BC-TEST-2026-BEST":{id:`demo_1`,code:`BC-TEST-2026-BEST`,title:`베스트클럽 오프라인 50,000 VND 식사 할인권`,benefit:`50,000 VND 즉시 할인`,customerName:`김민수 (VIP 회원)`,expiresAt:`2026-12-31`,status:`available`,applicableMerchantIds:[`1791605366`,`1791002036`]},"BC-LUCKY-7777-VND":{id:`demo_2`,code:`BC-LUCKY-7777-VND`,title:`잭팟 룰렛 당첨 100,000 VND 세트메뉴 할인 바우처`,benefit:`100,000 VND 할인 (세트 전용)`,customerName:`Nguyen Van A (일반)`,expiresAt:`2026-11-30`,status:`available`,applicableMerchantIds:[`1791605366`]},"BC-FREE-DRINK-CAN":{id:`demo_3`,code:`BC-FREE-DRINK-CAN`,title:`방문 감사 웰컴 탄산음료 1캔 무료 증정권`,benefit:`콜라/사이다 1캔 무료 교환`,customerName:`박지원 (단골)`,expiresAt:`2026-11-15`,status:`available`,applicableMerchantIds:[`1791605366`]}};window.fillPresetCode=e=>{document.getElementById(`couponCodeInput`).value=e,window.lookupCoupon()},window.startQrScanner=async()=>{let e=document.getElementById(`btnStartScan`),t=document.getElementById(`btnStopScan`);try{d||=new Html5Qrcode(`qrReader`),await d.start({facingMode:`environment`},{fps:10,qrbox:{width:250,height:250}},e=>{console.log(`QR 스캔 성공:`,e);let t=e.trim();t.includes(`code=`)&&(t=t.split(`code=`)[1].split(`&`)[0]),document.getElementById(`couponCodeInput`).value=t,stopQrScanner(),window.lookupCoupon(t)},e=>{}),f=!0,e.style.display=`none`,t.style.display=`inline-flex`}catch(e){alert(`카메라 실행 실패: `+e.message+`
카메라 접근 권한을 확인해 주세요.`)}},window.stopQrScanner=async()=>{if(d&&f){try{await d.stop()}catch{}f=!1,document.getElementById(`btnStartScan`).style.display=`inline-flex`,document.getElementById(`btnStopScan`).style.display=`none`}},document.getElementById(`couponCodeInput`).addEventListener(`input`,e=>{let t=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,``);!t.startsWith(`BC`)&&t.length>=2&&(t=`BC`+t);let n=``;for(let e=0;e<t.length;e++)(e===2||e===6||e===10)&&(n+=`-`),n+=t[e];e.target.value=n.slice(0,19)}),window.lookupCoupon=async(e=null)=>{let i=(e||document.getElementById(`couponCodeInput`).value).trim().toUpperCase(),s=document.getElementById(`couponResultBox`);if(!i||i.length<5){alert(`유효한 12자리 바우처 코드를 입력하세요.`);return}s.innerHTML=`
                <div style="padding:1.5rem; text-align:center; color:var(--ai-primary); font-weight:700;">
                    ⏳ 원장에서 쿠폰 유효성을 검증하는 중입니다...
                </div>
            `;try{let e=null;try{let s=await o(n(t(a,`user_coupons`),r(`code`,`==`,i)));s.empty||(e={id:s.docs[0].id,...s.docs[0].data()})}catch(e){console.warn(`Firestore 조회 대체:`,e)}if(!e&&m[i]&&(e=m[i]),!e){s.innerHTML=`
                        <div class="coupon-invalid-card">
                            <div style="display:flex; align-items:center; gap:0.5rem; color:#b91c1c; font-weight:800;">
                                <span style="font-size:1.3rem;">✕</span>
                                <span>존재하지 않는 바우처 코드입니다</span>
                            </div>
                            <p style="font-size:0.85rem; color:#7f1d1d; margin:0.4rem 0 0 0;">
                                입력하신 코드 <strong>${i}</strong>는 발급 내역이 확인되지 않습니다. 코드를 다시 확인해 주세요.
                            </p>
                        </div>
                    `;return}let c=e.status===`available`||e.status===`VALID`,l=e.expiresAt&&new Date(e.expiresAt)<new Date,d=!e.applicableMerchantIds||e.applicableMerchantIds.includes(u);if(!c){s.innerHTML=`
                        <div class="coupon-invalid-card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:800; color:#b91c1c; font-size:1rem;">⚠️ 이미 사용 완료된 쿠폰입니다</span>
                                <span class="badge-pill" style="background:#fee2e2; color:#b91c1c;">사용 불가</span>
                            </div>
                            <h4 style="margin:0.5rem 0 0.2rem 0; font-size:1.05rem; color:#1e293b;">${e.title||e.name||`베스트클럽 바우처`}</h4>
                            <p style="font-size:0.8rem; color:#64748b; margin:0;">고객: ${e.customerName||e.user_email||`회원`}</p>
                            <p style="font-size:0.8rem; color:#dc2626; margin:0.4rem 0 0 0;">이 쿠폰은 이미 매장에서 사용 처리되었습니다.</p>
                        </div>
                    `;return}if(l){s.innerHTML=`
                        <div class="coupon-invalid-card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:800; color:#b91c1c; font-size:1rem;">⌛ 유효기간이 만료된 쿠폰입니다</span>
                                <span class="badge-pill" style="background:#fee2e2; color:#b91c1c;">기간 만료</span>
                            </div>
                            <h4 style="margin:0.5rem 0 0.2rem 0; font-size:1.05rem; color:#1e293b;">${e.title||e.name}</h4>
                            <p style="font-size:0.8rem; color:#dc2626; margin:0.4rem 0 0 0;">만료일: ${e.expiresAt}</p>
                        </div>
                    `;return}if(!d){s.innerHTML=`
                        <div class="coupon-invalid-card">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span style="font-weight:800; color:#b91c1c; font-size:1rem;">🚫 타 가맹점 전용 바우처입니다</span>
                                <span class="badge-pill" style="background:#fee2e2; color:#b91c1c;">가맹점 불일치</span>
                            </div>
                            <p style="font-size:0.8rem; color:#dc2626; margin:0.4rem 0 0 0;">현재 매장(${u})에서는 사용할 수 없는 타 가맹점 전용 바우처입니다.</p>
                        </div>
                    `;return}window.currentValidatedCoupon=e,s.innerHTML=`
                    <div class="coupon-valid-card">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-weight:800; color:#166534; font-size:1.05rem;">✅ 사용 가능한 정품 바우처입니다!</span>
                            <span class="badge-pill" style="background:#d1fae5; color:#065f46; font-weight:800;">승인 대기</span>
                        </div>
                        <h4 style="margin:0.6rem 0 0.3rem 0; font-size:1.15rem; color:#1e293b; font-weight:800;">
                            ${e.title||e.name||`베스트클럽 바우처`}
                        </h4>
                        <div style="background:white; border-radius:0.5rem; padding:0.75rem; margin:0.6rem 0; font-size:0.85rem; line-height:1.6; border:1px solid #bbf7d0;">
                            <div><strong>적용 혜택:</strong> <span style="color:#059669; font-weight:800; font-size:1rem;">${e.benefit||`할인`}</span></div>
                            <div><strong>고객 정보:</strong> ${e.customerName||e.user_email||`BestClub 회원`}</div>
                            <div><strong>유효 기간:</strong> ~ ${e.expiresAt||`2026-12-31`}</div>
                            <div><strong>바우처 번호:</strong> <code style="font-weight:700;">${i}</code></div>
                        </div>

                        <button id="btnRedeemAction" onclick="confirmRedeemCoupon()" style="width:100%; background:#10b981; color:white; border:none; padding:0.85rem; border-radius:0.65rem; font-size:1rem; font-weight:800; cursor:pointer; box-shadow:0 4px 12px rgba(16,185,129,0.3); transition:all 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
                            ✓ 지금 현장 사용 승인 (쿠폰 소진)
                        </button>
                    </div>
                `}catch(e){s.innerHTML=`<div class="coupon-invalid-card">조회 에러: ${e.message}</div>`}},window.confirmRedeemCoupon=async()=>{let t=document.getElementById(`btnRedeemAction`);if(!window.currentValidatedCoupon)return;t.disabled=!0,t.textContent=`처리 중...`,t.style.opacity=`0.7`;let n=window.currentValidatedCoupon,r=new Date,o=`${r.getHours()}:${String(r.getMinutes()).padStart(2,`0`)}:${String(r.getSeconds()).padStart(2,`0`)}`;try{n.id&&!n.id.startsWith(`demo_`)?await s(e(a,`user_coupons`,n.id),{status:`used`,redeemedAt:i(),redeemedMerchantId:u}):n.status=`used`,p.unshift({time:o,code:n.code,title:n.title,customer:n.customerName,status:`승인완료`}),h(),alert(`🎉 [현장 승인 성공]\n\n• 쿠폰명: ${n.title}\n• 혜택: ${n.benefit}\n• 상태: 사용 완료(소진)\n\n고객 결제 시 해당 할인을 적용해 주세요!`),document.getElementById(`couponCodeInput`).value=``,document.getElementById(`couponResultBox`).innerHTML=`
                    <div style="border:2px solid #10b981; background:#ecfdf5; border-radius:0.75rem; padding:1.5rem; text-align:center; color:#065f46; font-weight:700;">
                        ✓ 방금 <strong>${n.code}</strong> 승인이 완료되었습니다.<br>다음 손님의 쿠폰을 스캔하거나 입력해 주세요.
                    </div>
                `,window.currentValidatedCoupon=null}catch(e){alert(`승인 처리 실패: `+e.message),t.disabled=!1,t.textContent=`✓ 지금 현장 사용 승인 (쿠폰 소진)`,t.style.opacity=`1`}};function h(){let e=document.getElementById(`redeemHistoryBody`);if(document.getElementById(`todayRedeemCount`).textContent=p.length,p.length===0){e.innerHTML=`<tr><td colspan="5" style="padding:2rem; text-align:center; color:#94a3b8;">아직 오늘 승인된 쿠폰 내역이 없습니다.</td></tr>`;return}e.innerHTML=p.map(e=>`
                <tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:0.75rem 1rem; color:#64748b; font-family:monospace;">${e.time}</td>
                    <td style="padding:0.75rem 1rem; font-weight:700; color:#1e293b; font-family:monospace;">${e.code}</td>
                    <td style="padding:0.75rem 1rem; font-weight:600; color:#4F46E5;">${e.title}</td>
                    <td style="padding:0.75rem 1rem; color:#475569;">${e.customer}</td>
                    <td style="padding:0.75rem 1rem;">
                        <span class="badge-pill" style="background:#d1fae5; color:#065f46; font-weight:800;">✓ ${e.status}</span>
                    </td>
                </tr>
            `).join(``)}c(e=>{u=window.tenantId||(e.email,`1791605366`),document.getElementById(`currentMerchantDisplay`).textContent=u},()=>{location.href=`../login.html?redirect=`+encodeURIComponent(location.pathname)});