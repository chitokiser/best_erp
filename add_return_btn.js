const fs = require('fs');
const path = require('path');

const dirs = ['.', './admin'];
let updated = 0;

for (const dir of dirs) {
    const files = fs.readdirSync(path.join(__dirname, dir));
    for (const f of files) {
        if (!f.endsWith('.html')) continue;
        const full = path.join(__dirname, dir, f);
        let content = fs.readFileSync(full, 'utf8');

        let changed = false;

        // 1. For admin pages with <nav class="top-nav">
        if (content.includes('<nav class="top-nav">')) {
            // Find </ul> and append the return botton just inside or outside. 
            // Or add to the ul list:
            if (!content.includes('https://bestwinner.netlify.app/')) {
                content = content.replace(
                    /<\/ul>\s*<div[^>]*text-align:[^>]*right/i,
                    match => `    <li><a href="https://bestwinner.netlify.app/" target="_blank">🏠 BESTWINNER 바로가기</a></li>\n        ` + match
                );
                changed = true;
            }
        }

        // 2. For root pages with <nav class="main-nav">
        if (content.includes('<nav class="main-nav">') || content.includes('class="main-nav"')) {
            if (!content.includes('https://bestwinner.netlify.app/')) {
                content = content.replace(
                    /(<li[^>]*navUserArea.*?<\/li>)/,
                    match => `<li><a href="https://bestwinner.netlify.app/" target="_blank" style="color:var(--primary-color);">🏠 BESTWINNER 바로가기</a></li>\n                    ` + match
                );
                changed = true;
            }
        }

        // 3. For ceo-dashboard with <nav class="ceo-nav">
        if (content.includes('<nav class="ceo-nav"')) {
            if (!content.includes('https://bestwinner.netlify.app/')) {
                content = content.replace(
                    /(<a href="\.\.\/index\.html"[^>]*>메인으로<\/a>)/g,
                    `$1\n            <a href="https://bestwinner.netlify.app/" target="_blank" style="color: #cbd5e1; text-decoration:none; font-size: 0.875rem;">🏠 BESTWINNER 바로가기</a>`
                );

                // tasks HTML
                content = content.replace(
                    /(<a href="ceo-dashboard\.html"[^>]*>대시보드<\/a>)/g,
                    `$1\n            <a href="https://bestwinner.netlify.app/" target="_blank" style="color: #cbd5e1; text-decoration:none; margin-right:1rem; font-size: 0.875rem;">🏠 BESTWINNER 바로가기</a>`
                );

                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(full, content, 'utf8');
            console.log('Updated ' + full);
            updated++;
        }
    }
}
console.log(`Update complete. ${updated} files modified.`);
