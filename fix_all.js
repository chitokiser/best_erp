const fs = require('fs');
let dHtml = fs.readFileSync('admin/dashboard.html', 'utf8');

// Fix dummy SUPER_ADMIN display when DB is missing
dHtml = dHtml.replace(/el\.innerText = \`안녕하세요 \$\{user\.email\.split\('@'\)\[0\]\}님\`;/,
    `el.innerText = \`안녕하세요 \${user.email.split('@')[0]}님\`;
                            document.getElementById('navUserName2').innerText = user.email.split('@')[0];
                            document.getElementById('navUserRole2').innerText = 'EMPLOYEE';`);

fs.writeFileSync('admin/dashboard.html', dHtml, 'utf8');

let taskJs = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');

// 1. Change task assignment from UID to Email
taskJs = taskJs.replace(/opt\.value = doc\.id;/g, "opt.value = u.email;");
taskJs = taskJs.replace(/assignedTo: assignedTo,/g, "assignedTo: assignedTo,"); // It already does this, but opt.value decides it.

// 2. Change queries and fix Index error
// CEO query
taskJs = taskJs.replace(/if \(\['SUPER_ADMIN', 'CEO'\]\.includes\(currentUserInfo\.role\).*?\)\s*\{[\s\S]*?\} else if/g,
    `if (['SUPER_ADMIN', 'CEO'].includes(currentUserInfo.role) || currentUserInfo.email === 'daguri75@gmail.com') {
        q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    } else if`);

// Employee query WITHOUT orderBy to avoid composite index error
taskJs = taskJs.replace(/q = query\(collection\(db, 'tasks'\), where\('assignedTo', '==', currentUserInfo\.uid\), orderBy\('createdAt', 'desc'\)\);/g,
    `q = query(collection(db, 'tasks'), where('assignedTo', '==', currentUserInfo.email)); // Removed orderBy to bypass Firestore index requirement`);

// 3. Sort manually in onSnapshot
taskJs = taskJs.replace(/snapshot\.forEach\(docSnap => \{/g,
    `let docsArr = [];
        snapshot.forEach(d => docsArr.push(d));
        docsArr.sort((a, b) => {
            let td1 = a.data().createdAt ? a.data().createdAt.toMillis() : 0;
            let td2 = b.data().createdAt ? b.data().createdAt.toMillis() : 0;
            return td2 - td1; // desc
        });
        docsArr.forEach(docSnap => {`);

// 4. Reporting auth change (uid -> email)
taskJs = taskJs.replace(/if \(currentUserInfo\.uid === data\.assignedTo\) \{/g,
    `if (currentUserInfo.email === data.assignedTo) {`);

fs.writeFileSync('assets/js/admin/tasks.js', taskJs, 'utf8');
console.log('Fixed auth display, email assignment, and index requirement');
