import fs from 'fs';
let c = fs.readFileSync('mobile-task.html', 'utf8');
c = c.replace('capture="environment"', '');
fs.writeFileSync('mobile-task.html', c);
