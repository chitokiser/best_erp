import fs from 'fs';
import path from 'path';

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = findHtmlFiles('./');

htmlFiles.forEach(file => {
    // Skip login
    if (file.includes('login.html')) return;

    let content = fs.readFileSync(file, 'utf8');

    // 1. Hide body by default to prevent data leak flashing
    if (content.includes('<body') && !content.includes('<body style="display:none')) {
        content = content.replace(/<body([^>]*)>/, '<body$1 style="display: none;">');
    }

    // 2. Inject Auth Guard script right before </body>
    if (!content.includes('Auth Guard')) {
        const depth = file.includes('admin') ? '../' : './';
        const redirectPath = file.includes('admin') ? '../login.html' : 'login.html';

        const guardScript = `
    <!-- Global Auth Guard -->
    <script type="module">
        import { checkAdminAuth } from '${depth}assets/js/auth.js';
        
        checkAdminAuth(
            (user) => { 
                document.body.style.display = 'block';
                
                // Add logout button / User email to header dynamically if header exists
                const nav = document.querySelector('.main-nav ul');
                if(nav && !document.getElementById('navUserEmail')) {
                    const li = document.createElement('li');
                    li.id = 'navUserEmail';
                    li.innerHTML = \`<span style="margin-left: 1rem; font-size:0.875rem; color:var(--text-secondary);">\${user.email}</span>
                                    <button onclick="window.logoutAndRedirect()" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold;">[로그아웃]</button>\`;
                    nav.appendChild(li);
                }
            },
            () => {
                const current = window.location.pathname + window.location.search;
                window.location.href = '${redirectPath}?redirect=' + encodeURIComponent(current);
            }
        );

        import { logoutAdmin } from '${depth}assets/js/auth.js';
        window.logoutAndRedirect = () => {
            logoutAdmin();
            window.location.href = '${redirectPath}';
        };
    </script>
</body>`;
        content = content.replace(/<\/body>/, guardScript);
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Protected ${file}`);
    }
});
