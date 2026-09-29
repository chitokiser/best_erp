const fs = require('fs');

const code = `<script type="module">
    import { checkAdminAuth, logoutAdmin } from '../assets/js/auth.js';
    import { db } from '../assets/js/firebase-config.js';
    import { doc, getDoc, collection, addDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    window.logoutAndRedirect = () => { logoutAdmin(); };
    window.draggedCardId = null;
    window.currentUserEmail = 'Unknown';
    window.currentProjectData = null;

    window.switchTab = (tab) => {
        document.getElementById('view-kanban').style.display = tab === 'kanban' ? 'block' : 'none';
        document.getElementById('view-files').style.display = tab === 'files' ? 'block' : 'none';
        const qnaView = document.getElementById('view-qna');
        if (qnaView) qnaView.style.display = tab === 'qna' ? 'block' : 'none';

        ['kanban', 'files', 'qna'].forEach(t => {
            const el = document.getElementById('tab-' + t);
            if (el) {
                if (t === tab) {
                    el.style.color = 'var(--primary-color)';
                    el.style.borderBottom = '2px solid var(--primary-color)';
                } else {
                    el.style.color = 'var(--text-secondary)';
                    el.style.borderBottom = 'none';
                }
            }
        });

        if (tab === 'files') window.loadFiles();
        if (tab === 'qna') window.loadQna();
    };

    async function loadProjectDetails() {
        if (!projectId) return;
        const snap = await getDoc(doc(db, 'projects', projectId));
        if (snap.exists()) {
            const data = snap.data();
            window.currentProjectData = data;
            document.getElementById('projectTitleHeader').textContent = data.title;
            document.getElementById('projectPmBadge').textContent = 'PM: ' + (data.pm || '미배정');
            document.getElementById('projectStatusBadge').textContent = data.status || '진행 중';
            document.getElementById('projectDeadlineBadge').textContent = '종료예정일: ' + (data.deadline || '미정');
            const tb = document.getElementById('projectTeamBadge');
            if (tb) tb.textContent = '팀원: ' + (data.team || '미배정');

            let pms = data.pm || '';
            let teams = data.team || '';
            let isPM = pms.includes(window.currentUserEmail);
            let isTeam = teams.includes(window.currentUserEmail);
            let isCEO = window.currentUserEmail === 'daguri75@gmail.com';

            if (isCEO || isPM) {
                document.getElementById('editProjectBtn').style.display = 'inline-block';
                const btnSupport = document.getElementById('btnRequestSupport');
                if (btnSupport) btnSupport.style.display = 'inline-block';
            } else if (isTeam) {
                document.getElementById('editProjectBtn').style.display = 'none';
                const btnSupport = document.getElementById('btnRequestSupport');
                if (btnSupport) btnSupport.style.display = 'inline-block';
            } else {
                document.getElementById('editProjectBtn').style.display = 'none';
                const btnSupport = document.getElementById('btnRequestSupport');
                if (btnSupport) btnSupport.style.display = 'none';
            }
        }
    }

    let pmListLoaded = false;
    async function loadPmOptions() {
        if (pmListLoaded) return;
        const pmSelect = document.getElementById('modalPmInput');
        const teamSelect = document.getElementById('modalTeamInput');
        pmSelect.innerHTML = '<option value="">선택하세요...</option>';
        if(teamSelect) teamSelect.innerHTML = '<option value="">선택하세요...</option>';
        try {
            const querySnapshot = await getDocs(collection(db, 'employees'));
            querySnapshot.forEach(userDoc => {
                const udata = userDoc.data();
                const emailOrContact = udata.contact || udata.email || '';
                if (!emailOrContact) return;
                const optText = \`\${udata.name || '무명'} (\${udata.position || '직원'}) - \${emailOrContact}\`;
                
                const optionPm = document.createElement('option');
                optionPm.value = emailOrContact; optionPm.textContent = optText;
                pmSelect.appendChild(optionPm);

                if(teamSelect) {
                    const optionTeam = document.createElement('option');
                    optionTeam.value = emailOrContact; optionTeam.textContent = optText;
                    teamSelect.appendChild(optionTeam);
                }
            });
            pmListLoaded = true;
        } catch (error) {
            console.error("Failed to load PMs:", error);
        }
    }

    window.editProjectInfo = async () => {
        if (!window.currentProjectData) return;
        const data = window.currentProjectData;

        const modal = document.getElementById('projectModal');
        document.getElementById('modalTitle').textContent = '프로젝트 정보 수정';
        document.getElementById('modalTitleInput').value = data.title || '';
        document.getElementById('modalStatusInput').value = data.status || '착공대기';
        document.getElementById('modalDeadlineInput').value = (data.deadline && data.deadline !== 'N/A') ? data.deadline : '';

        await loadPmOptions();
        const pmSelect = document.getElementById('modalPmInput');
        const teamSelect = document.getElementById('modalTeamInput');

        Array.from(pmSelect.options).forEach(opt => opt.selected = false);
        if(teamSelect) Array.from(teamSelect.options).forEach(opt => opt.selected = false);

        const currentPms = (data.pm || '').split(',').map(s => s.trim()).filter(s => s);
        currentPms.forEach(pm => {
            let opt = Array.from(pmSelect.options).find(o => o.value === pm);
            if (!opt && pm) {
                opt = document.createElement('option');
                opt.value = pm;
                opt.textContent = \`[미등록] \${pm}\`;
                pmSelect.appendChild(opt);
            }
            if (opt) opt.selected = true;
        });
        
        const currentTeams = (data.team || '').split(',').map(s => s.trim()).filter(s => s);
        if(teamSelect) {
            currentTeams.forEach(tm => {
                let opt = Array.from(teamSelect.options).find(o => o.value === tm);
                if (!opt && tm) {
                    opt = document.createElement('option');
                    opt.value = tm; opt.textContent = \`[미등록] \${tm}\`;
                    teamSelect.appendChild(opt);
                }
                if (opt) opt.selected = true;
            });
        }

        const saveBtn = document.getElementById('modalSaveBtn');
        saveBtn.onclick = async () => {
            const title = document.getElementById('modalTitleInput').value.trim();
            const pmOptions = document.getElementById('modalPmInput').selectedOptions;
            const pms = Array.from(pmOptions).map(opt => opt.value).join(', ');
            let teams = '';
            if(teamSelect) {
                const teamOptions = teamSelect.selectedOptions;
                teams = Array.from(teamOptions).map(opt => opt.value).join(', ');
            }
            const status = document.getElementById('modalStatusInput').value;
            const deadline = document.getElementById('modalDeadlineInput').value || 'N/A';

            if (!title) { alert('프로젝트명을 입력하세요.'); return; }

            try {
                await updateDoc(doc(db, 'projects', projectId), { title, status, pm: pms, team: teams, deadline });
                modal.close();
                alert("정보가 성공적으로 수정되었습니다.");
                loadProjectDetails();
            } catch (e) { alert("수정 실패: " + e.message); }
        };
        modal.showModal();
    };

    async function loadTasks() {
        if (!projectId) return;
        ['todo', 'in_progress', 'waiting', 'done'].forEach(id => {
            const col = document.getElementById(id);
            Array.from(col.children).forEach(c => { if (c.tagName !== 'H3') col.removeChild(c); });
        });

        const snap = await getDocs(collection(db, 'projects', projectId, 'tasks'));
        let doneCount = 0;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const status = data.status || 'todo';
            if (status === 'done') doneCount++;
            renderCard(docSnap.id, data, status);
        });

        const prog = snap.size === 0 ? 0 : Math.round((doneCount / snap.size) * 100);
        document.getElementById('progressText').textContent = prog;
        document.getElementById('progressBar').style.width = prog + '%';
        updateCounts();
    }

    window.addKanbanTask = async () => {
        const title = prompt("새 태스크 제목:");
        if (!title) return;
        const desc = prompt("설명 기재:");
        await addDoc(collection(db, 'projects', projectId, 'tasks'), {
            title, description: desc || '', status: 'todo', tag: '신규'
        });
        loadTasks();
    };

    window.editTask = async (id, oldT, oldD) => {
        const nt = prompt("제목:", oldT); if (!nt) return;
        const nd = prompt("설명:", oldD);
        await updateDoc(doc(db, 'projects', projectId, 'tasks', id), { title: nt, description: nd });
        loadTasks();
    };

    window.delTask = async (id) => {
        if (confirm("삭제하시겠습니까?")) {
            await deleteDoc(doc(db, 'projects', projectId, 'tasks', id));
            loadTasks();
        }
    };

    function renderCard(id, data, statusCol) {
        const col = document.getElementById(statusCol);
        if (!col) return;
        const card = document.createElement('div');
        card.className = 'kanban-card'; card.draggable = true; card.id = id;

        card.addEventListener('dragstart', (e) => {
            window.draggedCardId = id;
            e.dataTransfer.setData("text", id);
        });
        card.addEventListener('dragend', () => { window.draggedCardId = null; });

        card.innerHTML = \`
            <div class="card-actions">
                <button onclick="window.editTask('\${id}', '\${data.title}', '\${data.description}')">✏️</button>
                <button onclick="window.delTask('\${id}')">🗑️</button>
            </div>
            <span class="task-tag">\${data.tag || '일반'}</span>
            <h4 style="margin:0 0 0.5rem 0; font-size:1rem; padding-right:2rem;">\${data.title}</h4>
            <p style="margin:0; font-size:0.8rem; color:gray;">\${data.description}</p>
        \`;
        col.appendChild(card);
    }

    window.allowDrop = (ev) => {
        ev.preventDefault();
        const targetCol = ev.target.closest('.kanban-column');
        if (targetCol) targetCol.classList.add('drag-over');
    };

    window.dragLeave = (ev) => {
        const targetCol = ev.target.closest('.kanban-column');
        if (targetCol) targetCol.classList.remove('drag-over');
    };

    window.drop = async (ev, columnElement) => {
        ev.preventDefault();
        const targetCol = ev.target.closest('.kanban-column');
        if (targetCol) targetCol.classList.remove('drag-over');

        const id = window.draggedCardId;
        if (!id || !targetCol) return;

        const card = document.getElementById(id);
        if (card) targetCol.appendChild(card);

        updateCounts();
        await updateDoc(doc(db, 'projects', projectId, 'tasks', id), { status: targetCol.id });
        loadTasks();
    };

    function updateCounts() {
        ['todo', 'in_progress', 'waiting', 'done'].forEach(colId => {
            const col = document.getElementById(colId);
            const count = col.querySelectorAll('.kanban-card').length;
            const span = col.querySelector('.task-count');
            if (span) span.textContent = count;
        });
    }

    // Support Request Logic
    window.toggleSupportFields = () => {
        const type = document.getElementById('supportTypeSelect').value;
        const exp = document.getElementById('expenseFields');
        const gen = document.getElementById('generalFields');
        if (type === '자금') {
            exp.style.display = 'flex';
            gen.style.display = 'none';
        } else {
            exp.style.display = 'none';
            gen.style.display = 'flex';
        }
    };

    window.submitSupportRequest = async () => {
        if (!window.currentProjectData) return;
        const type = document.getElementById('supportTypeSelect').value;
        const memo = document.getElementById('supportMemo').value.trim();
        let payload = {
            type: 'SUPPORT',
            supportCategory: type,
            author: window.currentUserEmail,
            memo: memo,
            createdAt: serverTimestamp(),
            status: '대기중'
        };

        if (type === '자금') {
            const amt = document.getElementById('expenseAmount').value;
            const payee = document.getElementById('expensePayee').value;
            const edate = document.getElementById('expenseDate').value;
            if(!amt || !payee || !edate) { alert("지출결의서 상세 내역을 모두 입력해주세요."); return; }
            payload.expenseAmount = amt;
            payload.expensePayee = payee;
            payload.expenseDate = edate;
        } else {
            const amt = document.getElementById('generalAmount').value;
            if(!amt) { alert("수량/예상금액을 입력해주세요."); return; }
            payload.generalAmount = amt;
        }

        try {
            await addDoc(collection(db, 'projects', projectId, 'qna'), payload);
            document.getElementById('supportModal').close();
            alert("요청이 성공적으로 등록되었습니다.");
            
            document.getElementById('supportMemo').value = '';
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expensePayee').value = '';
            document.getElementById('expenseDate').value = '';
            document.getElementById('generalAmount').value = '';
            
            window.loadQna();
        } catch (e) { alert("요청 실패: " + e.message); }
    };

    window.loadQna = async () => {
        const qnaList = document.getElementById('qnaList');
        try {
            const q = query(collection(db, 'projects', projectId, 'qna'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            if (snap.empty) {
                qnaList.innerHTML = '<p style="text-align:center; padding:1rem; color:var(--text-secondary);">요청 내역이 없습니다.</p>';
                return;
            }
            let html = '';
            snap.forEach(d => {
                const dt = d.data();
                const dstr = dt.createdAt ? dt.createdAt.toDate().toLocaleString() : '최근';
                if(dt.type === 'SUPPORT') {
                    if (dt.supportCategory === '자금') {
                        html += \`
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#fee2e2; color:#991b1b; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;">지출결의</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);">\${dt.author} | \${dstr}</span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);">\${dt.status || '대기중'}</span>
                            </div>
                            <div style="background:#f8fafc; padding:1rem; border-radius:6px; margin-bottom:1rem;">
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>💰 결제 요청액:</strong> \${Number(dt.expenseAmount).toLocaleString()}원</p>
                                <p style="margin:0 0 0.5rem 0; font-size:0.9rem;"><strong>🏦 지급처/계좌:</strong> \${dt.expensePayee}</p>
                                <p style="margin:0; font-size:0.9rem;"><strong>📅 결제 요청일:</strong> \${dt.expenseDate}</p>
                            </div>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;">\${dt.memo}</p>
                        </div>\`;
                    } else {
                        html += \`
                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 1rem;">
                                <div>
                                    <span style="background:#dbeafe; color:#1e40af; padding:0.2rem 0.6rem; border-radius:4px; font-size:0.8rem; font-weight:bold; margin-right:0.5rem;">\${dt.supportCategory} 요청</span>
                                    <span style="font-size:0.9rem; color:var(--text-secondary);">\${dt.author} | \${dstr}</span>
                                </div>
                                <span style="font-size:0.85rem; font-weight:bold; color:var(--warning);">\${dt.status || '대기중'}</span>
                            </div>
                            <p style="margin:0 0 0.5rem 0; font-size: 0.9rem;"><strong>수량/예산:</strong> \${dt.generalAmount}</p>
                            <p style="margin:0; font-size: 0.95rem; line-height:1.5;">\${dt.memo}</p>
                        </div>\`;
                    }
                }
            });
            qnaList.innerHTML = html;
        } catch(e) {
            console.error(e);
            qnaList.innerHTML = '<p>데이터 로드 실패</p>';
        }
    };

    // Files Logic
    window.handleAiPhotoUpload = (e) => {
        const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || 
            (window.currentProjectData && window.currentProjectData.pm && window.currentProjectData.pm.includes(window.currentUserEmail)) ||
            (window.currentProjectData && window.currentProjectData.team && window.currentProjectData.team.includes(window.currentUserEmail)));
        if (!isAuthorized) { alert('업로드 권한이 없습니다.'); return; }
        const file = e.target.files[0];
        if (!file) return;

        const overlay = document.getElementById('processingOverlay');
        overlay.style.display = 'flex';

        setTimeout(() => {
            overlay.style.display = 'none';
            document.getElementById('aiResultArea').style.display = 'block';
            document.getElementById('aiResultText').innerHTML = \`
                <strong>[식별된 주요 객체]</strong><br>
                - 작업자 3명 (안전모 착용 상태 불량 1건)<br>
                - 철근 자재 적재 상태 (양호)<br>
                - 콘크리트 타설 준비 (완료)<br><br>
                <strong>[AI 공정 분석]</strong><br>
                현재 공정은 약 35% 진행 중이며, 기상 악화 시 지연 우려가 있습니다.
            \`;

            document.getElementById('btnConfirmAiUpload').onclick = async () => {
                try {
                    await addDoc(collection(db, 'projects', projectId, 'files'), {
                        name: \`[AI분석] \${file.name}\`,
                        uploader: window.currentUserEmail,
                        url: '#',
                        createdAt: serverTimestamp(),
                        isAiGenerated: true,
                        aiSummary: '안전모 미착용 발견 및 타설 준비 완료'
                    });
                    document.getElementById('aiResultArea').style.display = 'none';
                    window.loadFiles();
                    alert('AI 분석 결과와 현장 사진이 자료실에 성공적으로 저장되었습니다.');
                } catch(error) {
                    alert('저장 실패: ' + error.message);
                }
            };
        }, 2500);
    };

    window.handleFileUpload = async (e) => {
        const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || 
            (window.currentProjectData && window.currentProjectData.pm && window.currentProjectData.pm.includes(window.currentUserEmail)) ||
            (window.currentProjectData && window.currentProjectData.team && window.currentProjectData.team.includes(window.currentUserEmail)));
        if (!isAuthorized) { alert('업로드 권한이 없습니다.'); return; }
        const file = e.target.files[0];
        if (!file) return;
        alert(\`[업로드 시뮬레이션]\\n\\n파일명: \${file.name}\\nFirebase Storage 보안 규칙을 우회하여 DB 메타데이터로 안전하게 가상 업로드합니다.\`);
        await addDoc(collection(db, 'projects', projectId, 'files'), {
            name: file.name, uploader: window.currentUserEmail, url: '#', createdAt: serverTimestamp()
        });
        e.target.value = '';
        window.loadFiles();
    };

    window.loadFiles = async () => {
        const tbody = document.getElementById('filesTableBody');
        try {
            const q = query(collection(db, 'projects', projectId, 'files'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">등록된 자료가 없습니다.</td></tr>';
                return;
            }
            let html = '';
            snap.forEach(d => {
                const data = d.data();
                html += \`
                    <tr>
                        <td style="padding: 1rem; font-weight: 500;">
                            📄 \${data.name || '알 수 없는 파일'}
                            \${data.isAiGenerated ? '<span style="margin-left:0.5rem; background:#10b981; color:white; font-size:0.7rem; padding:0.1rem 0.4rem; border-radius:4px;">AI</span>' : ''}
                        </td>
                        <td style="padding: 1rem;">\${data.uploader || '알 수 없음'}</td>
                        <td style="padding: 1rem;"><a href="\${data.url}" onclick="alert('다운로드 데모입니다.')" style="color:var(--primary-color);">다운로드</a></td>
                        <td style="padding: 1rem;"><button class="btn-primary" style="background:#ef4444; padding:0.25rem 0.5rem;" onclick="window.delFile('\${d.id}')">삭제</button></td>
                    </tr>
                \`;
            });
            tbody.innerHTML = html;
        } catch(error) {
            console.error("loadFiles failed", error);
            tbody.innerHTML = '<tr><td colspan="4">파일 로딩 실패</td></tr>';
        }
    };

    window.delFile = async (id) => {
        const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || 
            (window.currentProjectData && window.currentProjectData.pm && window.currentProjectData.pm.includes(window.currentUserEmail)) ||
            (window.currentProjectData && window.currentProjectData.team && window.currentProjectData.team.includes(window.currentUserEmail)));
        if (!isAuthorized) { alert('삭제 권한이 없습니다.'); return; }
        if (confirm("이 자료를 삭제하시겠습니까?")) {
            await deleteDoc(doc(db, 'projects', projectId, 'files', id));
            window.loadFiles();
        }
    };

    checkAdminAuth((user) => {
        window.currentUserEmail = user.email;
        if (projectId) { loadProjectDetails(); loadTasks(); }
    }, () => { window.location.href = '../login.html'; });
</script>`;

let f = fs.readFileSync('admin/project-detail.html', 'utf8');
f = f.replace(/<script type="module">[\s\S]*<\/script>/, code);
fs.writeFileSync('admin/project-detail.html', f, 'utf8');
