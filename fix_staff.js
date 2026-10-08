const fs = require('fs');
let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');
c = c.replace(/if \(u\.role !== 'CEO' && u\.role !== 'SUPER_ADMIN'\) \{/g,
    "if (u.role === 'STAFF') {");
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Filtered dropdown to only STAFF');
