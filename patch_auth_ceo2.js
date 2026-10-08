const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace('isMerchant = !!data.merchantId;', `isMerchant = !!data.merchantId;
                    
                    if (isMerchant) {
                        role = 'CEO';
                        position = '가맹점 대표';
                        status = '승인완료';
                    }`);

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
