const fs = require('fs');
let vc = fs.readFileSync('vite.config.js', 'utf8');
vc = vc.replace(/"admin_materials": resolve\(__dirname, 'admin\/materials.html'\),/, 
`"admin_materials": resolve(__dirname, 'admin/materials.html'),
        "admin_marketing": resolve(__dirname, 'admin/marketing.html'),`);
fs.writeFileSync('vite.config.js', vc, 'utf8');
