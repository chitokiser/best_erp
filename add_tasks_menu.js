const fs = require('fs');
const path = require('path');

function getMenuLink(fileDir, fileBaseName) {
    // Determine the path to tasks.html relative to the current file
    let pathPre = '';
    if (fileDir === 'admin') {
        pathPre = '';
    } else if (fileDir === '.') {
        pathPre = 'admin/';
    } else {
        pathPre = '../admin/'; // basic assumption for 1-level deep
    }

    // Determine the active class
    let activeClass = (fileBaseName === 'tasks.html') ? ' class="active"' : '';
    
    return \<li><a href="\tasks.html"\>업무/지시</a></li>\;
}

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const f of files) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory() && f !== 'node_modules' && f !== '.git' && f !== 'dist' && f !== 'images') {
            processDir(full);
        } else if (f.endsWith('.html')) {
            let content = fs.readFileSync(full, 'utf8');
            
            // Check if it has the navigation structure
            if (content.includes('href="projects.html"') || content.includes('href="../admin/projects.html"') || content.includes('href="admin/projects.html"')) {
                // Check if tasks is already there
                if (!content.includes('tasks.html">업무')) {
                    const lines = content.split('\n');
                    let newContent = [];
                    for (let i = 0; i < lines.length; i++) {
                        newContent.push(lines[i]);
                        if (lines[i].includes('href="projects.html"') || lines[i].includes('href="../admin/projects.html"') || lines[i].includes('href="admin/projects.html"')) {
                            // insert tasks before projects
                            let prefixWhitespace = lines[i].match(/^\s*/)[0];
                            let link = getMenuLink(dir, f);
                            // We insert it BEFORE the projects line by swapping
                            let projectLine = newContent.pop();
                            newContent.push(prefixWhitespace + link);
                            newContent.push(projectLine);
                        }
                    }
                    fs.writeFileSync(full, newContent.join('\n'), 'utf8');
                    console.log('Updated ' + full);
                }
            }
        }
    }
}
processDir('admin');
