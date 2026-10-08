const fs = require('fs');
const path = require('path');

function processHtml(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('href="projects.html"') && !content.includes('tasks.html">업무지시/보고')) {
        let regex = /^(\s*)(<li[^>]*><a href="projects\.html"[^>]*>프로젝트<\/a><\/li>)/mg;

        let newContent = content.replace(regex, (match, spaces, projectItem) => {
            return `${spaces}<li><a href="tasks.html">업무지시/보고</a></li>\n${spaces}${projectItem}`;
        });

        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log('Updated ' + filePath);
        }
    }
}

function walkDir(dir) {
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
        if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git' && f.name !== 'dist' && f.name !== 'assets') {
            walkDir(path.join(dir, f.name));
        } else if (f.name.endsWith('.html')) {
            processHtml(path.join(dir, f.name));
        }
    }
}

walkDir('admin');
console.log('Done');
