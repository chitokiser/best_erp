const fs = require('fs');
const path = require('path');

const empHtmlPath = path.join(__dirname, 'admin', 'employees.html');
let html = fs.readFileSync(empHtmlPath, 'utf8');

// Insert a select dropdown before the Name input in the modal
const insertSelect = `
                    <div class="form-group" style="grid-column: span 2;">
                        <label>시스템 회원 찾기 (STAFF 계정 연동)</label>
                        <select id="empUserSelect" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; margin-bottom:1rem;">
                            <option value="">-- 연동할 계정을 선택하세요 --</option>
                        </select>
                    </div>
`;

if (!html.includes('empUserSelect')) {
    html = html.replace(
        '<form id="empForm">\n                <div class="form-row">',
        '<form id="empForm">\n                <div class="form-row">' + insertSelect
    );
    html = html.replace(
        /<input type="text" id="empName" required placeholder="예: 김철수">/g,
        '<input type="text" id="empName" required placeholder="예: 김철수" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;">'
    );
    html = html.replace(
        /<input type="text" id="empPosition" required placeholder="예: 과장">/g,
        '<input type="text" id="empPosition" required placeholder="예: 과장" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;">'
    );
    html = html.replace(
        /<input type="text" id="empDept" required placeholder="예: 인테리어 1팀">/g,
        '<input type="text" id="empDept" required placeholder="예: 인테리어 1팀" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;">'
    );
    html = html.replace(
        /<input type="email" id="empContact" required placeholder="예: chulsoo@best.com">/g,
        '<input type="email" id="empContact" required placeholder="예: chulsoo@best.com" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;">'
    );
    html = html.replace(
        /<input type="text" id="empSkills" placeholder="예: CAD, 현장소장, 자재관리">/g,
        '<input type="text" id="empSkills" placeholder="예: CAD, 현장소장, 자재관리" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;">'
    );

    fs.writeFileSync(empHtmlPath, html, 'utf8');
}


const empJsPath = path.join(__dirname, 'assets', 'js', 'employees.js');
let jsCode = fs.readFileSync(empJsPath, 'utf8');

if (!jsCode.includes('empUserSelect')) {
    // We rewrite the parts to add select box loading logic and user updating logic
    const fetchSelect = `
    const userSelect = document.getElementById('empUserSelect');
    if (userSelect) {
        const qUsers = query(collection(db, 'users'), where('role', '==', 'STAFF'));
        getDocs(qUsers).then(snap => {
            snap.forEach(docSnap => {
                const ud = docSnap.data();
                const opt = document.createElement('option');
                opt.value = docSnap.id;
                opt.dataset.email = ud.email;
                opt.dataset.name = ud.name || '';
                opt.textContent = ud.email + (ud.name ? ' (' + ud.name + ')' : '');
                userSelect.appendChild(opt);
            });
        });
        
        userSelect.addEventListener('change', (e) => {
            const opt = e.target.selectedOptions[0];
            if(opt && opt.value) {
                document.getElementById('empContact').value = opt.dataset.email || '';
                if(opt.dataset.name) {
                    document.getElementById('empName').value = opt.dataset.name;
                }
            }
        });
    }
`;
    // Insert into loadEmployees or top level
    jsCode = jsCode.replace('loadEmployees();', fetchSelect + '\nloadEmployees();');

    // Add logic to save to user collection
    const saveLogic = `
        const payload = {
            name: name,
            position: position,
            department: dept,
            salary: Number(salary) || 0,
            performance: perf,
            contact: contact,
            workload: Number(workload),
            skills: skills,
            updatedAt: window.firebaseConfig?.serverTimestamp ? window.firebaseConfig.serverTimestamp() : new Date()
        };
        
        let userId = document.getElementById('empUserSelect').value;
        
        if (id) {
            await updateDoc(doc(db, 'employees', id), payload);
            alert("정보가 성공적으로 수정되었습니다.");
        } else {
            payload.createdAt = window.firebaseConfig?.serverTimestamp ? window.firebaseConfig.serverTimestamp() : new Date();
            // Link to user if selected
            if (userId) { payload.linkedUserId = userId; }
            await addDoc(collection(db, 'employees'), payload);
            alert("정상적으로 등록되었습니다.");
        }
        
        // Update user collection if linked
        if (userId) {
            await updateDoc(doc(db, 'users', userId), {
                name: name,
                position: position,
                department: dept
            });
        }
    `;

    jsCode = jsCode.replace(/const payload = \{[\s\S]+?alert\("정상적으로 등록되었습니다\."\);\n\s+\}/, saveLogic);

    fs.writeFileSync(empJsPath, jsCode, 'utf8');
}
console.log("Updated employees module.");
