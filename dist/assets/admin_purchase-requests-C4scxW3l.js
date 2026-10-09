import"./firebase-config-BYplozKK.js";import{r as e,t}from"./auth-CRbH8qNP.js";/* empty css              */import{i as n,n as r,r as i}from"./purchaseApi-CysAznCA.js";var a=document.getElementById(`requestsContainer`),o=async()=>{try{window.currentRequests=await i();let e=window.currentRequests;if(e.length===0){a.innerHTML=`<p>현재 대기 중이거나 처리된 결재건이 없습니다.</p>`;return}let t=``;e.forEach(e=>{let n=`bg-yellow`,r=`팀장 승인 대기`;e.status===`PENDING_CEO`&&(n=`bg-orange`,r=`CEO 승인 대기`),e.status===`APPROVED`&&(n=`bg-green`,r=`승인 완료 (구매 대기)`),e.status===`PURCHASED`&&(n=`bg-blue`,r=`구매/발주 완료`);let i=e.createdAt?new Date(e.createdAt.seconds*1e3).toLocaleString():`방금 전`,a=`<ul class="item-list">`;e.items.forEach(e=>{a+=`<li>${e.name} (수량: ${e.quantity}) - ${(e.price*e.quantity).toLocaleString()} VND</li>`}),a+=`</ul>`;let o=e.requesterName.includes(window.currentUserEmail||`UNLOADED_EMAIL`),s=``;(o||window.currentUserEmail===`daguri75@gmail.com`)&&(e.status!==`PURCHASED`&&(s+=`<button class="btn-primary" style="background:#475569;" onclick="window.handleEdit('${e.id}')">수정(장바구니 이동)</button>`),s+=`<button class="btn-primary" style="background:#ef4444;" onclick="window.handleDelete('${e.id}')">삭제</button>`);let c=window.currentUserRole||`GUEST`,l=c===`SUPER_ADMIN`||c===`PM`,u=c===`SUPER_ADMIN`,d=``;e.status===`PENDING_TEAM_LEAD`&&l?d=`<button class="btn-primary" onclick="window.handleApprove('${e.id}', 'PENDING_CEO')">팀장 승인</button>`:e.status===`PENDING_CEO`&&u?d=`<button class="btn-primary" style="background:#059669;" onclick="window.handleApprove('${e.id}', 'APPROVED')">CEO 최종 승인</button>`:e.status===`APPROVED`&&l&&(d=`<button class="btn-primary" style="background:#2563eb;" onclick="window.handleApprove('${e.id}', 'PURCHASED')">발주 처리</button>`),t+=`
                        <div class="request-card">
                            <div style="display:flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                                <div>
                                    <span class="badge ${n}">${r}</span>
                                    <h3 style="margin: 0.5rem 0;">${e.department} - ${e.requesterName}</h3>
                                    <p style="font-size: 0.875rem; color: #64748b;">상신일: ${i}</p>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 1.25rem; font-weight: bold; color: var(--primary-color);">
                                        총 ${e.totalAmount?e.totalAmount.toLocaleString():`0`} VND
                                    </div>
                                    <div style="margin-top: 0.5rem; display:flex; gap:0.5rem; justify-content:flex-end;">
                                        ${s}
                                    </div>
                                </div>
                            </div>
                            
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                <strong>요청 사유:</strong>
                                <p style="font-size: 0.875rem; margin-top: 0.25rem; margin-bottom: 1rem;">${e.notes||`없음`}</p>
                                <strong>요청 자재 품목:</strong>
                                ${a}
                            </div>
                            
                            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                                ${d}
                            </div>
                        </div>
                    `}),a.innerHTML=t}catch(e){console.error(e),a.innerHTML=`<p style="color:red;">결재 목록을 불러오는 중 오류가 발생했습니다.</p>`}};window.renderRequests=o,window.handleApprove=async(e,t)=>{if(confirm(`이 결재건을 승인/진행 하시겠습니까?`))try{await n(e,t,`Admin User`),o()}catch(e){alert(`처리 중 오류가 발생했습니다: `+e.message)}},window.handleDelete=async e=>{if(confirm(`정말로 이 기안/결재 요청을 완전히 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)`))try{await r(e),alert(`삭제되었습니다.`),o()}catch(e){alert(`삭제 중 오류: `+e.message)}},window.handleEdit=async e=>{let t=(window.currentRequests||[]).find(t=>t.id===e);if(t&&confirm(`현재 장바구니에 담긴 내역이 있다면 초기화되고, 이 요청의 품목들로 장바구니가 덮어씌워집니다.
기존 결재건은 즉시 "삭제" 처리됩니다. 계속하시겠습니까?`))try{localStorage.setItem(`best_cart`,JSON.stringify(t.items)),await r(e),alert(`결재 요청이 회수되었습니다. 자재 장바구니 화면으로 이동하여 수정 후 다시 상신해주세요.`),window.location.href=`../request-form.html`}catch(e){alert(`수정 처리 중 에러: `+e.message)}},o(),t(e=>{document.body.style.display=`block`,window.currentUserEmail=e.email;let t=document.getElementById(`navUserEmailSpan`);t&&(t.textContent=e.email),window.renderRequests&&window.renderRequests()},()=>{let e=window.location.pathname+window.location.search;window.location.href=`../login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{e(),window.location.href=`../login.html`};