const fs = require('fs');

function fix(p) {
    let content = fs.readFileSync(p, 'utf8');
    let chunk1 = `let roleStr = '님';
                            if (uData.role === 'CEO') roleStr = '대표님';
                            else if (uData.role === 'TEAM_LEADER') roleStr = '팀장님';
                            else if (uData.role === 'EMPLOYEE') roleStr = 'PM님';`;

    let chunk2 = `let roleStr = '님';
                                if (ud.role === 'CEO') roleStr = '대표님';
                                else if (ud.role === 'TEAM_LEADER') roleStr = '팀장님';
                                else if (ud.role === 'EMPLOYEE') roleStr = 'PM님';`;

    let replacer = (roleProp) => `let roleStr = ${roleProp}.position ? ${roleProp}.position + '님' : (${roleProp}.role === 'STAFF' ? '사원님' : '님');
                            if (${roleProp}.role === 'CEO') roleStr = '대표님';
                            else if (${roleProp}.role === 'TEAM_LEADER') roleStr = ${roleProp}.position ? ${roleProp}.position + '님' : '팀장님';`;

    if (content.includes(chunk1)) {
        content = content.replace(chunk1, replacer('uData'));
        fs.writeFileSync(p, content, 'utf8');
        console.log('Fixed ' + p);
    } else if (content.includes(chunk2)) {
        content = content.replace(chunk2, replacer('ud'));
        fs.writeFileSync(p, content, 'utf8');
        console.log('Fixed ' + p);
    }
}

fix('admin/dashboard.html');
fix('my-workspace.html');
