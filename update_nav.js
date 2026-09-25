const fs = require('fs');
const path = require('path');
function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git') {
            processDir(full);
        } else if (f.endsWith('.html') && f !== 'estimates.html') {
            let content = fs.readFileSync(full, 'utf8');
            if (content.includes('request-form.html') && !content.includes('estimates.html')) {
                let linkPath = full.includes('admin') ? '../estimates.html' : 'estimates.html';
                let regex = /(<a href=["'](?:\.\.\/)?request-form\.html["'][^>]*>[\s\S]*?<\/a>\s*<\/li>)/;
                content = content.replace(regex, "$1\n                    <li><a href=\"" + linkPath + "\">견적 생성기</a></li>");
                fs.writeFileSync(full, content, 'utf8');
                console.log('Updated ' + full);
            }
        }
    }
}
processDir('.');
