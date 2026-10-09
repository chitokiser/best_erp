const fs = require('fs');
const file = 'C:/Users/Asus/Desktop/project/jumper/jumper_v10/assets/js/pages/register.js';
let js = fs.readFileSync(file, 'utf8');

js = js.replace(/if \(!phone \|\| !isValidPhone\(phone\)\) throw new Error\(.*\);/g, 
"// Phone is now optional per user request\n    // if (!phone || !isValidPhone(phone)) throw new Error('올바른 휴대전화 번호를 입력해 주세요');");

fs.writeFileSync(file, js, 'utf8');
console.log('Phone validation removed from register.js');
