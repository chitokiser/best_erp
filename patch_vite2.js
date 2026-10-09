const fs = require('fs');
let vc = fs.readFileSync('vite.config.js', 'utf8');
vc = vc.replace(/"login": resolve\(__dirname, 'login.html'\),/, `"login": resolve(__dirname, 'login.html'),
        "qr-event": resolve(__dirname, 'qr-event.html'),`);
fs.writeFileSync('vite.config.js', vc, 'utf8');
