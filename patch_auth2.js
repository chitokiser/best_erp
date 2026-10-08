const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace(`} else if (!snap.empty) {
                    const data = snap.docs[0].data();`, 
`                } 
                
                let isMerchant = false;
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    isMerchant = !!data.merchantId;`);

js = js.replace('const isMerchant = !!data.merchantId;', '// isMerchant evaluated above');

// Wait, the tenantId was also an issue!
// `window.tenantId = data.tenant_id || data.company_id || user.uid;`
// That was replaced by `data.merchantId || ...`.
// Let's make sure it's valid.

js = js.replace(`window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;`,
`window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;`); // It is inside the block, so `data` is valid!

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
