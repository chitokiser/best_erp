const fs = require('fs');
const modalHtml = `
<dialog id="projectModal" style="border:none; border-radius:12px; padding:2rem; width:100%; max-width:400px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
    <h3 id="modalTitle" style="margin-top:0;">프로젝트 편집</h3>
    <div style="display:flex; flex-direction:column; gap:1rem; margin-top:1.5rem;">
        <div>
            <label style="font-size:0.875rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">프로젝트명</label>
            <input type="text" id="modalTitleInput" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
        </div>
        <div>
            <label style="font-size:0.875rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">진행단계</label>
            <select id="modalStatusInput" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
                <option value="착공대기">착공대기</option>
                <option value="진행 중">진행 중</option>
                <option value="위험">위험</option>
                <option value="완료">완료</option>
            </select>
        </div>
        <div>
            <label style="font-size:0.875rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">담당자(PM)</label>
            <select id="modalPmInput" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px;">
                <option value="">로딩 중...</option>
            </select>
        </div>
        <div>
            <label style="font-size:0.875rem; color:var(--text-secondary); display:block; margin-bottom:0.25rem;">종료예정일</label>
            <input type="date" id="modalDeadlineInput" style="width:100%; padding:0.5rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
        </div>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button onclick="document.getElementById('projectModal').close()" style="padding:0.5rem 1rem; border:1px solid #cbd5e1; background:white; border-radius:4px; cursor:pointer;">취소</button>
            <button id="modalSaveBtn" class="btn-primary" style="padding:0.5rem 1rem;">저장</button>
        </div>
    </div>
</dialog>
`;

let jsCode = `
        let pmListLoaded = false;
        async function loadPmOptions() {
            if (pmListLoaded) return;
            const pmSelect = document.getElementById('modalPmInput');
            pmSelect.innerHTML = '<option value="">선택하세요...</option>';
            try {
                const querySnapshot = await getDocs(collection(db, 'users'));
                querySnapshot.forEach(userDoc => {
                    const udata = userDoc.data();
                    const option = document.createElement('option');
                    option.value = udata.email;
                    option.textContent = \`\${udata.name || '무명'} (\${udata.position || '직원'}) - \${udata.email}\`;
                    pmSelect.appendChild(option);
                });
                pmListLoaded = true;
            } catch (error) {
                console.error("Failed to load PMs:", error);
                pmSelect.innerHTML = '<option value="">로딩 실패</option>';
            }
        }
`;

function processProjectsAuthFile() {
    let pfile = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/projects.html', 'utf8');
    if (!pfile.includes('projectModal')) {
        pfile = pfile.replace('</main>', '</main>\\n' + modalHtml);
    }

    // Create Project Replacement
    const createRegex = /window\.createProject = async \(\) => {[\s\S]*?catch \(e\) {[\s\S]*?}\s*};/m;
    const createNew = `
        window.createProject = async () => {
            const modal = document.getElementById('projectModal');
            document.getElementById('modalTitle').textContent = '새 프로젝트 할당';
            document.getElementById('modalTitleInput').value = '';
            document.getElementById('modalStatusInput').value = '착공대기';
            document.getElementById('modalDeadlineInput').value = '';
            
            await loadPmOptions();
            document.getElementById('modalPmInput').value = '';
            
            const saveBtn = document.getElementById('modalSaveBtn');
            saveBtn.onclick = async () => {
                const title = document.getElementById('modalTitleInput').value.trim();
                const pmEmail = document.getElementById('modalPmInput').value;
                const status = document.getElementById('modalStatusInput').value;
                const deadline = document.getElementById('modalDeadlineInput').value;
                if (!title) { alert('프로젝트명은 필수입니다.'); return; }
                if (!pmEmail) { alert('PM을 선택해주세요.'); return; }
                
                try {
                    const docRef = await addDoc(collection(db, 'projects'), {
                        title: title, status: status, pm: pmEmail, deadline: deadline || 'N/A', createdAt: new Date()
                    });
                    modal.close();
                    window.location.href = \`project-detail.html?id=\${docRef.id}\`;
                } catch(e) { alert('생성 실패: ' + e.message); }
            };
            modal.showModal();
        };
    `;
    pfile = pfile.replace(createRegex, jsCode + createNew);

    // Edit Project Replacement
    const editRegex = /window\.editProject = async \(id\) => {[\s\S]*?catch \(e\) { alert\("오류:\s*" \+ e\.message\); }\s*};/m;
    const editNew = `
                window.editProject = async (id) => {
                    const data = window.projectsData[id];
                    if (!data) return;
                    
                    const modal = document.getElementById('projectModal');
                    document.getElementById('modalTitle').textContent = '프로젝트 정보 수정';
                    document.getElementById('modalTitleInput').value = data.title || '';
                    document.getElementById('modalStatusInput').value = data.status || '착공대기';
                    document.getElementById('modalDeadlineInput').value = (data.deadline && data.deadline !== 'N/A') ? data.deadline : '';
                    
                    await loadPmOptions();
                    const pmSelect = document.getElementById('modalPmInput');
                    if (data.pm && !Array.from(pmSelect.options).some(o => o.value === data.pm)) {
                        const opt = document.createElement('option');
                        opt.value = data.pm;
                        opt.textContent = \`[미등록] \${data.pm}\`;
                        pmSelect.appendChild(opt);
                    }
                    pmSelect.value = data.pm || '';
                    
                    const saveBtn = document.getElementById('modalSaveBtn');
                    saveBtn.onclick = async () => {
                        const title = document.getElementById('modalTitleInput').value.trim();
                        const pm = document.getElementById('modalPmInput').value;
                        const status = document.getElementById('modalStatusInput').value;
                        const deadline = document.getElementById('modalDeadlineInput').value || 'N/A';
                        
                        if (!title) { alert('프로젝트명을 입력하세요.'); return; }
                        
                        try {
                            await updateDoc(doc(db, 'projects', id), { title, status, pm, deadline });
                            modal.close();
                            alert("프로젝트 정보가 수정되었습니다.");
                            window.loadProjectsList();
                        } catch (e) { alert("오류: " + e.message); }
                    };
                    modal.showModal();
                };
    `;
    pfile = pfile.replace(editRegex, editNew);

    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/projects.html', pfile, 'utf8');
}

function processProjectDetailFile() {
    let dfile = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');
    if (!dfile.includes('projectModal')) {
        dfile = dfile.replace('</main>', '</main>\\n' + modalHtml);
    }

    const editRegex2 = /window\.editProjectInfo = async \(\) => {[\s\S]*?catch \(e\) {[\s\S]*?alert\('수정 실패: ' \+ e\.message\);[\s\S]*?}\s*};/m;
    const editNew2 = `
        ${jsCode}
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
            if (data.pm && !Array.from(pmSelect.options).some(o => o.value === data.pm)) {
                const opt = document.createElement('option');
                opt.value = data.pm;
                opt.textContent = \`[미등록] \${data.pm}\`;
                pmSelect.appendChild(opt);
            }
            pmSelect.value = data.pm || '';
            
            const saveBtn = document.getElementById('modalSaveBtn');
            saveBtn.onclick = async () => {
                const title = document.getElementById('modalTitleInput').value.trim();
                const pm = document.getElementById('modalPmInput').value;
                const status = document.getElementById('modalStatusInput').value;
                const deadline = document.getElementById('modalDeadlineInput').value || 'N/A';
                
                if (!title) { alert('프로젝트명을 입력하세요.'); return; }
                
                try {
                    await updateDoc(doc(db, 'projects', projectId), { title, status, pm, deadline });
                    modal.close();
                    alert("정보가 성공적으로 수정되었습니다.");
                    loadProjectDetails();
                } catch (e) { alert("수정 실패: " + e.message); }
            };
            modal.showModal();
        };
    `;
    dfile = dfile.replace(editRegex2, editNew2);
    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', dfile, 'utf8');
}

processProjectsAuthFile();
processProjectDetailFile();
console.log('Update Complete.');
