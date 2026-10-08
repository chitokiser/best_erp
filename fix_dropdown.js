const fs = require('fs');
let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');
c = c.replace(/opt\.textContent = `\$\{u\.name\} \(\$\{u\.teamId \|\| ''\}\)`;/, "opt.textContent = `${u.name || u.email || '이름없음'} (${u.position || u.role}) - ${u.teamId || '부서미지정'}`;");
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Fixed dropdown display');
