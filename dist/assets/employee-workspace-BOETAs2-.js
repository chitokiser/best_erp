import{C as e,S as t,_ as n,n as r,v as i,y as a}from"./firebase-config-CqE3I3UV.js";import{i as o,r as s}from"./task-manager-BhXQrLsM.js";function c(s,c){if(!c)return;let u=a(e(r,`tasks`),t(`assignedTo`,`==`,s),i(`createdAt`,`desc`));n(u,e=>{if(c.innerHTML=``,e.empty){c.innerHTML=`<div style="padding:1rem; color:#64748b; text-align:center;">할당된 업무가 없습니다.</div>`;return}e.forEach(e=>{let t=e.data(),n=e.id,r=t.status;r!==`COMPLETED`&&t.dueDate&&new Date(t.dueDate)<new Date&&(r=`OVERDUE`);let i=`status-pending`,a=r;r===`PENDING`?(i=`status-pending`,a=`대기`):r===`ACCEPTED`?(i=`status-active`,a=`확인됨`):r===`IN_PROGRESS`?(i=`status-active`,a=`진행중`):r===`COMPLETED`?(i=`status-done`,a=`완료`):r===`OVERDUE`&&(i=`status-pending`,a=`🔴 지연`);let u=t.dueDate?t.dueDate.replace(`T`,` `):`기한 없음`,d=t.priority===`URGENT`||t.priority===`HIGH`?`🔴 긴급`:t.priority===`NORMAL`?`🟡 일반`:`🟢 낮음`,f=document.createElement(`div`);f.className=`task-list-item`,f.innerHTML=`
                <div style="flex: 1; cursor:pointer;" class="task-info">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${d} | 지시자: ${t.creatorName||`-`} | 마감: ${u}</span>
                    <h4 style="margin: 0.25rem 0; font-size: 1rem;">${t.title}</h4>
                    <div style="font-size:0.8rem; color:#64748b;">진행률: ${t.progress||0}%</div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem; flex-direction:column; justify-content:center;">
                    <span class="status-badge ${i}">${a}</span>
                    ${r===`PENDING`?`<button class="btn-primary btn-accept" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#3b82f6;">확인</button>`:``}
                    ${r===`ACCEPTED`||r===`IN_PROGRESS`||r===`OVERDUE`?`<button class="btn-primary btn-report" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#10b981;">결과보고</button>`:``}
                </div>
            `;let p=f.querySelector(`.btn-accept`);p&&p.addEventListener(`click`,async e=>{e.stopPropagation(),await o(n,s,{status:`IN_PROGRESS`}),alert(`업무를 확인하고 시작합니다.`)});let m=f.querySelector(`.btn-report`);m&&m.addEventListener(`click`,e=>{e.stopPropagation(),l(n,t.title,s)}),f.querySelector(`.task-info`).addEventListener(`click`,()=>{alert(`[상세내용]\n\n${t.description}`)}),c.appendChild(f)})})}function l(e,t,n){let r=document.getElementById(`reportModal`);r||(r=document.createElement(`div`),r.id=`reportModal`,r.style.cssText=`
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;
        `,r.innerHTML=`
            <div style="background:white; padding:2rem; border-radius:12px; width:400px; max-width:90%;">
                <h3 style="margin-top:0;">결과 보고 작성</h3>
                <div style="font-size:0.9rem; margin-bottom:1rem; color:#64748b;" id="reportTaskTitle"></div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block; font-size:0.85rem; margin-bottom:0.5rem;">진행률 (%)</label>
                    <input type="number" id="reportProgress" value="100" min="0" max="100" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;">
                </div>
                <div style="margin-bottom:1rem;">
                    <label style="display:block; font-size:0.85rem; margin-bottom:0.5rem;">처리 결과 및 내용</label>
                    <textarea id="reportContent" rows="4" style="width:100%; padding:0.5rem; border:1px solid #ccc; border-radius:4px;"></textarea>
                </div>
                <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                    <button id="btnCancelReport" style="padding:0.5rem 1rem; border:1px solid #ccc; background:white; cursor:pointer;">취소</button>
                    <button id="btnSubmitReport" style="padding:0.5rem 1rem; border:none; background:var(--success); color:white; border-radius:4px; cursor:pointer;">보고 제출</button>
                </div>
            </div>
        `,document.body.appendChild(r),document.getElementById(`btnCancelReport`).addEventListener(`click`,()=>{r.style.display=`none`}),document.getElementById(`btnSubmitReport`).addEventListener(`click`,async()=>{let e=parseInt(document.getElementById(`reportProgress`).value),t=document.getElementById(`reportContent`).value;if(!t){alert(`보고 내용을 입력해주세요.`);return}let i=document.getElementById(`btnSubmitReport`),a=r.dataset.taskId;i.innerText=`처리중...`,i.disabled=!0;try{await s(a,{reportedBy:n,content:t,progress:e}),alert(`결과 보고가 완료되었습니다.`),r.style.display=`none`}catch(e){alert(`오류 발생`),console.error(e)}finally{i.innerText=`보고 제출`,i.disabled=!1}})),r.dataset.taskId=e,document.getElementById(`reportTaskTitle`).innerText=t,document.getElementById(`reportProgress`).value=100,document.getElementById(`reportContent`).value=``,r.style.display=`flex`}export{c as initWorkspace};