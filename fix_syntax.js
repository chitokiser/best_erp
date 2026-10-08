const fs = require('fs');
let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');
c = c.replace(/\\'assignee\\'/g, "'assignee'");
c = c.replace(/\\''/g, "''"); // if there was \\'\\'
c = c.replace(/\\'\\'/g, "''");
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Fixed tasks.js syntax error');
