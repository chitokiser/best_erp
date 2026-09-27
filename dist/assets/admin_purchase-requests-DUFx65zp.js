import"./firebase-config-OD9FGzWR.js";import{i as e,t}from"./auth-Ci8pltMn.js";import{n,r}from"./purchaseApi-z0zZrzrW.js";var i=document.getElementById(`requestsContainer`),a=async()=>{try{let e=await n();if(e.length===0){i.innerHTML=`<p>현재 대기 중이거나 처리된 결재건이 없습니다.</p>`;return}let t=``;e.forEach(e=>{let n=`bg-yellow`,r=`팀장 승인 대기`;e.status===`PENDING_CEO`&&(n=`bg-orange`,r=`CEO 승인 대기`),e.status===`APPROVED`&&(n=`bg-green`,r=`승인 완료 (구매 대기)`),e.status===`PURCHASED`&&(n=`bg-blue`,r=`구매/발주 완료`);let i=e.createdAt?new Date(e.createdAt.seconds*1e3).toLocaleString():`방금 전`,a=`<ul class="item-list">`;e.items.forEach(e=>{a+=`<li>${e.name} (수량: ${e.quantity}) - ${(e.price*e.quantity).toLocaleString()} VND</li>`}),a+=`</ul>`,t+=`
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
                                </div>
                            </div>
                            
                            <div style="background: #f8fafc; padding: 1rem; border-radius: 8px;">
                                <strong>요청 사유:</strong>
                                <p style="font-size: 0.875rem; margin-top: 0.25rem; margin-bottom: 1rem;">${e.notes||`없음`}</p>
                                <strong>요청 자재 품목:</strong>
                                ${a}
                            </div>
                            
                            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
                                ${e.status===`PENDING_TEAM_LEAD`?`<button class="btn-primary" onclick="window.handleApprove('${e.id}', 'PENDING_CEO')">팀장 승인</button>`:``}
                                ${e.status===`PENDING_CEO`?`<button class="btn-primary" style="background:#059669;" onclick="window.handleApprove('${e.id}', 'APPROVED')">CEO 최종 승인</button>`:``}
                                ${e.status===`APPROVED`?`<button class="btn-primary" style="background:#2563eb;" onclick="window.handleApprove('${e.id}', 'PURCHASED')">발주 처리</button>`:``}
                            </div>
                        </div>
                    `}),i.innerHTML=t}catch(e){console.error(e),i.innerHTML=`<p style="color:red;">결재 목록을 불러오는 중 오류가 발생했습니다.</p>`}};window.handleApprove=async(e,t)=>{if(confirm(`이 결재건을 승인/진행 하시겠습니까?`))try{await r(e,t,`Admin User`),a()}catch(e){alert(`처리 중 오류가 발생했습니다: `+e.message)}},a(),t(e=>{document.body.style.display=`block`;let t=document.querySelector(`.main-nav ul`);if(t&&!document.getElementById(`navUserEmail`)){let n=document.createElement(`li`);n.id=`navUserEmail`,n.innerHTML=`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">${e.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>`,t.appendChild(n)}},()=>{let e=window.location.pathname+window.location.search;window.location.href=`../login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{e(),window.location.href=`../login.html`};