import"./firebase-config-OD9FGzWR.js";/* empty css              */import{i as e,t}from"./auth-Ci8pltMn.js";import{t as n}from"./supplierApi-Bot3q7uh.js";(async()=>{let e=document.getElementById(`suppliersTableBody`);try{let t=await n();if(t.length===0){e.innerHTML=`<tr><td colspan="5" style="padding: 1rem; text-align: center;">등록된 공급업체가 없습니다.</td></tr>`;return}e.innerHTML=``,t.forEach((t,n)=>{let r=Math.floor(Math.random()*80)+10,i={label:`보통`,color:`#1f2937`,bg:`#f3f4f6`};n%3==0&&(i={label:`우수`,color:`#065f46`,bg:`#d1fae5`}),n===4&&(i={label:`주의 (클레임)`,color:`#991b1b`,bg:`#fee2e2`});let a=document.createElement(`tr`);a.style.borderBottom=`1px solid var(--border-color)`,a.innerHTML=`
                        <td style="padding: 1rem; font-weight: 500;">${t.companyName||`-`}</td>
                        <td style="padding: 1rem;">
                            <span style="background:${i.bg}; color:${i.color}; padding:0.25rem 0.5rem; border-radius:4px; font-size:0.8rem; font-weight:bold;">${i.label}</span>
                        </td>
                        <td style="padding: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <div style="width: 100px; background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                                    <div style="background: var(--primary-color); width: ${r/100*100}%; height: 100%;"></div>
                                </div>
                                <span style="font-size: 0.85rem; font-weight: 600;">₩ ${r}M</span>
                            </div>
                        </td>
                        <td style="padding: 1rem;">${(t.categories||[]).join(`, `)||`-`}</td>
                        <td style="padding: 1rem; font-size:0.875rem;">${t.contactPerson||`-`} (${t.phone||`-`})</td>
                        <td style="padding: 1rem;"><button class="btn-primary" style="padding:0.25rem 0.5rem; background:#64748b; font-size:0.8rem;" onclick="alert('평가 히스토리 보기 팝업 띄우기')">평가/리뷰 조회</button></td>
                    `,e.appendChild(a)})}catch(t){console.error(t),e.innerHTML=`<tr><td colspan="5" style="padding: 1rem; text-align: center; color: red;">오류 발생: ${t.message}</td></tr>`}})(),t(e=>{document.body.style.display=`block`;let t=document.querySelector(`.main-nav ul`);if(t&&!document.getElementById(`navUserEmail`)){let n=document.createElement(`li`);n.id=`navUserEmail`,n.innerHTML=`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">${e.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>`,t.appendChild(n)}},()=>{let e=window.location.pathname+window.location.search;window.location.href=`../login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{e(),window.location.href=`../login.html`};