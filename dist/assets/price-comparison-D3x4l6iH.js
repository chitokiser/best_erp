import"./firebase-config-OD9FGzWR.js";import{i as e,t}from"./auth-Ci8pltMn.js";import{a as n,n as r,r as i}from"./materialApi-BWso9T6r.js";var a=document.getElementById(`selMaterial`),o=document.getElementById(`btnCompare`),s=document.getElementById(`resultSection`),c=document.getElementById(`materialTitle`),l=document.getElementById(`comparisonBody`),u=document.getElementById(`savingsAmount`),d=document.getElementById(`savingsRate`),f={};o.addEventListener(`click`,async()=>{let e=a.value;if(!e)return alert(`자재를 선택해주세요.`);let t=f[e];c.textContent=`${t.name} 가격 비교`,s.style.display=`block`,l.innerHTML=`<tr><td colspan="2" style="text-align:center;">비교 데이터 분석 중...</td></tr>`;try{let r=await i(e),a=await n(e),o=``,s=0;r.forEach(e=>{e.type===`MARKET`&&(s=e.price),o+=`
                        <tr>
                            <td>${e.source}</td>
                            <td style="text-align: right;">${e.price.toLocaleString()}</td>
                        </tr>
                    `}),a.forEach(e=>{o+=`
                        <tr>
                            <td>[업체견적] ${e.supplierName}</td>
                            <td style="text-align: right; color: var(--text-secondary);">${e.price.toLocaleString()}</td>
                        </tr>
                    `});let c=t.ourPurchasePrice||0;if(o+=`
                    <tr class="highlight-row">
                        <td style="color: var(--primary-color);">BEST 확보 매입가격</td>
                        <td style="text-align: right; color: var(--primary-color); font-size: 1.25rem;">${c.toLocaleString()}</td>
                    </tr>
                `,l.innerHTML=o,s>0&&c>0&&s>c){let e=s-c,t=(e/s*100).toFixed(1);u.textContent=`${e.toLocaleString()} VND`,d.textContent=`시장가 대비 ${t}% 절감`}else u.textContent=`분석 불가`,d.textContent=`시장가격 정보가 부족하거나 BEST 가격이 설정되지 않았습니다.`}catch(e){console.error(e),l.innerHTML=`<tr><td colspan="2" style="text-align:center; color:red;">에러 발생</td></tr>`}}),(async()=>{try{let e=await r();a.innerHTML=`<option value="">비교할 자재를 선택하세요 ▼</option>`,e.forEach(e=>{f[e.id]=e;let t=document.createElement(`option`);t.value=e.id,t.textContent=`${e.name} ${e.specification?`(`+e.specification+`)`:``}`,a.appendChild(t)})}catch(e){console.error(e),a.innerHTML=`<option value="">자재 목록 로딩 실패</option>`}})(),t(e=>{document.body.style.display=`block`;let t=document.querySelector(`.main-nav ul`);if(t&&!document.getElementById(`navUserEmail`)){let n=document.createElement(`li`);n.id=`navUserEmail`,n.innerHTML=`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">${e.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>`,t.appendChild(n)}},()=>{let e=window.location.pathname+window.location.search;window.location.href=`login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{e(),window.location.href=`login.html`};