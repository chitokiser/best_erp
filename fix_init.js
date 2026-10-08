const fs = require('fs');
let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');
c = c.replace(/currentUserInfo = { uid: user\.uid, role: 'EMPLOYEE', name: user\.email };/g,
    "currentUserInfo = { uid: user.uid, role: 'EMPLOYEE', name: user.email };\n            initTaskBoard();");
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Fixed initTaskBoard call');
