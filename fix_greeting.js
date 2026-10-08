const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'admin', 'dashboard.html');
let content = fs.readFileSync(p, 'utf8');

// Replace Good Morning CEO
content = content.replace(
    /<h2>Good Morning, CEO<\/h2>/g,
    '<h2 id="greetingTitle">Good Morning, CEO</h2>'
);

// We need a script block at the end that fetches the user info.
// We can use the checkAdminAuth or just standard firebase import if it isn't there already.
if (!content.includes('id="greetingTitle"')) {
    console.log("greetingTitle missing?");
}

// Add the auth script if not present
if (!content.includes('greetingTitle.innerText')) {
    const scriptStr = `
    <script type="module">
        import { checkAdminAuth } from '../assets/js/auth.js';
        import { db } from '../assets/js/firebase-config.js';
        import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';

        checkAdminAuth(
            async (user) => {
                document.body.style.display = 'block';
                const el = document.getElementById('greetingTitle');
                if (el) {
                    try {
                        const q = query(collection(db, 'users'), where('email', '==', user.email));
                        const snap = await getDocs(q);
                        if (!snap.empty) {
                            const uData = snap.docs[0].data();
                            const name = uData.name || '관리자';
                            // "CEO" "PM" "직원" "팀장" ..
                            let roleStr = '님';
                            if (uData.role === 'CEO') roleStr = '대표님';
                            else if (uData.role === 'TEAM_LEADER') roleStr = '팀장님';
                            else if (uData.role === 'EMPLOYEE') roleStr = 'PM님';
                            
                            el.innerText = \`안녕하세요 \${name} \${roleStr}\`;
                        } else {
                            el.innerText = \`안녕하세요 \${user.email.split('@')[0]}님\`;
                        }
                    } catch(e) {
                        console.error(e);
                    }
                }
            },
            () => {
                window.location.href = '../login.html';
            }
        );
    </script>
</body>`;
    content = content.replace(/<\/body>/g, scriptStr);

    // Also fix the top nav right static text
    content = content.replace(
        /<strong style="color:var\(--ai-primary\);">SUPER_ADMIN<\/strong><br>\s*최고 관리자 \(daguri75@gmail\.com\) <a href="#"/g,
        `<strong style="color:var(--ai-primary);" id="navUserName">SUPER_ADMIN</strong><br>
            <span id="navUserRole">최고 관리자</span> <a href="#" onclick="import('../assets/js/auth.js').then(m => m.logoutAdmin())"`
    );
    // add to script
    content = content.replace(
        /el\.innerText = \`안녕하세요 \$\{name\} \$\{roleStr\}\`;/,
        `el.innerText = \`안녕하세요 \${name} \${roleStr}\`;
                            document.getElementById('navUserName').innerText = name;
                            document.getElementById('navUserRole').innerText = uData.role || '권한없음';`
    );

    fs.writeFileSync(p, content, 'utf8');
    console.log("Updated admin/dashboard.html");
}

