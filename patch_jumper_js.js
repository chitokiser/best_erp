const fs = require('fs');
const jsPath = 'C:/Users/Asus/Desktop/project/jumper/jumper_v10/assets/js/pages/mypage.js';
let js = fs.readFileSync(jsPath, 'utf8');

if (!js.includes('aiErpBannerOption')) {
    js = js.replace(/if \(isMerchantOwner\) \{/, `
      if (isMerchantOwner) {
        show("aiErpBannerOption", true); // Show the SaaS ERP Banner
    `);
    fs.writeFileSync(jsPath, js, 'utf8');
}
