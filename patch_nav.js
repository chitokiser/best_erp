const fs = require('fs');

const files = [
    'admin/dashboard.html',
    'admin/clients.html',
    'admin/marketing.html',
    'admin/menus.html'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let html = fs.readFileSync(file, 'utf8');

    // Remove users.html from menus
    html = html.replace(/<a href="users\.html"[^>]*>.*?<\/a>/g, '');
    
    // Fix Dropdown Z-index & Top Nav
    html = html.replace(/class="top-nav" style="/g, 'class="top-nav" style="position:relative; z-index:1000; overflow:visible; ');
    
    // Add dropdown z-index 9999
    html = html.replace(/\.dropdown-content \{ display: none; position: absolute;/g, '.dropdown-content { display: none; position: absolute; z-index: 9999;');

    // Standardize marketing.html link
    if (!html.includes('href="marketing.html"')) {
        // Find CRM and add marketing if missing
        html = html.replace(/(<a href="clients\.html"[^>]*>멘티\(고객\) CRM<\/a>)/, '$1<a href="marketing.html">자동 마케팅(트리거)</a>');
    }

    fs.writeFileSync(file, html, 'utf8');
});
console.log('Navigation patched.');
