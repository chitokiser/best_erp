const fs = require('fs');

let authJs = fs.readFileSync('assets/js/auth.js', 'utf8');

const targetStr = `window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;`;
const replacement = `window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;
                
                // Fetch dynamic store name for Multi-tenant UI
                try {
                    const storeSnap = await getDoc(doc(db, 'stores', window.tenantId));
                    if (storeSnap.exists() && storeSnap.data().storeName) {
                        const sName = storeSnap.data().storeName;
                        window.currentStoreName = sName;
                        // Attempt to update all possible top-left brand headers
                        document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => {
                            el.textContent = sName;
                        });
                    }
                } catch(err) { console.warn("Failed to load store branding", err); }`;

// Ensure we don't duplicate
if (!authJs.includes('window.currentStoreName = sName')) {
    authJs = authJs.replace(targetStr, replacement);
    fs.writeFileSync('assets/js/auth.js', authJs, 'utf8');
}
