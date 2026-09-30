const fs = require('fs');

const files = fs.readdirSync('admin').filter(f => f.endsWith('.html'));

files.forEach(f => {
    let html = fs.readFileSync('admin/' + f, 'utf8');
    if (!html.includes('href="users.html"')) {
        html = html.replace(/<li><a href="employees.html"([^>]*)>직원<\/a><\/li>/g, '<li><a href="employees.html"$1>직원</a></li>\n            <li><a href="users.html">회원관리</a></li>');
        fs.writeFileSync('admin/' + f, html, 'utf8');
    }
});
console.log('Added users to nav');
