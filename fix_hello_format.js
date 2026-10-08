const fs = require('fs');

function updateGreeting(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // For my-workspace.html (using 'ud')
    content = content.replace(
        /let roleStr = ud\.position[\s\S]*?document\.getElementById\('greetingTitle'\)\.innerText = `안녕하세요, \$\{name\} \$\{roleStr\}!`;/g,
        `let roleStr = ud.position ? '/' + ud.position + '님' : (ud.role === 'STAFF' ? '/사원님' : '님');
                                if (ud.role === 'CEO') roleStr = '/대표님';
                                else if (ud.role === 'TEAM_LEADER') roleStr = ud.position ? '/' + ud.position + '님' : '/팀장님';
                                document.getElementById('greetingTitle').innerText = \`안녕하세요 \${name}\${roleStr}\`;`
    );

    // For admin/dashboard.html (using 'uData')
    content = content.replace(
        /let roleStr = uData\.position[\s\S]*?el\.innerText = `안녕하세요 \$\{name\} \$\{roleStr\}`;/g,
        `let roleStr = uData.position ? '/' + uData.position + '님' : (uData.role === 'STAFF' ? '/사원님' : '님');
                            if (uData.role === 'CEO') roleStr = '/대표님';
                            else if (uData.role === 'TEAM_LEADER') roleStr = uData.position ? '/' + uData.position + '님' : '/팀장님';

                            el.innerText = \`안녕하세요 \${name}\${roleStr}\`;`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
}

updateGreeting('admin/dashboard.html');
updateGreeting('my-workspace.html');
