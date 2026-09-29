const fs = require('fs');
const path = require('path');
const adminDir = path.join(process.cwd(), 'admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const replacementHTML = `
<div class="logo-container" style="display:flex; align-items:center; justify-content:space-between; width:100%; margin-bottom:0;">
    <div style="display:flex; align-items:center; gap:0.5rem; flex-shrink:0; cursor:pointer;" onclick="location.href='dashboard.html'">
        <img src="../images/logo/logo.png" style="height: 28px;" onerror="this.style.display='none';">
        <h1 style="margin:0; font-size: 1.3rem; color: #4F46E5; font-weight: 800; white-space:nowrap;">AI경영관리</h1>
    </div>
    <div class="mobile-only-btn" style="display:none; cursor:pointer;" onclick="this.closest('.top-nav').classList.toggle('menu-open')">
        <svg viewBox="0 0 24 24" width="28" height="28" stroke="#4F46E5" stroke-width="2" fill="none"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
    </div>
</div>
`;

files.forEach(file => {
    const target = path.join(adminDir, file);
    let html = fs.readFileSync(target, 'utf8');

    // Attempt 1: Replace matching the whole div with <button...
    html = html.replace(/<div class="logo-container"[^>]*>[\s\S]*?<button[^>]*>.*?<\/button>\s*<\/div>/gi, replacementHTML.trim());

    // Attempt 2: If the button was replaced by a ? or just broke differently
    if (html.indexOf('AI경영관리') !== -1 && html.indexOf('mobile-only-btn') === -1) {
        // Just look for the logo-container wrapper
        html = html.replace(/<div class="logo-container"[^>]*>[\s\S]*?<\/div>\s*<\/div>/i, replacementHTML.trim());
    }

    // Attempt 3: In case it's still old AI CEO MANAGER
    html = html.replace(/<h1[^>]*>AI CEO MANAGER<\/h1>/gi, replacementHTML.trim());

    // Ensure all <ul> elements inside top-nav are safe
    // Inject vital css inside the <head> to absolutely FORCE layout fix!
    const criticalViteBypassCSS = `
    <!-- FORCE CSS -->
    <style>
        .top-nav { display: flex; align-items: center; justify-content: space-between; flex-wrap: nowrap; overflow: visible; }
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
                box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 0.5rem 0 !important; gap: 0 !important;
                margin-top: 1rem;
            }
            .top-nav.menu-open ul li { width: 100%; border-bottom: 1px solid #f1f5f9; text-align:center; }
            .top-nav.menu-open ul li a { display: block !important; padding: 1rem !important; }
            
            /* Metric cards wrap */
            .metric-cards, .dashboard-grid, .client-summary, .finance-summary, .stats-grid, .summary-container { 
                grid-template-columns: 1fr !important; gap: 1rem !important; display: grid !important;
            }
        }
    </style>
    </head>
    `;

    if (html.indexOf('<!-- FORCE CSS -->') === -1) {
        html = html.replace('</head>', criticalViteBypassCSS);
    }

    fs.writeFileSync(target, html, 'utf8');
});
console.log('Fixed HTML perfectly.');
