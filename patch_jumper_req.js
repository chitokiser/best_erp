const fs = require('fs');
const file = 'C:/Users/Asus/Desktop/project/jumper/jumper_v10/register.html';
let html = fs.readFileSync(file, 'utf8');

html = html.replace(/<em class="req">\*<\/em>/g, ''); // optionally remove all red stars, or just phone
// specifically phone:
html = html.replace(/<span>Phone Number <em class="req">\*<\/em><\/span>/, '<span>Phone Number (Optional)</span>');
// It might be in Korean:
html = html.replace(/<span>휴대전화 번호 <em class="req">\*<\/em><\/span>/, '<span>휴대전화 번호 (선택)</span>');

fs.writeFileSync(file, html, 'utf8');
