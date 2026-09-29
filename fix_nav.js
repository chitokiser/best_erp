const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const replacementHTML = `
        <div class="logo-container" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:0;">
            <div style="display:flex; align-items:center; gap:0.5rem; cursor:pointer;" onclick="location.href='dashboard.html'">
                <img src="../images/logo/logo.png" style="height: 28px;" onerror="this.style.display='none';">
                <h1 style="margin:0; font-size: 1.3rem; color: #4F46E5; font-weight: 800;">AI경영관리</h1>
            </div>
            <button id="hamburgerBtn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#4F46E5;" class="mobile-only">☰</button>
        </div>
`;

files.forEach(file => {
    const filePath = path.join(adminDir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/<h1[^>]*>AI CEO MANAGER<\/h1>/gi, replacementHTML.trim());

    fs.writeFileSync(filePath, content, 'utf8');
});

console.log("Replaced h1 with logo and hamburger.");
