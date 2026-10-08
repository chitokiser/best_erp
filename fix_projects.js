const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'admin', 'projects.html');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace 1: Insert user fetching logic
content = content.replace(
    /const querySnapshot = await getDocs\(collection\(db, 'projects'\)\);/g,
    `// Fetch Users to map email -> name
                    const usersSnap = await getDocs(collection(db, 'users'));
                    const emailToName = {};
                    usersSnap.forEach(uDoc => {
                        const ud = uDoc.data();
                        if(ud.email && ud.name) {
                            emailToName[ud.email] = ud.name;
                        }
                    });

                    const querySnapshot = await getDocs(collection(db, 'projects'));`
);

// Replace 2: Replace data.pm with mapped name
content = content.replace(
    /<td style="padding: 1rem;">\$\{data\.pm \|\| '미지정'\}<\/td>/g,
    `<% REPLACE_NAME %>` // Temporary marker to avoid multi-match issues if any
);

// Specifically target the data.pm line
content = content.replace(
    /const id = docSnap\.id;([\s\S]*?)<tr>([\s\S]*?)<% REPLACE_NAME %>/g,
    `const id = docSnap.id;
                        const pmEmail = data.pm || '미지정';
                        const pmName = emailToName[pmEmail] ? emailToName[pmEmail] : pmEmail;$1<tr>$2<td style="padding: 1rem;">\${pmName}</td>`
);

// In case the exact regex string didn't match the table cell (because '미지정' is Korean)
content = content.replace(
    /<td style="padding: 1rem;">\$\{data\.pm \|\| '(.*?)'\}<\/td>/g,
    `<td style="padding: 1rem;">\${pmName}</td>`
);

content = content.replace(
    /const id = docSnap\.id;([\n\r\s]+)html \+= `/g,
    `const id = docSnap.id;
                        const pmEmail = data.pm || '미지정';
                        const pmName = emailToName[pmEmail] ? emailToName[pmEmail] : pmEmail;$1html += \``
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Modified projects.html successfully.');
