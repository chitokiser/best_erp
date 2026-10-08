import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { createTask, createSubTask, updateTask, submitTaskReport, logTaskAction } from '../task-manager.js';

let currentUserInfo = null;

const taskListContainer = document.getElementById('taskListContainer');
const detailContainer = document.getElementById('taskDetailContainer');
const tplTaskForm = document.getElementById('tplTaskForm');
const tplTaskDetailView = document.getElementById('tplTaskDetailView');

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        // fetch user role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
            currentUserInfo = { uid: user.uid, ...userDoc.data() };
            document.getElementById('userInfo').innerText = `${currentUserInfo.name} (${currentUserInfo.role})`;

            initTaskBoard();
        } else {
            console.error("No user DB found for this UID");
            // default to lowest permission for safety
            currentUserInfo = { uid: user.uid, role: 'EMPLOYEE', name: user.email, email: user.email };
            initTaskBoard();
        }
    });
});

function initTaskBoard() {
    const urlParams = new URLSearchParams(window.location.search);
    const assigneeParam = urlParams.get('assignee');
    if (assigneeParam) {
        setTimeout(() => showTaskForm('', assigneeParam), 500);
    }
    // Bind New Task Button
    document.getElementById('btnNewTask').addEventListener('click', () => {
        showTaskForm();
    });

    // Realtime Listener for tasks based on Role
    let q;

    if (['SUPER_ADMIN', 'CEO'].includes(currentUserInfo.role) || currentUserInfo.email === 'daguri75@gmail.com') {
        q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    } else if (currentUserInfo.role === 'TEAM_LEADER') {
        // Team Leader sees their team's tasks
        q = query(collection(db, 'tasks'), where('teamId', '==', currentUserInfo.teamId || ''), orderBy('createdAt', 'desc'));
    } else {
        // Employee sees assigned tasks
        q = query(collection(db, 'tasks'), where('assignedTo', '==', currentUserInfo.email)); // Removed orderBy to bypass Firestore index requirement
    }

    onSnapshot(q, (snapshot) => {
        taskListContainer.innerHTML = '';
        if (snapshot.empty) {
            taskListContainer.innerHTML = `<div style="padding:1rem; color:#64748b; text-align:center;">조건에 맞는 업무가 없습니다.</div>`;
            return;
        }

        let docsArr = [];
        snapshot.forEach(d => docsArr.push(d));
        docsArr.sort((a, b) => {
            let td1 = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
            let td2 = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
            return td2 - td1; // desc
        });
        docsArr.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            renderTaskListItem(id, data);
        });
    });
}

function renderTaskListItem(id, data) {
    const div = document.createElement('div');

    // Check OVERDUE logic
    let currentStatus = data.status;
    if (currentStatus !== 'COMPLETED' && data.dueDate) {
        const due = new Date(data.dueDate);
        if (due < new Date()) {
            currentStatus = 'OVERDUE';
        }
    }

    div.className = `task-item ${currentStatus === 'OVERDUE' ? 'overdue' : ''}`;

    let prioClass = `pri-${data.priority || 'NORMAL'}`;
    let statClass = `stat-${currentStatus}`;

    let dtStr = data.dueDate ? data.dueDate.replace('T', ' ') : '-';

    // Status Kor translation
    let statKor = currentStatus;
    if (statKor === 'PENDING') statKor = '대기';
    else if (statKor === 'IN_PROGRESS') statKor = '진행중';
    else if (statKor === 'ACCEPTED') statKor = '확인됨';
    else if (statKor === 'COMPLETED') statKor = '완료';
    else if (statKor === 'OVERDUE') statKor = '지연';

    div.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
            <span class="priority-badge ${prioClass}">${data.priority || 'NORMAL'}</span>
            <span class="status-badge ${statClass}">${statKor}</span>
        </div>
        <h4 style="margin: 0 0 0.5rem 0;">${data.title}</h4>
        <div style="display:flex; justify-content:space-between; font-size:0.8rem; color:#64748b;">
            <span>${data.teamId || '-'} / ${data.assigneeName || '미지정'}</span>
            <span>마감: ${dtStr}</span>
        </div>
    `;

    div.addEventListener('click', () => {
        data.computedStatus = currentStatus; // pass down to detail view
        showTaskDetail(id, data);
    });

    taskListContainer.appendChild(div);
}

async function populateUsers(selectElem) {
    // 1. Fetch available users
    const usersSnap = await getDocs(collection(db, 'users'));
    selectElem.innerHTML = '<option value="">-- 팀장/부서 일괄 --</option>';
    usersSnap.forEach(doc => {
        const u = doc.data();
        if (u.role === 'STAFF') {
            const opt = document.createElement('option');
            opt.value = u.email;
            opt.textContent = `${u.name || u.email || '이름없음'} (${u.position || u.role}) - ${u.teamId || '부서미지정'}`;
            opt.dataset.name = u.name;
            opt.dataset.team = u.teamId;
            selectElem.appendChild(opt);
        }
    });
}

function showTaskForm(parentTaskId = '', initialAssignee = null) {
    detailContainer.innerHTML = '';
    const content = tplTaskForm.content.cloneNode(true);
    detailContainer.appendChild(content);

    const form = document.getElementById('taskForm');
    const assigneeSelect = document.getElementById('taskAssignee');

    if (parentTaskId) {
        document.getElementById('taskParentId').value = parentTaskId;
        document.getElementById('formTitle').innerText = '하위 업무 / 팀원 배정';
    }

    populateUsers(assigneeSelect).then(() => { if (initialAssignee) { assigneeSelect.value = initialAssignee; } });

    document.getElementById('btnCancelForm').addEventListener('click', () => {
        detailContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8;">취소되었습니다.</div>`;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let assignedTo = assigneeSelect.value;
        let assigneeName = '';
        if (assignedTo) {
            assigneeName = assigneeSelect.options[assigneeSelect.selectedIndex].dataset.name;
        } else {
            assigneeName = '해당 없음 (일괄배정)';
        }

        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDesc').value,
            teamId: document.getElementById('taskTeam').value,
            assignedTo: assignedTo,
            assigneeName: assigneeName,
            dueDate: document.getElementById('taskDueDate').value,
            priority: document.getElementById('taskPriority').value,
            parentTaskId: document.getElementById('taskParentId').value || null,
            createdBy: currentUserInfo.uid,
            creatorName: currentUserInfo.name,
            progress: 0,
            status: 'PENDING'
        };

        try {
            await createTask(taskData);
            alert("업무가 성공적으로 등록/배정되었습니다.");
            detailContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8;">생성 완료! 다른 업무를 선택하세요.</div>`;
        } catch (err) {
            console.error(err);
            alert("처리 중 오류가 발생했습니다.");
        }
    });
}

function showTaskDetail(taskId, data) {
    detailContainer.innerHTML = '';
    const content = tplTaskDetailView.content.cloneNode(true);
    detailContainer.appendChild(content);

    let currentStatus = data.computedStatus || data.status;

    let prioClass = `pri-${data.priority || 'NORMAL'}`;
    let statClass = `stat-${currentStatus}`;

    let statKor = currentStatus;
    if (statKor === 'PENDING') statKor = '대기';
    else if (statKor === 'IN_PROGRESS') statKor = '진행중';
    else if (statKor === 'COMPLETED') statKor = '완료';
    else if (statKor === 'OVERDUE') statKor = '지연';

    document.getElementById('dtlPriority').className = 'priority-badge ' + prioClass;
    document.getElementById('dtlPriority').innerText = data.priority || 'NORMAL';

    document.getElementById('dtlStatus').className = 'status-badge ' + statClass;
    document.getElementById('dtlStatus').innerText = statKor;

    document.getElementById('dtlTitle').innerText = data.title;
    document.getElementById('dtlTeam').innerText = data.teamId || '-';
    document.getElementById('dtlAssignee').innerText = data.assigneeName || '미배정';
    document.getElementById('dtlDueDate').innerText = data.dueDate ? data.dueDate.replace('T', ' ') : '기한 없음';
    document.getElementById('dtlDesc').innerText = data.description;

    document.getElementById('dtlProgress').innerText = data.progress || 0;
    document.getElementById('dtlProgressBar').style.width = (data.progress || 0) + '%';

    const actionBlock = document.getElementById('actionButtons');
    const btnCreateSub = document.getElementById('btnCreateSubTask');
    const btnReject = document.getElementById('btnRejectProcess');

    // 권한 검증: CEO 이거나 해당 팀의 팀장이면 하위 업무 배정 권한 활성화
    let isManager = ['SUPER_ADMIN', 'CEO'].includes(currentUserInfo.role);
    if (currentUserInfo.role === 'TEAM_LEADER' && currentUserInfo.teamId === data.teamId) {
        isManager = true;
    }

    if (isManager) {
        actionBlock.style.display = 'flex';

        btnCreateSub.addEventListener('click', () => {
            showTaskForm(taskId);
        });

        if (data.status === 'COMPLETED') {
            btnReject.style.display = 'block';
            btnReject.addEventListener('click', async () => {
                if (confirm("이 업무를 반려하고 다시 진행중(IN_PROGRESS) 상태로 돌리겠습니까?")) {
                    await updateTask(taskId, currentUserInfo.uid, {
                        status: 'IN_PROGRESS',
                        progress: 0
                    });

                    await logTaskAction(taskId, currentUserInfo.uid, 'REJECTED', '100', '0', '팀장/CEO에 의한 반려 처리');
                    alert("반려 처리되었습니다.");
                }
            });
        }
    }


    const employeeActionSection = document.getElementById('employeeActionSection');
    const reportContent = document.getElementById('reportContent');
    const reportProgress = document.getElementById('reportProgress');
    const btnSubmitReport = document.getElementById('btnSubmitReport');

    // Authority Check for Employee Reporting
    if (currentUserInfo.email === data.assignedTo) {
        employeeActionSection.style.display = 'block';
        reportProgress.value = data.progress || 0;

        btnSubmitReport.addEventListener('click', async () => {
            const content = reportContent.value.trim();
            const prog = parseInt(reportProgress.value, 10);

            if (!content) {
                alert("진행 내용을 입력해주세요.");
                return;
            }
            if (isNaN(prog) || prog < 0 || prog > 100) {
                alert("진행률은 0에서 100 사이의 숫자로 입력해주세요.");
                return;
            }

            btnSubmitReport.disabled = true;
            btnSubmitReport.innerText = '제출 중...';

            try {
                let newStatus = prog === 100 ? 'COMPLETED' : 'IN_PROGRESS';
                
                await submitTaskReport(taskId, {
                    content: content,
                    progress: prog,
                    submittedBy: currentUserInfo.uid,
                    submittedByName: currentUserInfo.name || currentUserInfo.email
                });

                await updateTask(taskId, currentUserInfo.uid, {
                    status: newStatus,
                    progress: prog
                });

                alert("업무 보고가 완료되었습니다.");
                reportContent.value = '';
            } catch (err) {
                console.error("보고 실패:", err);
                alert("보고 제출 중 오류가 발생했습니다.");
            } finally {
                btnSubmitReport.disabled = false;
                btnSubmitReport.innerText = '보고 제출';
            }
        });
    }

    loadTaskTimeline(taskId);
    loadTaskReports(taskId);
}

function loadTaskReports(taskId) {
    const repContainer = document.getElementById('dtlReports');
    const q = query(collection(db, 'task_reports'), where('taskId', '==', taskId), orderBy('createdAt', 'desc'));

    onSnapshot(q, (snap) => {
        repContainer.innerHTML = '';
        if (snap.empty) {
            repContainer.innerHTML = '<div style="color:#64748b; font-size:0.9rem;">작성된 보고 내용이 없습니다.</div>';
            return;
        }

        snap.forEach(docSnap => {
            const row = docSnap.data();
            let dateStr = row.createdAt ? row.createdAt.toDate().toLocaleString() : '';

            const div = document.createElement('div');
            div.style.cssText = 'background:#f8fafc; padding:1rem; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:1rem;';
            div.innerHTML = `
                <div style="font-size:0.85rem; color:#64748b; margin-bottom:0.5rem; display:flex; justify-content:space-between;">
                    <span>보고 진행률: ${row.progress || 0}%</span>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.95rem; white-space:pre-wrap;">${row.content}</div>
            `;
            repContainer.appendChild(div);
        });
    });
}

function loadTaskTimeline(taskId) {
    const tlContainer = document.getElementById('dtlTimeline');
    const q = query(collection(db, 'task_logs'), where('taskId', '==', taskId), orderBy('createdAt', 'asc'));

    onSnapshot(q, (snap) => {
        tlContainer.innerHTML = '';
        snap.forEach(docSnap => {
            const act = docSnap.data();
            let dateStr = '';
            if (act.createdAt) {
                const date = act.createdAt.toDate();
                dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            }

            const item = document.createElement('div');
            item.className = 'timeline-item';

            let label = act.action;
            if (label === 'CREATE') label = '(CEO/상급자) 업무지시';
            else if (label === 'UPDATE') label = '상태/진행률 변경';
            else if (label === 'REPORT') label = '결과보고 제출';
            else if (label === 'REJECTED') label = '업무 반려';

            item.innerHTML = `
                <div class="timeline-date">${dateStr}</div>
                <div class="timeline-content">
                    <strong>${label}</strong><br>
                    <span style="font-size:0.8rem; color:#64748b;">${act.newValue || ''}</span>
                </div>
            `;
            tlContainer.appendChild(item);
        });
    });
}
