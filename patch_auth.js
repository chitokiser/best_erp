const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

const authCheck = `if (!['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {`;
const newAuthCheck = `
                // Jumper DB: if the user has a merchantId, they are an approved franchisee.
                const isMerchant = !!uData.merchantId;
                if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {`;

if (js.includes(authCheck)) {
    js = js.replace(authCheck, newAuthCheck);
    
    // Also need to set the tenantId correctly! 
    // If they are a merchant, their tenantId should be their merchantId (or uid if they prefer).
    // Let's modify the tenantId assignment.
    
    // In auth.js: 'const tId = uData.tenant_id || uData.company_id || user.uid;'
    // I will replace it to prioritize merchantId:
    const tenantAssign = `const tId = uData.tenant_id || uData.company_id || user.uid;`;
    const newTenantAssign = `const tId = uData.merchantId || uData.tenant_id || uData.company_id || user.uid;`;
    js = js.replace(tenantAssign, newTenantAssign);
    
    fs.writeFileSync('assets/js/auth.js', js, 'utf8');
}
