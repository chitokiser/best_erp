import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { createTask, createSubTask, updateTask, submitTaskReport, logTaskAction, addTaskComment } from '../task-manager.js';
import { checkAdminAuth } from '../auth.js';

let currentUserInfo = null;
let allTasks = [];
let activeFilterTab = 'ALL'; // ALL, MEETING, REPORT, TASK
let currentSearchQuery = '';
let currentFilterStatus = '';
let currentFilterTeam = '';
let currentFilterMerchant = 'ALL';
let selectedPhotosBase64 = [];
let editingTaskId = null;
let activeTaskId = null;

function getIsSuperAdmin() {
    const email = currentUserInfo?.email || auth.currentUser?.email || '';
    const role = currentUserInfo?.role || window.currentUserRole || '';
    if (email === 'daguri75@gmail.com') return true;
    if (role === 'SUPER_ADMIN') return true;
    if (window.tenantId === 'system_master') return true;
    return false;
}

function getMyMerchantId() {
    const mId = currentUserInfo?.merchantId || currentUserInfo?.tenantId || window.tenantId;
    if (mId && mId !== 'undefined' && mId !== 'null' && mId !== 'system_master') {
        return String(mId).trim();
    }
    return '1791605366';
}

const taskListContainer = document.getElementById('taskListContainer');
const detailContainer = document.getElementById('taskDetailContainer');
const tplTaskForm = document.getElementById('tplTaskForm');
const tplTaskDetailView = document.getElementById('tplTaskDetailView');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Check Admin Auth & initialize Brand / Nav
    checkAdminAuth();

    // 2. Auth State Changed
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = '../login.html?redirect=' + redirectUrl;
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const uData = userDoc.exists() ? userDoc.data() : {};
            const resolvedEmail = user.email || uData.email || '';
            const resolvedName = uData.name || uData.displayName || user.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : '직원');
            const resolvedRole = uData.role || window.currentUserRole || 'STAFF';
            const resolvedPosition = uData.position || window.currentUserPosition || '직원';
            const resolvedTeam = uData.teamId || uData.department || 'SALES';
            const resolvedMerchantId = String(uData.merchantId || uData.tenantId || window.tenantId || '1791605366').trim();

            currentUserInfo = {
                uid: user.uid,
                email: resolvedEmail,
                name: resolvedName,
                role: resolvedRole,
                position: resolvedPosition,
                teamId: resolvedTeam,
                merchantId: resolvedMerchantId,
                tenantId: resolvedMerchantId,
                ...uData
            };
        } catch (e) {
            console.warn("User profile fetch error:", e);
            const resolvedEmail = user.email || '';
            const resolvedName = user.displayName || (resolvedEmail ? resolvedEmail.split('@')[0] : '직원');
            currentUserInfo = {
                uid: user.uid,
                email: resolvedEmail,
                name: resolvedName,
                role: window.currentUserRole || 'STAFF',
                position: window.currentUserPosition || '직원',
                teamId: 'SALES',
                merchantId: String(window.tenantId || '1791605366').trim(),
                tenantId: String(window.tenantId || '1791605366').trim()
            };
        }

        const uInfoEl = document.getElementById('userInfo');
        if (uInfoEl) {
            uInfoEl.innerText = `${currentUserInfo.name || user.email} (${currentUserInfo.role || '직원'})`;
        }

        initTaskBoard();
        initMeetingReportModal();
    });
});

function initTaskBoard() {
    const urlParams = new URLSearchParams(window.location.search);
    const assigneeParam = urlParams.get('assignee');
    const taskIdParam = urlParams.get('taskId') || urlParams.get('id');

    if (assigneeParam) {
        setTimeout(() => showTaskForm('', assigneeParam), 500);
    }

    // Bind New Task Button
    const btnNewTask = document.getElementById('btnNewTask');
    if (btnNewTask) {
        btnNewTask.addEventListener('click', () => {
            showTaskForm();
        });
    }

    // Bind Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            activeFilterTab = tabBtn.dataset.tab;
            applyFiltersAndRender();
        });
    });

    // Bind Search Input
    const searchInput = document.getElementById('taskSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            currentSearchQuery = e.target.value.trim().toLowerCase();
            applyFiltersAndRender();
        });
    }

    // Bind Status & Team Filters
    const filterStatus = document.getElementById('filterStatus');
    if (filterStatus) {
        filterStatus.addEventListener('change', (e) => {
            currentFilterStatus = e.target.value;
            applyFiltersAndRender();
        });
    }

    const filterTeam = document.getElementById('filterTeam');
    if (filterTeam) {
        filterTeam.addEventListener('change', (e) => {
            currentFilterTeam = e.target.value;
            applyFiltersAndRender();
        });
    }

    const isSuperAdmin = getIsSuperAdmin();
    const myMerchantId = getMyMerchantId();

    // Setup Super Admin Merchant Filter
    const filterMerchant = document.getElementById('filterMerchant');
    if (filterMerchant) {
        if (isSuperAdmin) {
            filterMerchant.style.display = 'inline-block';
            filterMerchant.addEventListener('change', (e) => {
                currentFilterMerchant = e.target.value;
                applyFiltersAndRender();
            });
        } else {
            filterMerchant.style.display = 'none';
        }
    }

    // Setup Super Admin Modal Target Franchise Selector
    const mWrap = document.getElementById('mReportMerchantWrap');
    if (mWrap) {
        mWrap.style.display = isSuperAdmin ? 'block' : 'none';
    }

    // Realtime Listener for Tasks based on Role
    let q;
    if (isSuperAdmin) {
        q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    } else if (currentUserInfo?.role === 'TEAM_LEADER') {
        q = query(collection(db, 'tasks'), where('teamId', '==', currentUserInfo?.teamId || ''), orderBy('createdAt', 'desc'));
    } else {
        q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    }

    onSnapshot(q, (snapshot) => {
        allTasks = [];
        snapshot.forEach(docSnap => {
            const d = docSnap.data();
            // Auto-tag Baekje Galbi / Best Winner tasks if missing merchantId
            if (!d.merchantId && !d.tenantId) {
                const combined = `${d.title || ''} ${d.meetingPartner || ''} ${d.description || ''}`;
                if (combined.includes('백제갈비') || combined.includes('1794710386')) {
                    d.merchantId = '1794710386';
                    d.tenantId = '1794710386';
                    d.storeName = '백제갈비';
                    updateDoc(doc(db, 'tasks', docSnap.id), { merchantId: '1794710386', tenantId: '1794710386', storeName: '백제갈비' }).catch(() => {});
                } else if (combined.includes('베스트위너') || combined.includes('1791605366')) {
                    d.merchantId = '1791605366';
                    d.tenantId = '1791605366';
                    d.storeName = 'BEST WINNER';
                    updateDoc(doc(db, 'tasks', docSnap.id), { merchantId: '1791605366', tenantId: '1791605366', storeName: 'BEST WINNER' }).catch(() => {});
                }
            }
            allTasks.push({ id: docSnap.id, ...d });
        });

        // Sort descending by createdAt
        allTasks.sort((a, b) => {
            let t1 = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
            let t2 = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
            return t2 - t1;
        });

        // Update related tasks dropdown in meeting report modal
        populateRelatedTasksSelect();

        applyFiltersAndRender();

        // Auto-select task if URL has taskId parameter
        if (taskIdParam && !activeTaskId) {
            const foundTask = allTasks.find(t => t.id === taskIdParam);
            if (foundTask) {
                activeTaskId = foundTask.id;
                showTaskDetail(foundTask.id, foundTask, true);
            } else {
                getDoc(doc(db, 'tasks', taskIdParam)).then(dSnap => {
                    if (dSnap.exists()) {
                        const directTask = { id: dSnap.id, ...dSnap.data() };
                        activeTaskId = directTask.id;
                        showTaskDetail(directTask.id, directTask, true);
                    }
                }).catch(err => console.warn("Failed to load deep-linked task:", err));
            }
        }

        // Refresh detail view if currently open
        if (activeTaskId) {
            const currentItem = allTasks.find(t => t.id === activeTaskId);
            if (currentItem) {
                showTaskDetail(currentItem.id, currentItem, false);
            }
        }
    }, (error) => {
        console.error("Firestore tasks onSnapshot error:", error);
    });
}

function populateRelatedTasksSelect() {
    const sel = document.getElementById('mReportRelatedTask');
    if (!sel) return;

    const prevVal = sel.value;
    sel.innerHTML = '<option value="">-- 독립 신규 보고 (관련 업무 없음) --</option>';

    allTasks.forEach(t => {
        if (t.status !== 'COMPLETED' || t.type === 'TASK' || !t.type) {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `[${t.teamId || '전체'}] ${t.title}`;
            sel.appendChild(opt);
        }
    });

    if (prevVal) sel.value = prevVal;
}

function applyFiltersAndRender() {
    taskListContainer.innerHTML = '';

    const isSuperAdmin = getIsSuperAdmin();
    const myMerchantId = getMyMerchantId();
    const userEmailLower = (currentUserInfo?.email || auth.currentUser?.email || '').toLowerCase().trim();
    const userUid = currentUserInfo?.uid || auth.currentUser?.uid || '';

    const filtered = allTasks.filter(item => {
        const isMeeting = item.type === 'MEETING' || item.type === 'FIELD' || item.category === 'MEETING_REPORT';
        const isReport = item.type === 'WORK_REPORT' || item.type === 'ISSUE' || item.type === 'IDEA' || item.category === 'WORK_REPORT';
        const isTask = !isMeeting && !isReport;

        // 0. Multi-Tenant Franchise Isolation
        const taskMerchant = String(item.merchantId || item.tenantId || '').trim();
        const isAssignedToMe = (item.assignedTo && userEmailLower && item.assignedTo.toLowerCase() === userEmailLower);
        const isCreatedByMe = (item.creatorEmail && userEmailLower && item.creatorEmail.toLowerCase() === userEmailLower) || (userUid && item.createdBy === userUid);

        if (isSuperAdmin) {
            // Super Admin Merchant Scope Filter
            if (currentFilterMerchant && currentFilterMerchant !== 'ALL') {
                if (taskMerchant && taskMerchant !== currentFilterMerchant) return false;
                if (!taskMerchant) {
                    const combined = `${item.title || ''} ${item.meetingPartner || ''} ${item.description || ''}`;
                    if (currentFilterMerchant === '1794710386' && !combined.includes('백제갈비')) return false;
                    if (currentFilterMerchant === '1791605366' && !combined.includes('베스트위너') && !combined.includes('BEST WINNER')) return false;
                }
            }
        } else {
            // Strict Franchise Owner / Staff Isolation
            if (!isAssignedToMe && !isCreatedByMe) {
                if (myMerchantId) {
                    // Hide any task belonging to a different franchise
                    if (taskMerchant && taskMerchant !== myMerchantId) {
                        return false;
                    }
                    // Hide tasks without merchantId that mention another franchise in title/partner/description
                    const combined = `${item.title || ''} ${item.meetingPartner || ''} ${item.description || ''}`;
                    if (myMerchantId === '1791605366') {
                        if (taskMerchant === '1794710386' || combined.includes('백제갈비') || combined.includes('대한김치') || combined.includes('베스트마리오') || combined.includes('sunvietnam')) {
                            return false;
                        }
                    } else if (myMerchantId === '1794710386') {
                        if (taskMerchant === '1791605366' || combined.includes('베스트위너') || combined.includes('BEST WINNER') || combined.includes('대한김치')) {
                            return false;
                        }
                    }
                }
            }
        }

        // 1. Tab filter
        if (activeFilterTab === 'MEETING' && !isMeeting) return false;
        if (activeFilterTab === 'REPORT' && !isReport) return false;
        if (activeFilterTab === 'TASK' && !isTask) return false;

        // 2. Status filter
        let currentStatus = item.status || 'PENDING';
        if (currentStatus !== 'COMPLETED' && item.dueDate) {
            if (new Date(item.dueDate) < new Date()) {
                currentStatus = 'OVERDUE';
            }
        }
        if (currentFilterStatus && currentStatus !== currentFilterStatus) {
            return false;
        }

        // 3. Team filter
        if (currentFilterTeam && item.teamId !== currentFilterTeam) {
            return false;
        }

        // 4. Search query
        if (currentSearchQuery) {
            const targetStr = [
                item.title,
                item.description,
                item.meetingPartner,
                item.meetingLocation,
                item.assigneeName,
                item.creatorName
            ].filter(Boolean).join(' ').toLowerCase();

            if (!targetStr.includes(currentSearchQuery)) {
                return false;
            }
        }

        return true;
    });

    if (filtered.length === 0) {
        taskListContainer.innerHTML = `
            <div style="padding:2.5rem 1rem; color:#94a3b8; text-align:center;">
                <div style="font-size:2rem; margin-bottom:0.5rem;">📭</div>
                조건에 맞는 업무 또는 외근/미팅 보고가 없습니다.
            </div>`;
        return;
    }

    filtered.forEach(task => {
        renderTaskListItem(task.id, task);
    });
}

function renderTaskListItem(id, data) {
    const div = document.createElement('div');

    const isMeeting = data.type === 'MEETING' || data.type === 'FIELD' || data.category === 'MEETING_REPORT';
    const isReport = data.type === 'WORK_REPORT' || data.type === 'ISSUE' || data.type === 'IDEA' || data.category === 'WORK_REPORT';

    // Check OVERDUE logic
    let currentStatus = data.status || 'PENDING';
    if (currentStatus !== 'COMPLETED' && data.dueDate) {
        if (new Date(data.dueDate) < new Date()) {
            currentStatus = 'OVERDUE';
        }
    }

    div.className = `task-item ${currentStatus === 'OVERDUE' ? 'overdue' : ''}`;
    if (activeTaskId === id) {
        div.style.borderColor = 'var(--ai-primary, #4f46e5)';
        div.style.background = '#f5f7ff';
    }

    let statKor = currentStatus;
    if (statKor === 'PENDING') statKor = '대기';
    else if (statKor === 'IN_PROGRESS') statKor = '진행중';
    else if (statKor === 'ACCEPTED') statKor = '확인됨';
    else if (statKor === 'COMPLETED') statKor = (isMeeting || isReport) ? '보고완료' : '완료';
    else if (statKor === 'OVERDUE') statKor = '지연';

    let statClass = `stat-${currentStatus}`;
    let dtStr = data.dueDate ? data.dueDate.replace('T', ' ') : '-';
    let photoBadge = (data.photos && data.photos.length > 0) ? `<span title="사진 ${data.photos.length}장 첨부" style="margin-left:0.35rem; font-size:0.75rem; color:#4338ca;">📷 ${data.photos.length}</span>` : '';

    if (isMeeting) {
        const typeLabel = data.type === 'FIELD' ? '🚗 현장출장' : '🤝 외근/미팅';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; align-items:center;">
                <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
                    <span class="badge-type-meeting">${typeLabel}</span>
                    <span class="tag-author" style="background:#e0f2fe; color:#0369a1; padding:0.12rem 0.5rem; border-radius:999px; font-weight:700; font-size:0.73rem; border:1px solid #bae6fd;">✍️ ${data.creatorName || data.assigneeName || '직원'}</span>
                </div>
                <span class="status-badge ${statClass}">${statKor}</span>
            </div>
            <h4 style="margin: 0 0 0.35rem 0; font-size:0.95rem; color:#1e293b; line-height:1.4;">${data.title}</h4>
            <div style="font-size:0.8rem; color:#047857; margin-bottom:0.35rem; font-weight:600;">
                🏢 ${data.meetingPartner || '미팅대상 미입력'} ${data.meetingLocation ? '· 📍 ' + data.meetingLocation : ''}
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#64748b;">
                <span>작성: ${data.creatorName || data.assigneeName || '직원'} (${data.teamId || '-'})</span>
                <span>${dtStr.split(' ')[0]} ${photoBadge}</span>
            </div>
        `;
    } else if (isReport) {
        let reportLabel = '📝 업무보고';
        if (data.type === 'ISSUE') reportLabel = '🚨 이슈보고';
        if (data.type === 'IDEA') reportLabel = '💡 제안보고';

        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; align-items:center;">
                <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
                    <span class="badge-type-report">${reportLabel}</span>
                    <span class="tag-author" style="background:#e0f2fe; color:#0369a1; padding:0.12rem 0.5rem; border-radius:999px; font-weight:700; font-size:0.73rem; border:1px solid #bae6fd;">✍️ ${data.creatorName || data.assigneeName || '직원'}</span>
                </div>
                <span class="status-badge ${statClass}">${statKor}</span>
            </div>
            <h4 style="margin: 0 0 0.35rem 0; font-size:0.95rem; color:#1e293b; line-height:1.4;">${data.title}</h4>
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#64748b; margin-top:0.4rem;">
                <span>작성: ${data.creatorName || data.assigneeName || '직원'} (${data.teamId || '-'})</span>
                <span>${dtStr.split(' ')[0]} ${photoBadge}</span>
            </div>
        `;
    } else {
        // Regular Task
        let prioClass = `pri-${data.priority || 'NORMAL'}`;
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; align-items:center;">
                <div style="display:flex; gap:0.35rem; align-items:center; flex-wrap:wrap;">
                    <span class="priority-badge ${prioClass}">${data.priority || 'NORMAL'}</span>
                    <span class="tag-author" style="background:#f1f5f9; color:#475569; padding:0.12rem 0.5rem; border-radius:999px; font-weight:700; font-size:0.73rem; border:1px solid #e2e8f0;">✍️ ${data.creatorName || data.assigneeName || '직원'}</span>
                </div>
                <span class="status-badge ${statClass}">${statKor}</span>
            </div>
            <h4 style="margin: 0 0 0.35rem 0; font-size:0.95rem; color:#1e293b; line-height:1.4;">${data.title}</h4>
            <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#64748b;">
                <span>${data.teamId || '-'} / ${data.assigneeName || '미지정'}</span>
                <span>마감: ${dtStr.split(' ')[0]}</span>
            </div>
        `;
    }

    div.addEventListener('click', () => {
        activeTaskId = id;
        data.computedStatus = currentStatus;
        showTaskDetail(id, data);
        applyFiltersAndRender();
    });

    taskListContainer.appendChild(div);
}

function showTaskDetail(taskId, data, shouldScroll = true) {
    activeTaskId = taskId;
    detailContainer.innerHTML = '';
    const content = tplTaskDetailView.content.cloneNode(true);
    detailContainer.appendChild(content);

    const isMeeting = data.type === 'MEETING' || data.type === 'FIELD' || data.category === 'MEETING_REPORT';
    const isReport = data.type === 'WORK_REPORT' || data.type === 'ISSUE' || data.type === 'IDEA' || data.category === 'WORK_REPORT';

    let currentStatus = data.computedStatus || data.status || 'PENDING';
    let prioClass = `pri-${data.priority || 'NORMAL'}`;
    let statClass = `stat-${currentStatus}`;

    let statKor = currentStatus;
    if (statKor === 'PENDING') statKor = '대기';
    else if (statKor === 'IN_PROGRESS') statKor = '진행중';
    else if (statKor === 'COMPLETED') statKor = (isMeeting || isReport) ? '보고 완료' : '완료';
    else if (statKor === 'OVERDUE') statKor = '지연';

    // Priority & Type Badge
    const dtlTypeBadge = document.getElementById('dtlTypeBadge');
    if (isMeeting) {
        dtlTypeBadge.style.display = 'inline-block';
        dtlTypeBadge.className = 'badge-type-meeting';
        dtlTypeBadge.innerText = data.type === 'FIELD' ? '🚗 현장출장' : '🤝 외근/미팅 보고';
    } else if (isReport) {
        dtlTypeBadge.style.display = 'inline-block';
        dtlTypeBadge.className = 'badge-type-report';
        dtlTypeBadge.innerText = data.type === 'ISSUE' ? '🚨 이슈보고' : '📝 업무보고';
    }

    const dtlPriority = document.getElementById('dtlPriority');
    dtlPriority.className = 'priority-badge ' + prioClass;
    dtlPriority.innerText = data.priority || 'NORMAL';

    const dtlStatus = document.getElementById('dtlStatus');
    dtlStatus.className = 'status-badge ' + statClass;
    dtlStatus.innerText = statKor;

    const authorName = data.creatorName || data.creatorEmail || data.assigneeName || '직원';
    document.getElementById('dtlTitle').innerText = data.title;
    document.getElementById('dtlTeam').innerText = data.teamId || '-';
    document.getElementById('dtlAssignee').innerText = data.assigneeName || '미배정';
    document.getElementById('dtlCreator').innerText = authorName;

    // Set prominent author tag
    const dtlAuthorName = document.getElementById('dtlAuthorName');
    if (dtlAuthorName) dtlAuthorName.innerText = authorName;

    const dtlDueDate = document.getElementById('dtlDueDate');
    const dtlDateLabel = document.getElementById('dtlDateLabel');
    if (isMeeting || isReport) {
        dtlDateLabel.innerText = '미팅/보고 일시';
        dtlDueDate.innerText = data.meetingDate ? data.meetingDate.replace('T', ' ') : (data.dueDate ? data.dueDate.replace('T', ' ') : '-');
        dtlDueDate.style.color = '#047857';
    } else {
        dtlDateLabel.innerText = '마감 기한';
        dtlDueDate.innerText = data.dueDate ? data.dueDate.replace('T', ' ') : '기한 없음';
        dtlDueDate.style.color = '#b91c1c';
    }

    document.getElementById('dtlDesc').innerText = data.description || '내용이 없습니다.';
    document.getElementById('dtlProgress').innerText = data.progress || 0;
    document.getElementById('dtlProgressBar').style.width = (data.progress || 0) + '%';

    // Meeting Box Setup
    const dtlMeetingBox = document.getElementById('dtlMeetingBox');
    if (isMeeting || data.meetingPartner || data.meetingLocation) {
        dtlMeetingBox.style.display = 'block';
        document.getElementById('dtlMeetingPartner').innerText = data.meetingPartner || '-';
        document.getElementById('dtlMeetingLocation').innerText = data.meetingLocation || '-';
        document.getElementById('dtlMeetingDate').innerText = data.meetingDate ? data.meetingDate.replace('T', ' ') : '-';
        document.getElementById('dtlMeetingAttendees').innerText = data.attendees || '-';
        const dtlMeetingAuthor = document.getElementById('dtlMeetingAuthor');
        if (dtlMeetingAuthor) dtlMeetingAuthor.innerText = `${authorName} (${data.teamId || '-'})`;
    }

    // Follow-up Box Setup
    const dtlFollowUpBox = document.getElementById('dtlFollowUpBox');
    if (data.followUp) {
        dtlFollowUpBox.style.display = 'block';
        document.getElementById('dtlFollowUpContent').innerText = data.followUp;
    }

    // Photos Gallery Setup
    const dtlPhotoSection = document.getElementById('dtlPhotoSection');
    const dtlPhotoGallery = document.getElementById('dtlPhotoGallery');
    const dtlPhotoCount = document.getElementById('dtlPhotoCount');
    if (data.photos && data.photos.length > 0) {
        dtlPhotoSection.style.display = 'block';
        dtlPhotoCount.innerText = data.photos.length;
        dtlPhotoGallery.innerHTML = data.photos.map((src, idx) => `
            <div class="gallery-item" onclick="openLightbox('${src}')">
                <img src="${src}" alt="첨부사진 ${idx + 1}">
            </div>
        `).join('');
    }

    // Manager Actions (CEO / Team Leader)
    const actionBlock = document.getElementById('actionButtons');
    const btnCreateSub = document.getElementById('btnCreateSubTask');
    const btnReject = document.getElementById('btnRejectProcess');

    const userUid = currentUserInfo?.uid || auth.currentUser?.uid || '';
    const userEmailLower = (currentUserInfo?.email || auth.currentUser?.email || '').toLowerCase().trim();
    const userName = currentUserInfo?.name || currentUserInfo?.displayName || auth.currentUser?.displayName || (userEmailLower ? userEmailLower.split('@')[0] : '직원');

    let isManager = getIsSuperAdmin() || ['SUPER_ADMIN', 'CEO'].includes(currentUserInfo?.role);
    const isAuthor = (userUid && userUid === data.createdBy) ||
                     (userEmailLower && data.creatorEmail && userEmailLower === data.creatorEmail.toLowerCase()) ||
                     (userEmailLower && data.assignedTo && userEmailLower === data.assignedTo.toLowerCase());

    // Configure External Share URL Button
    const btnShare = document.getElementById('btnShareTaskOrReport');
    if (btnShare) {
        btnShare.onclick = () => {
            const shareUrl = `${window.location.origin}/admin/tasks.html?taskId=${taskId}`;
            const isStoreBestWinner = (data.merchantId === '1791605366' || data.storeName === 'BEST WINNER' || getMyMerchantId() === '1791605366');
            const storeName = isStoreBestWinner ? '베스트위너' : (data.storeName || '가맹점');

            const copySuccess = () => {
                alert(`📋 [보고서 외부 공유 URL 복사 완료]\n\n• 공유 URL:\n${shareUrl}\n\n• 외부인 열람 절차 안내:\n1. 위 URL을 외부인(열람 대상자)에게 전달합니다.\n2. 외부인은 링크 접속 후 [회원가입]을 진행합니다.\n3. ${storeName} 가맹점 대표님께서 [직원 관리] 메뉴에서 해당 외부인의 이메일을 직원으로 등록/승인합니다.\n4. 승인 후 외부인이 다시 로그인하면 본 보고서(${data.title})를 즉시 열람할 수 있습니다.`);
            };

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(copySuccess).catch(() => {
                    prompt('아래 공유 URL을 복사하여 외부인에게 전달하세요:', shareUrl);
                });
            } else {
                prompt('아래 공유 URL을 복사하여 외부인에게 전달하세요:', shareUrl);
            }
        };
    }

    // Configure Edit & Delete Buttons for Author or Managers
    const btnEdit = document.getElementById('btnEditTaskOrReport');
    const btnDelete = document.getElementById('btnDeleteTaskOrReport');

    if (btnEdit && (isAuthor || isManager)) {
        btnEdit.style.display = 'inline-flex';
        btnEdit.onclick = () => {
            openMeetingReportModal(taskId, data);
        };
    }

    if (btnDelete && (isAuthor || isManager)) {
        btnDelete.style.display = 'inline-flex';
        btnDelete.onclick = async () => {
            if (confirm(`정말로 이 보고서/업무 [${data.title}]을(를) 삭제하시겠습니까?`)) {
                try {
                    await deleteDoc(doc(db, 'tasks', taskId));
                    alert("성공적으로 삭제되었습니다.");
                    activeTaskId = null;
                    detailContainer.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8;">삭제되었습니다. 다른 업무 또는 보고서를 선택하세요.</div>';
                } catch (delErr) {
                    alert("삭제 중 오류가 발생했습니다: " + delErr.message);
                }
            }
        };
    }
    if (currentUserInfo?.role === 'TEAM_LEADER' && currentUserInfo?.teamId === data.teamId) {
        isManager = true;
    }

    if (isManager && !isMeeting && !isReport) {
        actionBlock.style.display = 'flex';
        btnCreateSub.onclick = () => {
            showTaskForm(taskId);
        };

        if (data.status === 'COMPLETED') {
            btnReject.style.display = 'block';
            btnReject.onclick = async () => {
                if (confirm("이 업무를 반려하고 다시 진행중(IN_PROGRESS) 상태로 돌리겠습니까?")) {
                    await updateTask(taskId, userUid, {
                        status: 'IN_PROGRESS',
                        progress: 0
                    });
                    await logTaskAction(taskId, userUid, 'REJECTED', '100', '0', '팀장/CEO에 의한 반려 처리');
                    alert("반려 처리되었습니다.");
                }
            };
        }
    }

    // Employee Reporting Section
    const employeeActionSection = document.getElementById('employeeActionSection');
    const empMeetingExtraFields = document.getElementById('empMeetingExtraFields');
    const reportContent = document.getElementById('reportContent');
    const reportProgress = document.getElementById('reportProgress');
    const btnSubmitReport = document.getElementById('btnSubmitReport');

    const isAssignee = (userEmailLower && data.assignedTo && userEmailLower === data.assignedTo.toLowerCase()) ||
                       (currentUserInfo?.name && currentUserInfo.name === data.assigneeName);
    const canStaffReport = isAssignee || ['STAFF', 'EMPLOYEE'].includes(currentUserInfo?.role);

    if (canStaffReport && !isMeeting && !isReport) {
        employeeActionSection.style.display = 'block';
        reportProgress.value = data.progress || 0;

        // Toggle Meeting Extra Fields
        document.querySelectorAll('input[name="empReportMode"]').forEach(radio => {
            radio.onchange = (e) => {
                if (e.target.value === 'MEETING') {
                    empMeetingExtraFields.style.display = 'flex';
                } else {
                    empMeetingExtraFields.style.display = 'none';
                }
            };
        });

        btnSubmitReport.onclick = async () => {
            const content = reportContent.value.trim();
            const prog = parseInt(reportProgress.value, 10);
            const isMeetingMode = document.querySelector('input[name="empReportMode"]:checked')?.value === 'MEETING';

            if (!content) {
                alert("진행 내용 또는 미팅 협의 사항을 입력해주세요.");
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
                let finalContent = content;

                if (isMeetingMode) {
                    const mPartner = document.getElementById('empMeetingPartner').value.trim();
                    const mLocation = document.getElementById('empMeetingLocation').value.trim();
                    const mFollowUp = document.getElementById('empMeetingFollowUp').value.trim();

                    finalContent = `[🤝 외부 미팅 보고]\n• 미팅대상: ${mPartner || '-'}\n• 미팅장소: ${mLocation || '-'}\n• 협의내용: ${content}`;
                    if (mFollowUp) {
                        finalContent += `\n• 향후조치: ${mFollowUp}`;
                    }
                }

                await submitTaskReport(taskId, {
                    content: finalContent,
                    progress: prog,
                    submittedBy: userUid,
                    submittedByName: userName
                });

                await updateTask(taskId, userUid, {
                    status: newStatus,
                    progress: prog
                });

                alert("업무 보고가 성공적으로 등록되었습니다.");
                reportContent.value = '';
            } catch (err) {
                console.error("보고 실패:", err);
                alert("보고 제출 중 오류가 발생했습니다: " + err.message);
            } finally {
                btnSubmitReport.disabled = false;
                btnSubmitReport.innerText = '보고 제출';
            }
        };
    }

    // Load Feedback & Comments
    loadTaskComments(taskId);

    // Load Reports
    loadTaskReports(taskId);

    // Load Timeline
    loadTaskTimeline(taskId);

    if (shouldScroll && window.innerWidth <= 900) {
        detailContainer.scrollIntoView({ behavior: 'smooth' });
    }
}

function loadTaskComments(taskId) {
    const commentsContainer = document.getElementById('dtlCommentsContainer');
    const commentInput = document.getElementById('dtlNewComment');
    const btnSubmit = document.getElementById('btnSubmitComment');
    if (!commentsContainer || !btnSubmit) return;

    // Realtime Listener for comments
    const q = query(collection(db, 'task_comments'), where('taskId', '==', taskId), orderBy('createdAt', 'asc'));

    onSnapshot(q, (snap) => {
        commentsContainer.innerHTML = '';
        if (snap.empty) {
            commentsContainer.innerHTML = '<div style="color:#94a3b8; font-size:0.85rem; padding:0.5rem 0;">등록된 피드백이나 코멘트가 없습니다.</div>';
            return;
        }

        snap.forEach(docSnap => {
            const comment = docSnap.data();
            let dateStr = '';
            if (comment.createdAt) {
                const date = comment.createdAt.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
                dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            }

            const item = document.createElement('div');
            item.style.cssText = 'background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.6rem 0.8rem; margin-bottom:0.5rem; font-size:0.85rem;';
            item.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.25rem;">
                    <strong style="color:#334155;">${comment.authorName || '관리자'}</strong>
                    <span style="font-size:0.75rem; color:#94a3b8;">${dateStr}</span>
                </div>
                <div style="color:#475569; white-space:pre-wrap;">${comment.content}</div>
            `;
            commentsContainer.appendChild(item);
        });
    }, (err) => {
        console.warn("Comments onSnapshot skipped:", err);
    });

    btnSubmit.onclick = async () => {
        const text = commentInput.value.trim();
        if (!text) return;

        btnSubmit.disabled = true;
        try {
            await addDoc(collection(db, 'task_comments'), {
                taskId,
                authorId: currentUserInfo.uid,
                authorName: currentUserInfo.name || currentUserInfo.email,
                authorRole: currentUserInfo.role || 'STAFF',
                content: text,
                createdAt: serverTimestamp()
            });

            await logTaskAction(taskId, currentUserInfo.uid, 'COMMENT', '', text);
            commentInput.value = '';
        } catch (e) {
            alert("코멘트 등록 에러: " + e.message);
        } finally {
            btnSubmit.disabled = false;
        }
    };
}

function loadTaskReports(taskId) {
    const repContainer = document.getElementById('dtlReports');
    const q = query(collection(db, 'task_reports'), where('taskId', '==', taskId), orderBy('createdAt', 'desc'));

    onSnapshot(q, (snap) => {
        repContainer.innerHTML = '';
        if (snap.empty) {
            repContainer.innerHTML = '<div style="color:#64748b; font-size:0.85rem;">작성된 세부 보고 내역이 없습니다.</div>';
            return;
        }

        snap.forEach(docSnap => {
            const row = docSnap.data();
            let dateStr = row.createdAt ? (row.createdAt.toDate ? row.createdAt.toDate().toLocaleString() : new Date(row.createdAt).toLocaleString()) : '';

            const div = document.createElement('div');
            div.style.cssText = 'background:#f8fafc; padding:0.85rem; border:1px solid #e2e8f0; border-radius:8px; margin-bottom:0.75rem;';
            div.innerHTML = `
                <div style="font-size:0.8rem; color:#64748b; margin-bottom:0.4rem; display:flex; justify-content:space-between;">
                    <span>보고자: <strong>${row.submittedByName || '직원'}</strong> (진행률: ${row.progress || 0}%)</span>
                    <span>${dateStr}</span>
                </div>
                <div style="font-size:0.9rem; white-space:pre-wrap; line-height:1.5; color:#1e293b;">${row.content}</div>
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
                const date = act.createdAt.toDate ? act.createdAt.toDate() : new Date(act.createdAt);
                dateStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
            }

            const item = document.createElement('div');
            item.className = 'timeline-item';

            let label = act.action;
            if (label === 'CREATE') label = '(CEO/상급자) 업무지시';
            else if (label === 'UPDATE') label = '상태/진행률 변경';
            else if (label === 'REPORT') label = '결과/미팅보고 제출';
            else if (label === 'COMMENT') label = '피드백/코멘트 등록';
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

// -------------------------------------------------------------
// External Meeting & Work Report Modal Logic
// -------------------------------------------------------------
function initMeetingReportModal() {
    const modal = document.getElementById('meetingReportModal');
    const btnOpen = document.getElementById('btnNewMeetingReport');
    const btnClose = document.getElementById('btnCloseMeetingModal');
    const btnCancel = document.getElementById('btnCancelMeetingModal');
    const form = document.getElementById('meetingReportForm');
    const photoInput = document.getElementById('mReportPhotoInput');
    const btnTriggerPhoto = document.getElementById('btnTriggerPhoto');

    if (!modal) return;

    // Open Modal (Idempotent onclick)
    if (btnOpen) {
        btnOpen.onclick = () => {
            openMeetingReportModal();
        };
    }

    // Close Modal (Idempotent onclick)
    if (btnClose) btnClose.onclick = () => closeMeetingReportModal();
    if (btnCancel) btnCancel.onclick = () => closeMeetingReportModal();

    // Trigger Photo Upload
    if (btnTriggerPhoto && photoInput) {
        btnTriggerPhoto.onclick = () => {
            photoInput.click();
        };
        photoInput.onchange = handlePhotoSelection;
    }

    // Lightbox close handler
    const lightbox = document.getElementById('imageLightbox');
    if (lightbox) {
        lightbox.onclick = () => {
            lightbox.style.display = 'none';
        };
    }

    // Form Submit (Idempotent onsubmit)
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            const type = document.getElementById('mReportType')?.value || 'MEETING';
            const title = document.getElementById('mReportTitle')?.value.trim() || '';
            const partner = document.getElementById('mReportPartner')?.value.trim() || '';
            const location = document.getElementById('mReportLocation')?.value.trim() || '';
            const date = document.getElementById('mReportDate')?.value || new Date().toISOString().slice(0, 16);
            const attendees = document.getElementById('mReportAttendees')?.value.trim() || '';
            const teamId = document.getElementById('mReportTeam')?.value || currentUserInfo?.teamId || 'SALES';
            const relatedTaskId = document.getElementById('mReportRelatedTask')?.value || '';
            const content = document.getElementById('mReportContent')?.value.trim() || '';
            const followUp = document.getElementById('mReportFollowUp')?.value.trim() || '';

            if (!title) {
                alert("보고 제목을 입력해주세요.");
                return;
            }
            if (!content) {
                alert("상세 협의 내용 및 보고 내용을 작성해주세요.");
                return;
            }

            const btnSubmit = document.getElementById('btnSubmitMeetingReport');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<span>⏳</span> 등록 중...';
            }

            try {
                const isMeeting = type === 'MEETING' || type === 'FIELD';
                const category = isMeeting ? 'MEETING_REPORT' : 'WORK_REPORT';

                const safeUid = currentUserInfo?.uid || auth.currentUser?.uid || 'anonymous';
                const safeEmail = currentUserInfo?.email || auth.currentUser?.email || '';
                const safeName = currentUserInfo?.name || currentUserInfo?.displayName || auth.currentUser?.displayName || (safeEmail ? safeEmail.split('@')[0] : '직원');
                const safeTeam = teamId || currentUserInfo?.teamId || 'SALES';

                if (editingTaskId) {
                    // Update / Refine existing report
                    await updateDoc(doc(db, 'tasks', editingTaskId), {
                        type,
                        category,
                        title,
                        description: content,
                        meetingPartner: partner,
                        meetingLocation: location,
                        meetingDate: date,
                        dueDate: date,
                        attendees: attendees,
                        teamId: safeTeam,
                        parentTaskId: relatedTaskId || null,
                        followUp: followUp,
                        photos: selectedPhotosBase64 || [],
                        updatedAt: serverTimestamp(),
                        lastModifiedByName: safeName
                    });

                    await logTaskAction(editingTaskId, safeUid, 'UPDATE', '', `보고서 수정보완 완료 (${safeName})`);

                    alert("✅ 보고서가 성공적으로 수정보완되었습니다.");
                    closeMeetingReportModal();
                    editingTaskId = null;
                    return;
                }

                // Determine Franchise Merchant ID
                const isSuperAdmin = getIsSuperAdmin();
                const myMerchantId = getMyMerchantId();

                let reportMerchantId = myMerchantId || '1791605366';
                let reportStoreName = window.currentStoreName || 'BEST WINNER';

                if (isSuperAdmin) {
                    const mSelect = document.getElementById('mReportMerchant');
                    if (mSelect && mSelect.value) {
                        reportMerchantId = mSelect.value;
                        reportStoreName = mSelect.options[mSelect.selectedIndex]?.dataset.name || '본사';
                    }
                }

                const reportPayload = {
                    type,
                    category,
                    title,
                    description: content,
                    meetingPartner: partner,
                    meetingLocation: location,
                    meetingDate: date,
                    attendees: attendees,
                    followUp: followUp,
                    photos: selectedPhotosBase64 || [],
                    teamId: safeTeam,
                    merchantId: String(reportMerchantId),
                    tenantId: String(reportMerchantId),
                    storeName: reportStoreName,
                    assignedTo: safeEmail,
                    assigneeName: safeName,
                    dueDate: date,
                    priority: type === 'ISSUE' ? 'URGENT' : (isMeeting ? 'HIGH' : 'NORMAL'),
                    parentTaskId: relatedTaskId || null,
                    createdBy: safeUid,
                    creatorName: safeName,
                    creatorEmail: safeEmail,
                    progress: 100,
                    status: 'COMPLETED'
                };

                // 1. Create Task document
                const newTaskId = await createTask(reportPayload);

                // 2. Log Action
                await logTaskAction(newTaskId, safeUid, 'REPORT', '', `${isMeeting ? '외부 미팅' : '업무'} 보고서 등록: ${title}`);

                // 3. If tied to related task, also append to that task's reports
                if (relatedTaskId) {
                    await submitTaskReport(relatedTaskId, {
                        content: `[${isMeeting ? '외부 미팅 결과' : '업무보고 연계'}] ${title}\n• 대상: ${partner || '-'}\n• 장소: ${location || '-'}\n• 내용: ${content}\n• 후속과제: ${followUp || '-'}`,
                        progress: 100,
                        submittedBy: safeUid,
                        submittedByName: safeName
                    });
                }

                alert("✅ 외부 미팅 및 업무 보고서가 성공적으로 등록되었습니다. CEO 및 팀장에게 실시간 공유됩니다.");
                closeMeetingReportModal();
                if (form) form.reset();
                selectedPhotosBase64 = [];
                renderPhotoPreviews();
            } catch (err) {
                console.error("보고서 등록 에러:", err);
                alert("보고서 등록 중 오류가 발생했습니다: " + err.message);
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = '<span>✓</span> 보고서 제출하기';
                }
            }
        };
    }
}

function openMeetingReportModal(editTaskId = null, existingData = null) {
    const modal = document.getElementById('meetingReportModal');
    if (!modal) return;

    const modalTitle = document.getElementById('mModalTitle');
    const btnSubmit = document.getElementById('btnSubmitMeetingReport');
    const form = document.getElementById('meetingReportForm');

    if (editTaskId && existingData) {
        editingTaskId = editTaskId;
        if (modalTitle) modalTitle.innerHTML = '<span>✏️</span> 보고서 수정보완 (내용 수정 및 추가)';
        if (btnSubmit) btnSubmit.innerHTML = '<span>💾</span> 수정보완 내용 저장하기';

        document.getElementById('mReportType').value = existingData.type || (existingData.meetingPartner ? 'MEETING' : 'WORK_REPORT');
        document.getElementById('mReportTitle').value = existingData.title || '';
        document.getElementById('mReportPartner').value = existingData.meetingPartner || '';
        document.getElementById('mReportLocation').value = existingData.meetingLocation || '';
        document.getElementById('mReportDate').value = existingData.meetingDate || existingData.dueDate || '';
        document.getElementById('mReportAttendees').value = existingData.attendees || '';
        document.getElementById('mReportTeam').value = existingData.teamId || currentUserInfo?.teamId || 'SALES';
        document.getElementById('mReportRelatedTask').value = existingData.parentTaskId || '';
        document.getElementById('mReportContent').value = existingData.description || '';
        document.getElementById('mReportFollowUp').value = existingData.followUp || '';

        selectedPhotosBase64 = [...(existingData.photos || [])];
        renderPhotoPreviews();
    } else {
        editingTaskId = null;
        if (modalTitle) modalTitle.innerHTML = '<span>🤝</span> 외부 미팅 및 기타 업무보고 작성';
        if (btnSubmit) btnSubmit.innerHTML = '<span>✓</span> 보고서 제출하기';
        if (form) form.reset();

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        
        const dateInput = document.getElementById('mReportDate');
        if (dateInput) dateInput.value = localIso;

        const teamSel = document.getElementById('mReportTeam');
        if (teamSel && currentUserInfo?.teamId) {
            teamSel.value = currentUserInfo.teamId;
        }

        selectedPhotosBase64 = [];
        renderPhotoPreviews();
    }

    modal.style.display = 'flex';
}

function closeMeetingReportModal() {
    const modal = document.getElementById('meetingReportModal');
    if (modal) modal.style.display = 'none';
}

function handlePhotoSelection(e) {
    const files = Array.from(e.target.files);
    if (!files || files.length === 0) return;

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 1200;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.72);

                selectedPhotosBase64.push(compressedBase64);
                renderPhotoPreviews();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    e.target.value = '';
}

function renderPhotoPreviews() {
    const container = document.getElementById('mPhotoPreviewContainer');
    const countNotice = document.getElementById('mPhotoCountNotice');
    if (!container) return;

    if (countNotice) {
        countNotice.textContent = `선택된 사진: ${selectedPhotosBase64.length}장`;
    }

    container.innerHTML = selectedPhotosBase64.map((src, idx) => `
        <div class="photo-thumb-wrap">
            <img src="${src}" alt="사진 미리보기">
            <button type="button" class="photo-thumb-remove" onclick="removeSelectedPhoto(${idx})">✕</button>
        </div>
    `).join('');
}

window.removeSelectedPhoto = (index) => {
    selectedPhotosBase64.splice(index, 1);
    renderPhotoPreviews();
};

window.openLightbox = (src) => {
    const lightbox = document.getElementById('imageLightbox');
    const img = document.getElementById('lightboxImg');
    if (lightbox && img) {
        img.src = src;
        lightbox.style.display = 'flex';
    }
};

async function populateUsers(selectElem) {
    const usersSnap = await getDocs(collection(db, 'users'));
    selectElem.innerHTML = '<option value="">-- 팀장/부서 일괄 --</option>';
    usersSnap.forEach(doc => {
        const u = doc.data();
        if (u.role === 'STAFF' || u.role === 'EMPLOYEE') {
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

    populateUsers(assigneeSelect).then(() => {
        if (initialAssignee) {
            assigneeSelect.value = initialAssignee;
        }
    });

    const btnCancel = document.getElementById('btnCancelForm');
    if (btnCancel) {
        btnCancel.onclick = () => {
            detailContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8;">취소되었습니다.</div>`;
        };
    }

    form.onsubmit = async (e) => {
        e.preventDefault();

        let assignedTo = assigneeSelect.value || '';
        let assigneeName = '';
        if (assignedTo && assigneeSelect.selectedIndex >= 0) {
            assigneeName = assigneeSelect.options[assigneeSelect.selectedIndex]?.dataset.name || assignedTo;
        } else {
            assigneeName = '해당 없음 (일괄배정)';
        }

        const safeUid = currentUserInfo?.uid || auth.currentUser?.uid || 'anonymous';
        const safeEmail = currentUserInfo?.email || auth.currentUser?.email || '';
        const safeName = currentUserInfo?.name || currentUserInfo?.displayName || auth.currentUser?.displayName || (safeEmail ? safeEmail.split('@')[0] : '직원');
        const myMerchantId = getMyMerchantId();

        const taskData = {
            type: 'TASK',
            category: 'GENERAL_TASK',
            title: document.getElementById('taskTitle')?.value || '',
            description: document.getElementById('taskDesc')?.value || '',
            teamId: document.getElementById('taskTeam')?.value || 'SALES',
            assignedTo: assignedTo,
            assigneeName: assigneeName,
            dueDate: document.getElementById('taskDueDate')?.value || '',
            priority: document.getElementById('taskPriority')?.value || 'NORMAL',
            parentTaskId: document.getElementById('taskParentId')?.value || null,
            merchantId: String(myMerchantId),
            tenantId: String(myMerchantId),
            storeName: window.currentStoreName || 'BEST WINNER',
            createdBy: safeUid,
            creatorName: safeName,
            creatorEmail: safeEmail,
            progress: 0,
            status: 'PENDING'
        };

        try {
            await createTask(taskData);
            alert("업무가 성공적으로 등록/배정되었습니다.");
            detailContainer.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#94a3b8;">생성 완료! 다른 업무를 선택하세요.</div>`;
        } catch (err) {
            console.error(err);
            alert("처리 중 오류가 발생했습니다: " + err.message);
        }
    };
}
