const fs = require('fs');
const jsPath = 'assets/js/employees.js';
let js = fs.readFileSync(jsPath, 'utf8');

const selectInit = `
// -------------------------------------------------------------
// Initialize STAFF Users Dropdown
// -------------------------------------------------------------
const initSelect = () => {
    const userSelect = document.getElementById('empUserSelect');
    if (userSelect && userSelect.options.length <= 1) { // Populate only once
        const qUsers = query(collection(db, 'users'), where('role', '==', 'STAFF'));
        getDocs(qUsers).then(snap => {
            snap.forEach(docSnap => {
                const ud = docSnap.data();
                const opt = document.createElement('option');
                opt.value = docSnap.id;
                opt.dataset.email = ud.email || '';
                opt.dataset.name = ud.name || '';
                
                // Text representation
                let txt = ud.email;
                if(ud.name) txt += ' (' + ud.name + ')';
                if(ud.position) txt += ' - ' + ud.position;
                opt.textContent = txt;
                
                userSelect.appendChild(opt);
            });
        }).catch(err => {
            console.error("STAFF 유저 목록 로드 실패:", err);
        });

        // When a user is selected, populate Name and Contact
        userSelect.addEventListener('change', (e) => {
            const opt = e.target.selectedOptions[0];
            if(opt && opt.value) {
                const contactEl = document.getElementById('empContact');
                const nameEl = document.getElementById('empName');
                if(contactEl) contactEl.value = opt.dataset.email || '';
                if(nameEl && opt.dataset.name) nameEl.value = opt.dataset.name;
            }
        });
    }
};

initSelect(); // Call when script loads
loadEmployees(); // Finally load standard table
`;

// Replace bottom logic:
if (js.includes('loadEmployees();\n\n\nwindow.editEmp =')) {
    js = js.replace('loadEmployees();\n\n\nwindow.editEmp =', selectInit + '\n\nwindow.editEmp =');
} else if (js.includes('loadEmployees();\r\n\r\n\r\nwindow.editEmp =')) {
    js = js.replace('loadEmployees();\r\n\r\n\r\nwindow.editEmp =', selectInit + '\n\nwindow.editEmp =');
} else {
    // just append if not found cleanly
    js += '\\n' + selectInit;
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log("JS logic added.");
