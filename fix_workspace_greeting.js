const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, 'my-workspace.html');
let content = fs.readFileSync(p, 'utf8');

// Replace static greeting with ID
content = content.replace(
    /<h2 style="font-size: 1\.8rem; margin-bottom: 0\.5rem;">안녕하세요, 박대리 님!<\/h2>/g,
    '<h2 id="greetingTitle" style="font-size: 1.8rem; margin-bottom: 0.5rem;">안녕하세요!</h2>'
);

// We need to inject the logic to set the greetingTitle inside the checkAdminAuth block.
// Wait, my-workspace.html ALREADY has a checkAdminAuth block.
// Let's modify it safely.

content = content.replace(
    /\(user\) => \{([\s\S]*?)document\.body\.style\.display = 'block';/,
    `(user) => {
                $1document.body.style.display = 'block';
                import('./assets/js/firebase-config.js').then(({db}) => {
                    import('firebase/firestore').then(({collection, query, where, getDocs}) => {
                        const q = query(collection(db, 'users'), where('email', '==', user.email));
                        getDocs(q).then(snap => {
                            if(!snap.empty) {
                                const ud = snap.docs[0].data();
                                const name = ud.name || user.email.split('@')[0];
                                let roleStr = '님';
                                if (ud.role === 'CEO') roleStr = '대표님';
                                else if (ud.role === 'TEAM_LEADER') roleStr = '팀장님';
                                else if (ud.role === 'EMPLOYEE') roleStr = 'PM님';
                                document.getElementById('greetingTitle').innerText = \`안녕하세요, \${name} \${roleStr}!\`;
                            }
                        });
                    });
                });
    `
);

fs.writeFileSync(p, content, 'utf8');
console.log("Updated my-workspace.html");
