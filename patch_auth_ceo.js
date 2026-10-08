const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

const target = `                    // Jumper Auth DB often uses role='ceo' (lowercase) or 'CEO'
                    if (role === 'ceo') role = 'CEO';

                    isMerchant = !!data.merchantId;`;

const replacement = `                    // Jumper Auth DB often uses role='ceo' (lowercase) or 'CEO'
                    if (role === 'ceo') role = 'CEO';

                    isMerchant = !!data.merchantId;
                    
                    // Auto-elevate franchisee to CEO of their tenant
                    if (isMerchant) {
                        role = 'CEO';
                        position = '가맹점 대표';
                        status = '가맹승인';
                    }`;

js = js.replace(target, replacement);
fs.writeFileSync('assets/js/auth.js', js, 'utf8');
