const fs = require('fs');

let jsPath = 'assets/js/employees.js';
let jsCode = fs.readFileSync(jsPath, 'utf8');

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

loadEmployees();`;

jsCode = jsCode.replace('loadEmployees();\n\n\nwindow.editEmp =', fetchSelect + '\n\n\nwindow.editEmp =');

const targetSave = `const payload = {
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

        if (id) {
            await updateDoc(doc(db, 'employees', id), payload);
            alert("정보가 성공적으로 수정되었습니다.");
        } else {
            payload.createdAt = window.firebaseConfig?.serverTimestamp ? window.firebaseConfig.serverTimestamp() : new Date();
            await addDoc(collection(db, 'employees'), payload);
            alert("정상적으로 등록되었습니다.");
        }`;

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
        
        let userId = document.getElementById('empUserSelect') ? document.getElementById('empUserSelect').value : null;
        
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

jsCode = jsCode.replace(targetSave, saveLogic);

fs.writeFileSync(jsPath, jsCode, 'utf8');
console.log('Clean replacement complete.');
