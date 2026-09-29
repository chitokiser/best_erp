import"./firebase-config-3n4qqNPS.js";/* empty css              */import{i as e,t}from"./auth-nkQdWwku.js";import{t as n}from"./supplierApi-DjaYKbPP.js";var r=document.getElementById(`supplierList`);(async()=>{r.innerHTML=`<p>로딩 중...</p>`;try{let e=await n();if(e.length===0){r.innerHTML=`<p>등록된 공급업체가 없습니다.</p>`;return}r.innerHTML=``,e.forEach(e=>{let t=document.createElement(`div`);t.className=`card`,t.innerHTML=`
                        <h3 style="font-size: 1.25rem; margin-bottom: 0.25rem;">${e.companyName||`이름 없음`}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.875rem;">
                          ${e.companyNameVi||``} <br>
                          지역: ${e.province||`-`}
                        </p>

                        <div style="margin-bottom: 1rem; font-size: 0.875rem;">
                            <strong>담당자:</strong> ${e.contactPerson||`-`} <br>
                            <strong>주요 품목:</strong> ${(e.categories||[]).join(`, `)||`-`}
                        </div>

                        <div style="display: flex; gap: 0.5rem;">
                            ${e.phone?`<button class="btn-action" style="background-color: #22c55e; color: white;" onclick="window.open('tel:${e.phone}')">☎ 전화</button>`:``}
                            ${e.zalo?`<button class="btn-action" style="background-color: #0284c7; color: white;" onclick="window.open('https://zalo.me/${e.zalo.replace(/[^0-9]/g,``)}')">Zalo</button>`:``}
                            <button class="btn-action" style="background-color: #f1f5f9; color: #333;" onclick="alert('준비 중입니다.')">자재 보기</button>
                        </div>
                    `,r.appendChild(t)})}catch(e){console.error(e),r.innerHTML=`<p style="color:red;">오류가 발생했습니다.</p>`}})(),t(e=>{document.body.style.display=`block`;let t=document.querySelector(`.main-nav ul`);if(t&&!document.getElementById(`navUserEmail`)){let n=document.createElement(`li`);n.id=`navUserEmail`,n.innerHTML=`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">${e.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>`,t.appendChild(n)}},()=>{let e=window.location.pathname+window.location.search;window.location.href=`login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{e(),window.location.href=`login.html`};