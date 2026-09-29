const fs = require('fs');

function updateFile(file) {
    let content = fs.readFileSync(file, 'utf8');
    const target1 = "const querySnapshot = await getDocs(collection(db, 'users'));";
    const target2 = "const querySnapshot = await getDocs(collection(db, 'employees'));";

    const oldLoop = /querySnapshot\.forEach\([\s\S]*?pmSelect\.appendChild\(option\);\s*\n\s*\}\);/m;
    const newLoop = `querySnapshot.forEach(userDoc => {
                    const udata = userDoc.data();
                    const emailOrContact = udata.contact || udata.email || '';
                    if (!emailOrContact) return; // skip if no email
                    const option = document.createElement('option');
                    option.value = emailOrContact;
                    option.textContent = \`\${udata.name || '무명'} (\${udata.position || '직원'}) - \${emailOrContact}\`;
                    pmSelect.appendChild(option);
                });`;

    if (content.includes(target1)) {
        content = content.replace(target1, target2);
        content = content.replace(oldLoop, newLoop);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated', file);
    } else if (content.includes(target2)) {
        content = content.replace(oldLoop, newLoop);
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated loop in', file);
    }
}

updateFile('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/projects.html');
updateFile('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html');
