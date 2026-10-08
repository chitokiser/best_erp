import { db } from './firebase-config.js';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { updateTask, submitTaskReport } from './task-manager.js';

export function initWorkspace(uid, container) {
    if (!container) return;

    const q = query(collection(db, 'tasks'), where('assignedTo', '==', uid), orderBy('createdAt', 'desc'));

    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = `<div style="padding:1rem; color:#64748b; text-align:center;">할당된 업무가 없습니다.</div>`;
            return;
        }

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;

            let currentStatus = data.status;
            if (currentStatus !== 'COMPLETED' && data.dueDate) {
                const due = new Date(data.dueDate);
                if (due < new Date()) {
                    currentStatus = 'OVERDUE';
                }
            }

            let statClass = 'status-pending';
            let statKor = currentStatus;

            if (currentStatus === 'PENDING') { statClass = 'status-pending'; statKor = '대기'; }
            else if (currentStatus === 'ACCEPTED') { statClass = 'status-active'; statKor = '확인됨'; }
            else if (currentStatus === 'IN_PROGRESS') { statClass = 'status-active'; statKor = '진행중'; }
            else if (currentStatus === 'COMPLETED') { statClass = 'status-done'; statKor = '완료'; }
            else if (currentStatus === 'OVERDUE') { statClass = 'status-pending'; statKor = '🔴 지연'; }

            let dtStr = data.dueDate ? data.dueDate.replace('T', ' ') : '기한 없음';
            let prioStr = data.priority === 'URGENT' || data.priority === 'HIGH' ? '🔴 긴급' : (data.priority === 'NORMAL' ? '🟡 일반' : '🟢 낮음');

            const item = document.createElement('div');
            item.className = 'task-list-item';
            item.innerHTML = `
                <div style="flex: 1; cursor:pointer;" class="task-info">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${prioStr} | 지시자: ${data.creatorName || '-'} | 마감: ${dtStr}</span>
                    <h4 style="margin: 0.25rem 0; font-size: 1rem;">${data.title}</h4>
                    <div style="font-size:0.8rem; color:#64748b;">진행률: ${data.progress || 0}%</div>
                </div>
                <div style="display: flex; align-items: center; gap: 1rem; flex-direction:column; justify-content:center;">
                    <span class="status-badge ${statClass}">${statKor}</span>
                    ${currentStatus === 'PENDING' ? `<button class="btn-primary btn-accept" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#3b82f6;">확인</button>` : ''}
                    ${currentStatus === 'ACCEPTED' || currentStatus === 'IN_PROGRESS' || currentStatus === 'OVERDUE' ? `<button class="btn-primary btn-report" style="padding:0.2rem 0.5rem; font-size:0.75rem; background:#10b981;">결과보고</button>` : ''}
                </div>
            `;

            // Event Listeners
            const btnAccept = item.querySelector('.btn-accept');
            if (btnAccept) {
                btnAccept.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await updateTask(id, uid, { status: 'IN_PROGRESS' });
                    alert("업무를 확인하고 시작합니다.");
                });
            }

            const btnReport = item.querySelector('.btn-report');
            if (btnReport) {
                btnReport.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openReportModal(id, data.title, uid);
                });
            }

            item.querySelector('.task-info').addEventListener('click', () => {
                alert(`[상세내용]\n\n${data.description}`);
            });

            container.appendChild(item);
        });
    });
}

function openReportModal(taskId, title, uid) {
    let modal = document.getElementById('reportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reportModal';
        modal.style.cssText = `
            position:fixed; top:0; left:0; width:100%; height:100%;
            background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; z-index:9999;
        `;
        modal.innerHTML = `
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
        `;
        document.body.appendChild(modal);

        document.getElementById('btnCancelReport').addEventListener('click', () => {
            modal.style.display = 'none';
        });

        document.getElementById('btnSubmitReport').addEventListener('click', async () => {
            const prog = parseInt(document.getElementById('reportProgress').value);
            const content = document.getElementById('reportContent').value;
            if (!content) { alert("보고 내용을 입력해주세요."); return; }

            const btn = document.getElementById('btnSubmitReport');
            const targetTaskId = modal.dataset.taskId;

            btn.innerText = "처리중...";
            btn.disabled = true;
            try {
                await submitTaskReport(targetTaskId, {
                    reportedBy: uid,
                    content: content,
                    progress: prog
                });
                alert("결과 보고가 완료되었습니다.");
                modal.style.display = 'none';
            } catch (e) {
                alert("오류 발생");
                console.error(e);
            } finally {
                btn.innerText = "보고 제출";
                btn.disabled = false;
            }
        });
    }

    modal.dataset.taskId = taskId;
    document.getElementById('reportTaskTitle').innerText = title;
    document.getElementById('reportProgress').value = 100;
    document.getElementById('reportContent').value = '';
    modal.style.display = 'flex';
}
