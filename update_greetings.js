const fs = require('fs');
const path = require('path');

function fixHtmlGreeting(p) {
    let html = fs.readFileSync(p, 'utf8');

    // Instead of hardcoding 'PM님' for 'EMPLOYEE', use 'STAFF' and use the saved dynamic 'position'.
    const badLogic = /let roleStr = '님';[\s\S]*?if\s*\(ud\.role === 'CEO'\).*?else if\s*\(ud\.role === 'EMPLOYEE'\)\s*roleStr = 'PM님';/g;
    const goodLogic = `let roleStr = ud.position ? ud.position + '님' : '님';
                            if (ud.role === 'CEO') roleStr = '대표님';
                            else if (ud.role === 'TEAM_LEADER') roleStr = ud.position ? ud.position + '님' : '팀장님';
                            else if (ud.role === 'STAFF') roleStr = ud.position ? ud.position + '님' : '사원님';`;

    if (html.match(badLogic)) {
        html = html.replace(badLogic, goodLogic);
        fs.writeFileSync(p, html, 'utf8');
        console.log('Fixed greeting logic in ' + p);
    }
}

fixHtmlGreeting(path.join(__dirname, 'admin', 'dashboard.html'));
fixHtmlGreeting(path.join(__dirname, 'my-workspace.html'));
