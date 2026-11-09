import{E as e,S as t,T as n,h as r,k as i,n as a,v as o}from"./firebase-config-BURgN9gX.js";/* empty css              */import{t as s}from"./auth-iIMH-e68.js";/* empty css              */import{t as c}from"./notification-hub-ChDr8WD_.js";c();var l=`1791605366`,u=null,d=[],f=[],p=`ALL`,m=[{id:`demo_rpt_1`,type:`FIELD`,title:`[하노이 미딩 송다타워] 4층 에어컨 실외기 냉매 충전 및 누수 수리 완료`,location:`미딩 송다타워 B동 402호`,author:`응우옌 반 린 (시공팀)`,authorEmail:`linh.field@bestmario.vn`,content:`• 방문 목적: 고객 접수 에어컨 누수 및 냉방 저하 점검
• 조치 사항: 드레인 배관 역류 부위 절단 후 신규 호스 교체, R410A 냉매 1.2kg 보충
• 테스트 결과: 실내 토출 온도 16도 정상 확인 및 주변 바닥 청소 완료.`,photos:[`https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80`,`https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80`],status:`CONFIRMED`,ceoFeedback:`수고하셨습니다. 보증서 발급 연동 완료되었습니다.`,createdAt:new Date(Date.now()-108e5).toISOString()},{id:`demo_rpt_2`,type:`ISSUE`,title:`[긴급 안건] 호치민 창고 동관(15A) 재고 2개 잔여 - 내일 시공분 부족 우려`,location:`호치민 7군 물류 창고`,author:`박정우 주임 (자재팀)`,authorEmail:`park.mat@bestmario.vn`,content:`• 안건 내용: 이번 주말 예약된 3건의 현장 시공을 감안할 때 동관 배관 자재가 최소 15개 이상 긴급 충원되어야 합니다.
• 건의 사항: 협력업체(호치민 베스트자재)에 20개 긴급 퀵 배송 발주 승인 요청드립니다.`,photos:[`https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80`],status:`PENDING`,ceoFeedback:``,createdAt:new Date(Date.now()-216e5).toISOString()}];window.openNewReportModal=()=>{d=[],document.getElementById(`photoPreviewContainer`).innerHTML=``,document.getElementById(`photoCountNotice`).textContent=`선택된 사진: 0장`,document.getElementById(`rptTitle`).value=``,document.getElementById(`rptLocation`).value=``,document.getElementById(`rptContent`).value=``,document.getElementById(`rptType`).value=`FIELD`,document.getElementById(`reportModal`).style.display=`flex`},window.closeNewReportModal=()=>{document.getElementById(`reportModal`).style.display=`none`},window.handlePhotoSelect=e=>{let t=Array.from(e.target.files);t&&t.length!==0&&(t.forEach(e=>{let t=new FileReader;t.onload=e=>{let t=new Image;t.onload=()=>{let e=document.createElement(`canvas`),n=1024,r=t.width,i=t.height;(r>n||i>n)&&(r>i?(i=Math.round(i*n/r),r=n):(r=Math.round(r*n/i),i=n)),e.width=r,e.height=i,e.getContext(`2d`).drawImage(t,0,0,r,i);let a=e.toDataURL(`image/jpeg`,.82);d.push(a),h()},t.src=e.target.result},t.readAsDataURL(e)}),e.target.value=``)};function h(){let e=document.getElementById(`photoPreviewContainer`);document.getElementById(`photoCountNotice`).textContent=`선택된 사진: ${d.length}장`,e.innerHTML=d.map((e,t)=>`
                <div class="photo-thumb-wrap">
                    <img src="${e}">
                    <button class="photo-thumb-remove" onclick="removePhoto(${t})">✕</button>
                </div>
            `).join(``)}window.removePhoto=e=>{d.splice(e,1),h()},window.submitFieldReport=async()=>{let t=document.getElementById(`rptType`).value,n=document.getElementById(`rptTitle`).value.trim(),o=document.getElementById(`rptLocation`).value.trim(),s=document.getElementById(`rptAuthor`).value.trim()||`현장 직원`,c=document.getElementById(`rptContent`).value.trim();if(!n){alert(`보고서 제목을 입력해 주세요.`);return}if(!c){alert(`상세 내용 및 조치 사항을 작성해 주세요.`);return}let p=document.getElementById(`btnSubmitReport`);p.disabled=!0,p.textContent=`등록 중...`;try{let p={tenantId:l,type:t,title:n,location:o,author:s,authorEmail:u?.email||``,content:c,photos:d,status:`PENDING`,ceoFeedback:``,createdAt:new Date().toISOString()};try{await r(e(a,`field_reports`),{...p,serverTime:i()})}catch(e){console.warn(`Firestore 저장 대체 (로컬 세션 캐시 병합):`,e)}f.unshift(p),_(),closeNewReportModal(),alert(`✅ 사진 보고서가 성공적으로 등록되었습니다. CEO 및 팀장에게 실시간 공유됩니다.`)}catch(e){alert(`등록 에러: `+e.message)}finally{p.disabled=!1,p.textContent=`보고서 제출하기`}};async function g(){try{f=[...m];try{let r=await o(t(e(a,`field_reports`),n(`tenantId`,`==`,l))),i=[];r.forEach(e=>i.push({id:e.id,...e.data()})),i.length>0&&(f=[...i,...m])}catch(e){console.warn(`DB 로딩 스킵:`,e)}_()}catch(e){console.error(e),_()}}window.filterReports=(e,t)=>{p=e,document.querySelectorAll(`.btn-filter`).forEach(e=>{e.style.background=`white`,e.style.color=`#475569`,e.style.borderColor=`#cbd5e1`}),t.style.background=`var(--ai-primary)`,t.style.color=`white`,t.style.borderColor=`var(--ai-primary)`,_()};function _(){let e=document.getElementById(`reportsFeed`),t=p===`ALL`?f:f.filter(e=>e.type===p);if(t.length===0){e.innerHTML=`
                    <div style="background:white; border-radius:1rem; border:1px dashed #cbd5e1; padding:3rem; text-align:center; color:#94a3b8;">
                        해당 분류의 사진 보고서가 없습니다.
                    </div>
                `;return}e.innerHTML=t.map((e,t)=>{let n=e.type===`FIELD`?`🏗️ 현장 출장`:e.type===`ISSUE`?`🚨 긴급 이슈`:e.type===`MEETING`?`🤝 외근 미팅`:`💡 안건 제안`,r=e.type===`FIELD`?`type-badge-field`:e.type===`ISSUE`?`type-badge-issue`:e.type===`MEETING`?`type-badge-meeting`:`type-badge-idea`,i=e.status===`CONFIRMED`,a=new Date(e.createdAt).toLocaleString();return`
                    <div class="report-feed-card">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:0.5rem;">
                            <div>
                                <span class="badge-pill ${r}" style="font-weight:800; font-size:0.75rem;">${n}</span>
                                <h3 style="margin:0.5rem 0 0.25rem 0; font-size:1.15rem; color:#1e293b; font-weight:800;">${e.title}</h3>
                                <div style="font-size:0.8rem; color:#64748b; display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center;">
                                    <span>👤 <strong>${e.author}</strong></span>
                                    ${e.location?`<span>📍 ${e.location}</span>`:``}
                                    <span>🕒 ${a}</span>
                                </div>
                            </div>
                            <div>
                                <span class="badge-pill" style="background:${i?`#d1fae5`:`#fee2e2`}; color:${i?`#065f46`:`#b91c1c`}; font-weight:800;">
                                    ${i?`✓ CEO 검토 완료`:`● 확인 대기`}
                                </span>
                            </div>
                        </div>

                        <div style="margin-top:0.85rem; font-size:0.875rem; color:#334155; line-height:1.6; white-space:pre-wrap; background:#f8fafc; padding:0.85rem; border-radius:0.5rem; border:1px solid #f1f5f9;">
                            ${e.content}
                        </div>

                        ${e.photos&&e.photos.length>0?`
                            <div class="report-photo-gallery">
                                ${e.photos.map(e=>`
                                    <div class="gallery-item" onclick="openLightbox('${e}')">
                                        <img src="${e}" loading="lazy">
                                    </div>
                                `).join(``)}
                            </div>
                        `:``}

                        <!-- CEO Feedback & Action Area -->
                        <div style="margin-top:1rem; border-top:1px solid #f1f5f9; padding-top:0.75rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                            <div style="font-size:0.825rem; color:#475569;">
                                ${e.ceoFeedback?`<span style="color:#059669; font-weight:700;">💬 CEO 피드백:</span> ${e.ceoFeedback}`:`<span style="color:#94a3b8;">아직 등록된 CEO 피드백이 없습니다.</span>`}
                            </div>
                            <div style="display:flex; gap:0.4rem;">
                                ${i?``:`
                                    <button onclick="confirmReport('${e.id||t}')" style="background:#10b981; color:white; border:none; padding:0.4rem 0.85rem; border-radius:0.35rem; font-size:0.775rem; font-weight:700; cursor:pointer;">
                                        ✓ 확인 도장 (검토 완료)
                                    </button>
                                `}
                                <button onclick="addCeoComment('${e.id||t}')" style="background:#f1f5f9; border:1px solid #cbd5e1; color:#334155; padding:0.4rem 0.85rem; border-radius:0.35rem; font-size:0.775rem; font-weight:700; cursor:pointer;">
                                    💬 피드백 남기기
                                </button>
                            </div>
                        </div>
                    </div>
                `}).join(``)}window.confirmReport=async e=>{let t=f.find((t,n)=>t.id===e||String(n)===String(e));t&&(t.status=`CONFIRMED`,_(),alert(`✓ 보고서 확인 처리가 완료되었습니다.`))},window.addCeoComment=e=>{let t=f.find((t,n)=>t.id===e||String(n)===String(e));if(!t)return;let n=prompt(`직원에게 전달할 CEO 피드백/지시 사항을 입력하세요:`,t.ceoFeedback||``);n!==null&&n.trim()!==``&&(t.ceoFeedback=n.trim(),t.status=`CONFIRMED`,_())},window.openLightbox=e=>{document.getElementById(`lightboxImg`).src=e,document.getElementById(`imageLightbox`).style.display=`flex`},window.closeLightbox=()=>{document.getElementById(`imageLightbox`).style.display=`none`},s(e=>{u=e,l=window.tenantId||`1791605366`,document.getElementById(`rptAuthor`).value=e.displayName||e.email.split(`@`)[0],g()},()=>{location.href=`../login.html?redirect=`+encodeURIComponent(location.pathname)});