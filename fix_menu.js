const fs = require('fs');
const path = require('path');
const adminDir = path.join(process.cwd(), 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const CSS_TO_REPLACE = /<!-- FORCE CSS -->[\s\S]*?<\/style>/i;

const NEW_CSS = `
<!-- FORCE CSS -->
<style>
    .top-nav { display: flex; align-items: center; justify-content: space-between; flex-wrap: nowrap; overflow: visible; position: relative; }
    .logo-container { width: auto !important; }
    .top-nav ul { display: flex; align-items: center; gap: 1rem; list-style: none; margin: 0; padding: 0; flex-wrap: nowrap !important; }
    .top-nav ul li a { white-space: nowrap !important; }
    .mobile-only-btn { display: none !important; }
    
    @media screen and (max-width: 900px) {
        .mobile-only-btn { display: block !important; }
        .logo-container { width: 100% !important; justify-content: space-between !important; }
        .top-nav { flex-direction: column !important; align-items: flex-start !important; }
        .top-nav ul { display: none !important; }
        .top-nav > div:last-child { display: none !important; }
        
        .top-nav.menu-open ul { 
            display: flex !important; flex-direction: column !important; 
            width: 100%; border-radius: 0.5rem; background:#fff; 
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); padding: 0.5rem 0 !important; gap: 0 !important;
            margin-top: 1rem;
            max-height: 70vh; /* Prevent it from going offscreen */
            overflow-y: auto; /* Scrollable if too many items */
        }
        .top-nav.menu-open ul li { width: 100%; border-bottom: 1px solid #f1f5f9; text-align:center; }
        .top-nav.menu-open ul li a { display: block !important; padding: 1rem !important; }
        
        .metric-cards, .dashboard-grid, .client-summary, .finance-summary, .stats-grid, .summary-container { 
            grid-template-columns: 1fr !important; gap: 1rem !important; display: grid !important;
        }
    }
</style>
`;

files.forEach(file => {
    const target = path.join(adminDir, file);
    let html = fs.readFileSync(target, 'utf8');

    // Replace the button onclick safely
    html = html.replace(/onclick="this\.closest\('\.top-nav'\)\.classList\.toggle\('menu-open'\)"/g, 'onclick="document.querySelector(\'.top-nav\').classList.toggle(\'menu-open\')"');

    if (html.match(CSS_TO_REPLACE)) {
        html = html.replace(CSS_TO_REPLACE, NEW_CSS.trim());
    }

    fs.writeFileSync(target, html, 'utf8');
});
console.log('Fixed Menu Toggle and Dropdown.');
