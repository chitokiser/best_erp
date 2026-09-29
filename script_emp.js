const fs = require('fs');

// Add specific management headers and column to the HTML
let htmlFile = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', 'utf8');

// Header
if (!htmlFile.includes('<th>관리</th>')) {
    htmlFile = htmlFile.replace('<th>현재 업무량</th>', '<th>현재 업무량</th>\n                        <th>관리</th>');
    
    // Add logic holder ID for edit mode
    htmlFile = htmlFile.replace('<h3 id="modalTitle">직원 프로필 등록</h3>', '<h3 id="modalEmpTitle">직원 프로필 등록</h3><input type="hidden" id="empId" value="">');
    if (!htmlFile.includes('h3 id="modalEmpTitle"')) {
        htmlFile = htmlFile.replace('<h3>직원 프로필 등록</h3>', '<h3 id="modalEmpTitle">직원 프로필 등록</h3><input type="hidden" id="empId" value="">');
    }
    
    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', htmlFile, 'utf8');
}

// Update employees.js
let jsFile = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', 'utf8');

// Include doc, deleteDoc, updateDoc from firestore
jsFile = jsFile.replace(/import { collection, getDocs, addDoc, serverTimestamp } from 'firebase\/firestore';/, "import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';");

const defineDataMap = "window.empDataMap = {};\n";

if (!jsFile.includes('window.empDataMap')) {
    jsFile = jsFile.replace('async function loadEmployees() {', defineDataMap + '\nasync function loadEmployees() {');
    jsFile = jsFile.replace(/const html = '';|let html = '';/, 'let html = ""; window.empDataMap = {};');
    
    const rowContent = 
            window.empDataMap[doc.id] = data;
            const skillsHtml = (data.skills || []).map(s => \\\<span class="skill-tag">\\\</span>\\\).join('');
            const load = data.workload || 0;
            const loadClass = load > 90 ? 'workload-high' : 'workload-ok';
            const loadText = load > 90 ? load + '% (과부하)' : load + '% (적정)';

            html += \\\
                <tr>
                    <td>
                        <strong style="color:var(--text-dark);">\\\</strong>
                        <div style="font-size:0.85rem; color:var(--text-muted);">\\\</div>
                    </td>
                    <td>\\\</td>
                    <td>\\\</td>
                    <td>\\\</td>
                    <td class="\\\">\\\</td>
                    <td>
                        <button onclick="window.editEmp('\\\')" style="padding:0.25rem 0.5rem; background:white; border:1px solid #cbd5e1; border-radius:4px; cursor:pointer;">수정</button>
                        <button onclick="window.deleteEmp('\\\')" style="padding:0.25rem 0.5rem; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:4px; cursor:pointer; margin-left:0.25rem;">삭제</button>
                    </td>
                </tr>
            \\\;
    ;
    
    jsFile = jsFile.replace(/const skillsHtml = [\s\S]*?<\/tr>\s*;/m, rowContent.trim());
    
    const editDeleteLogic = 
window.editEmp = (id) => {
    const data = window.empDataMap[id];
    if(!data) return;
    document.getElementById('modalEmpTitle').textContent = '직원 프로필 수정';
    document.getElementById('empId').value = id;
    document.getElementById('empName').value = data.name || '';
    document.getElementById('empPosition').value = data.position || '';
    document.getElementById('empDept').value = data.department || '';
    document.getElementById('empWorkload').value = data.workload || 0;
    document.getElementById('empContact').value = data.contact || '';
    document.getElementById('empSkills').value = (data.skills || []).join(', ');
    
    document.getElementById('empModal').style.display = 'flex';
};

window.deleteEmp = async (id) => {
    if(!confirm("정말 이 직원을 삭제하시겠습니까?")) return;
    try {
        await deleteDoc(doc(db, 'employees', id));
        alert("접속자의 직원 데이터가 삭제되었습니다.");
        loadEmployees();
    } catch(e) {
        alert("삭제 오류: " + e.message);
    }
};

openBtn.addEventListener('click', () => {
    document.getElementById('modalEmpTitle').textContent = '직원 프로필 등록';
    document.getElementById('empId').value = '';
    empForm.reset();
    modal.style.display = 'flex';
});
;
    // We can just append the logic at the bottom 
    jsFile = jsFile + '\n' + editDeleteLogic;
    
    // Now handle the submit logic
    const oldSubmit = /const skillsArr = document\.getElementById\('empSkills'\)\.value\.split\(\',\('\)\.filter\(x => x\.trim\(\) !== ''\);[\s\S]*?modal\.style\.display = 'none';/m;
    // Wait, let's just replace the body of try block in the submit listener
    const submitRegex = /try\s*{\s*const skillsArr[\s\S]*?modal\.style\.display = 'none';/m;
    const submitReplace = 	ry {
        const skillsArr = document.getElementById('empSkills').value.split(',').filter(x => x.trim() !== '');
        const id = document.getElementById('empId').value;
        const payload = {
            name: document.getElementById('empName').value,
            position: document.getElementById('empPosition').value,
            department: document.getElementById('empDept').value,
            workload: Number(document.getElementById('empWorkload').value),
            contact: document.getElementById('empContact').value,
            skills: skillsArr
        };
        
        if (id) {
            await updateDoc(doc(db, 'employees', id), payload);
            alert("정상적으로 수정되었습니다.");
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, 'employees'), payload);
            alert("정상적으로 등록되었습니다.");
        }

        modal.style.display = 'none';;
    
    jsFile = jsFile.replace(submitRegex, submitReplace);
    
    // In case openBtn addEventListener was declared twice due to my replace
    // Let's remove the first one 
    jsFile = jsFile.replace("openBtn.addEventListener('click', () => modal.style.display = 'flex');", "// Overridden below");
}

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', jsFile, 'utf8');

console.log("Done");
