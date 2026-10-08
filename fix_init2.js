const fs = require('fs');
let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');
c = c.replace(/name: user\.email };/g, "name: user.email, email: user.email };");
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Fixed email fallback');
