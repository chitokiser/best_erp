import"./firebase-config-3n4qqNPS.js";/* empty css              */import{a as e,i as t}from"./materialApi-DIz_0s85.js";import{i as n,t as r}from"./auth-CRqREFiS.js";var i=document.getElementById(`mainContent`),a=new URLSearchParams(window.location.search).get(`id`);(async()=>{if(!a){i.innerHTML=`<p>자재 ID가 제공되지 않았습니다.</p>`;return}try{let n=await t(a);if(!n){i.innerHTML=`<p>자재를 찾을 수 없습니다.</p>`;return}i.innerHTML=`
                    <div style="margin-bottom: 1rem;">
                        <a href="materials.html" style="color: var(--primary-color); font-weight: 500;">&larr; 목록으로 돌아가기</a>
                    </div>
                    
                    <div class="detail-grid">
                        <!-- Left: Images and Info -->
                        <div>
                            <img src="${n.images&&n.images.length>0?n.images[0]:`https://placehold.co//e2e8f0/475569?text=No+Image`}" alt="${n.name}" style="width: 100%; border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border-color); cursor: pointer;" onclick="document.getElementById('imgModalContent').src=this.src; document.getElementById('imgModal').style.display='flex';">
                            
                            <div class="card">
                                <h3>기본 정보</h3>
                                <table style="width: 100%; margin-top: 1rem; text-align: left; border-collapse: collapse;">
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee; width: 30%;">자재코드</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.materialCode||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">카테고리</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.categoryId||`-`} > ${n.subCategoryId||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">브랜드</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.brand||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">모델명</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.model||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">규격</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.specification||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">단위</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.unit||`-`}</td></tr>
                                    <tr><th style="padding: 0.5rem; border-bottom: 1px solid #eee;">용도</th><td style="padding: 0.5rem; border-bottom: 1px solid #eee;">${n.applications?n.applications.join(`, `):`-`}</td></tr>
                                </table>
                            </div>
                        </div>

                        <!-- Right: Pricing -->
                        <div>
                            <h2 style="margin-bottom: 0.5rem; font-size: 2rem;">${n.name}</h2>
                            <p style="color: var(--text-secondary); margin-bottom: 2rem;">${n.nameVi||``} | ${n.nameEn||``}</p>

                            <h3 style="margin-bottom: 1rem;">가격 정보</h3>
                            
                            <!-- 출처별 가격 표시 -->
                            <div class="price-box price-public">
                                <div>
                                    <span style="font-size: 0.875rem; color: #475569;">공공가격</span><br>
                                    <small style="color: #64748b;">출처: BXD (예시) | 최근 업데이트: 2026-09</small>
                                </div>
                                <div style="text-align: right; font-weight: bold; font-size: 1.25rem;">
                                    850,000 VND
                                </div>
                            </div>
                            
                            <div class="price-box price-market">
                                <div>
                                    <span style="font-size: 0.875rem; color: #0284c7;">시장가격</span><br>
                                    <small style="color: #38bdf8;">출처: Vatgia (예시) | 최근 업데이트: 2026-09</small>
                                </div>
                                <div style="text-align: right; font-weight: bold; font-size: 1.25rem; color: #0284c7;">
                                    820,000 VND
                                </div>
                            </div>

                            <div class="price-box price-best">
                                <div>
                                    <span style="font-weight: 600; color: var(--primary-color);">BEST 매입가격</span><br>
                                    <small style="color: #60a5fa;">VAT ${n.vatIncluded?`포함`:`별도`}</small>
                                </div>
                                <div style="text-align: right; font-weight: bold; font-size: 1.5rem; color: var(--primary-color);">
                                    ${n.ourPurchasePrice?n.ourPurchasePrice.toLocaleString():`0`} VND
                                </div>
                            </div>

                            <div class="price-box price-sell">
                                <div>
                                    <span style="font-weight: 600; color: #b91c1c;">BEST 판매가격 (예상)</span><br>
                                    <small style="color: #f87171;">VAT ${n.vatIncluded?`포함`:`별도`}</small>
                                </div>
                                <div style="text-align: right; font-weight: bold; font-size: 1.5rem; color: #b91c1c;">
                                    ${n.ourSellingPrice?n.ourSellingPrice.toLocaleString():`0`} VND
                                </div>
                            </div>
                            
                            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                                <button class="btn-primary" style="flex: 1; padding: 1rem;" onclick="addToRequestCart('${n.id}', '${n.name.replace(/'/g,`\\'`)}', ${n.ourPurchasePrice||0})">
                                    🛒 기안서(장바구니) 담기
                                </button>
                                <button class="btn-primary" style="background:#64748b; flex: 1; padding: 1rem;" onclick="location.href='request-form.html'">
                                    기안/결재 올리기
                                </button>
                            </div>

                            <div style="margin-top: 2rem;">
                                <h3>상세 설명</h3>
                                <p style="margin-top: 0.5rem; color: var(--text-secondary); white-space: pre-wrap;">${n.description||`등록된 설명이 없습니다.`}</p>
                            </div>

                            <div style="margin-top: 2rem;">
                                <h3>연결된 공급처 정보</h3>
                                <div id="supplierInfoBox" style="margin-top: 0.5rem;">
                                    <p style="color: var(--text-secondary); font-size: 0.875rem;">공급처 분석 중...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                `,window.addToRequestCart=(e,t,n)=>{let r=JSON.parse(localStorage.getItem(`purchaseCart`)||`[]`),i=r.find(t=>t.id===e);i?i.qty+=1:r.push({id:e,name:t,price:n,qty:1}),localStorage.setItem(`purchaseCart`,JSON.stringify(r));let a=r.reduce((e,t)=>e+t.qty,0);document.getElementById(`cartCount`).innerText=a,alert(`[${t}] 자재가 구매요청 장바구니에 담겼습니다.`)};let r=JSON.parse(localStorage.getItem(`purchaseCart`)||`[]`).reduce((e,t)=>e+t.qty,0);document.getElementById(`cartCount`).innerText=r,setTimeout(async()=>{let t=document.getElementById(`supplierInfoBox`),n=await e(a);if(n&&n.length>0){let e=`<ul style="list-style:none; padding:0; margin:0;">`;n.forEach(t=>{e+=`
                            <li style="border: 1px solid var(--border-color); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem; display:flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: var(--text-primary); font-size: 1.1rem;">${t.supplierName||`업체명`}</strong>
                                    <div style="color: var(--text-secondary); font-size: 0.8rem; margin-top:0.25rem;">최근 견적가: ${t.price?t.price.toLocaleString():`-`} VND</div>
                                </div>
                                <button class="btn-primary" style="padding: 0.5rem 1rem; font-size:0.875rem;" onclick="location.href='suppliers.html'">업체 문의</button>
                            </li>
                          `}),e+=`</ul>`,t.innerHTML=e}else t.innerHTML=`<p style="color: var(--text-secondary); font-size: 0.875rem;">등록된 공급처가 없습니다.</p>`},500)}catch(e){console.error(e),i.innerHTML=`<p style="color:red;">자재 정보를 불러오는 중 오류가 발생했습니다.</p>`}})(),r(e=>{document.body.style.display=`block`;let t=document.querySelector(`.main-nav ul`);if(t&&!document.getElementById(`navUserEmail`)){let n=document.createElement(`li`);n.id=`navUserEmail`,n.innerHTML=`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">${e.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>`,t.appendChild(n)}},()=>{let e=window.location.pathname+window.location.search;window.location.href=`login.html?redirect=`+encodeURIComponent(e)}),window.logoutAndRedirect=()=>{n(),window.location.href=`login.html`};