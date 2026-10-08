const fs = require('fs');

const ceoDash = fs.readFileSync('admin/ceo-dashboard.html', 'utf8');
const oldDash = fs.readFileSync('admin/dashboard.html', 'utf8');

// Extract nav from oldDash
const navRegex = /<nav class="top-nav">[\s\S]*?<\/nav>/;
const topNavMatch = oldDash.match(navRegex);
let topNav = topNavMatch ? topNavMatch[0] : '';
topNav = topNav.replace('navUserName', 'navUserName2').replace('navUserRole', 'navUserRole2');

// Extract TOP CSS from old dash
const topCssRegex = /<style>[\s\S]*?\.top-nav[\s\S]*?<\/style>\s*<style>[\s\S]*?@media[\s\S]*?<\/style>/i;
const topCssMatch = oldDash.match(topCssRegex) || oldDash.match(/<style>[\s\S]*?\.top-nav[\s\S]*?<\/style>/i);
let topCss = topCssMatch ? topCssMatch[0] : '';

// Remove old ceo-nav
let newHtml = ceoDash.replace(/<nav class="ceo-nav">[\s\S]*?<\/nav>/, topNav);

// Remove aside sidebar
newHtml = newHtml.replace(/<aside>[\s\S]*?<\/aside>/, '');

// Update grid layout to 1fr 350px
newHtml = newHtml.replace('grid-template-columns: 250px 1fr 350px;', 'grid-template-columns: 1fr 350px;');

// Inject top-nav CSS to head
newHtml = newHtml.replace('</head>', topCss + '\n</head>');

// Add auth check script from oldDash
const scriptRegex = /<script type="module">\s*import \{ checkAdminAuth[\s\S]*?<\/script>/;
const authScriptMatch = oldDash.match(scriptRegex);
if (authScriptMatch) {
    let authScr = authScriptMatch[0];
    authScr = authScr.replace("'navUserName'", "'navUserName2'").replace("'navUserRole'", "'navUserRole2'");
    newHtml = newHtml.replace('</body>', authScr + '\n</body>');
}

fs.writeFileSync('admin/dashboard.html', newHtml, 'utf8');
fs.writeFileSync('admin/ceo-dashboard.html', '<script>window.location.href="dashboard.html";</script>', 'utf8');

console.log('Unification complete');
