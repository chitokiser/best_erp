const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

const regex = /if \(!isMerchant && !\['CEO', 'SUPER_ADMIN', 'ADMIN'\].*/;
js = js.replace(regex, `if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {`);

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
