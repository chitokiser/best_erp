const fs = require('fs');

function fix(p) {
    let content = fs.readFileSync(p, 'utf8');

    // admin/dashboard.html has:
    content = content.replace("const name = uData.name || '관리자';", "const name = uData.name || user.email.split('@')[0];");

    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed ' + p);
}

fix('admin/dashboard.html');
