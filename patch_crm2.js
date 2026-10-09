const fs = require('fs');
let js = fs.readFileSync('assets/js/admin-crm.js', 'utf8');

js = js.replace("getDocs, orderBy }", "getDocs, orderBy, doc, getDoc }");
fs.writeFileSync('assets/js/admin-crm.js', js, 'utf8');
