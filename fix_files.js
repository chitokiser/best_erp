const fs = require('fs');
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');

// 1. Rename tab
html = html.replace('결재 및 도면 자료', '해당자료 업로드');
html = html.replace('결재 및 도면 자료</div>', '해당자료 업로드</div>'); // Just in case

// 2. Hide upload button for non-PM/CEO 
// By adding an id to the label
const buttonTarget = `<label class="btn-primary" style="cursor: pointer;">
                    + 자료 업로드
                    <input type="file" style="display: none;" onchange="window.handleFileUpload(event)">
                </label>`;
const buttonReplace = `<label id="uploadFileBtnLabel" class="btn-primary" style="cursor: pointer; display: none;">
                    + 자료 업로드
                    <input type="file" style="display: none;" onchange="window.handleFileUpload(event)">
                </label>`;
html = html.replace(buttonTarget, buttonReplace);

// 3. In loadProjectDetails, unhide it if permitted
const loadProjTarget = `if (window.currentUserEmail === 'daguri75@gmail.com' || window.currentUserEmail === data.pm) {
                    document.getElementById('editProjectBtn').style.display = 'inline-block';
                } else {
                    document.getElementById('editProjectBtn').style.display = 'none';
                }`;
const loadProjReplace = `if (window.currentUserEmail === 'daguri75@gmail.com' || window.currentUserEmail === data.pm) {
                    document.getElementById('editProjectBtn').style.display = 'inline-block';
                    if (document.getElementById('uploadFileBtnLabel')) document.getElementById('uploadFileBtnLabel').style.display = 'inline-block';
                } else {
                    document.getElementById('editProjectBtn').style.display = 'none';
                    if (document.getElementById('uploadFileBtnLabel')) document.getElementById('uploadFileBtnLabel').style.display = 'none';
                }`;
html = html.replace(loadProjTarget, loadProjReplace);

// 4. Update loadFiles to conditionally render delete btn
const loadFilesRegex = /window\.loadFiles = async \(\) => {[\s\S]*?tbody\.innerHTML = html;\s*\n\s*};/m;

const newLoadFiles = `window.loadFiles = async () => {
            const tbody = document.getElementById('filesTableBody');
            const snap = await getDocs(collection(db, 'projects', projectId, 'files'));
            if (snap.empty) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:1rem; color:var(--text-secondary);">등록된 자료가 없습니다.</td></tr>';
                return;
            }
            let html = '';
            const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || (window.currentProjectData && window.currentUserEmail === window.currentProjectData.pm));

            snap.forEach(d => {
                const data = d.data();
                const delBtn = isAuthorized ? \`<button class="btn-primary" style="background:#ef4444; padding:0.25rem 0.5rem;" onclick="window.delFile('\${d.id}')">삭제</button>\` : '';
                html += \`
                    <tr>
                        <td style="padding: 1rem; font-weight: 500;">📄 \${data.name || '알 수 없는 파일'}</td>
                        <td style="padding: 1rem;">\${data.uploader || '알 수 없음'}</td>
                        <td style="padding: 1rem;"><a href="\${data.url}" onclick="alert('다운로드 데모입니다.')" style="color:var(--primary-color);">다운로드</a></td>
                        <td style="padding: 1rem;">\${delBtn}</td>
                    </tr>
                \`;
            });
            tbody.innerHTML = html;
        };`;

if (loadFilesRegex.test(html)) {
    html = html.replace(loadFilesRegex, newLoadFiles);
}

// 5. Update delete and upload permissions on JS side
const uploadRegex = /window\.handleFileUpload = async \(e\) => {/m;
const uploadReplace = `window.handleFileUpload = async (e) => {
            const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || (window.currentProjectData && window.currentUserEmail === window.currentProjectData.pm));
            if (!isAuthorized) { alert('업로드 권한이 없습니다.'); return; }`;
html = html.replace(uploadRegex, uploadReplace);

const delRegex = /window\.delFile = async \(id\) => {/m;
const delReplace = `window.delFile = async (id) => {
            const isAuthorized = (window.currentUserEmail === 'daguri75@gmail.com' || (window.currentProjectData && window.currentUserEmail === window.currentProjectData.pm));
            if (!isAuthorized) { alert('삭제 권한이 없습니다.'); return; }`;
html = html.replace(delRegex, delReplace);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', html, 'utf8');
console.log("Success");
