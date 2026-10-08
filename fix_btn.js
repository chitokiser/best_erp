const fs = require('fs');
let c = fs.readFileSync('assets/js/employees.js', 'utf8');
let newBtn = `\n                        <button onclick="window.location.href='tasks.html?assignee=\${doc.id}'" style="padding:0.25rem 0.5rem; background:var(--ai-primary); color:white; border:none; border-radius:4px; cursor:pointer; margin-left:0.25rem;">업무지시</button>`;
let regex = /(<button onclick="window\.deleteEmp\('\${doc\.id}'\)".*?<\/button>)/;
let modified = c.replace(regex, `$1${newBtn}`);
fs.writeFileSync('assets/js/employees.js', modified, 'utf8');
console.log('Button added.');
