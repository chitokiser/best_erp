const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

const regex = /if \(snap\.empty && user\.email === 'daguri75@gmail\.com'\) \{[\s\S]*?if \(!isMerchant && !\['CEO'/;

const match = js.match(regex);
if(match) {
    console.log("Matched block!");
    const replacement = `if (snap.empty && user.email === 'daguri75@gmail.com') {
                    // First time auto-provisioning for Super Admin
                    await addDoc(collection(db, 'users'), {
                        email: user.email,
                        name: 'CEO',
                        position: '최고 관리자',
                        role: 'SUPER_ADMIN',
                        status: '승인',
                        tenantId: 'system_master',
                        createdAt: serverTimestamp()
                    });
                    role = 'SUPER_ADMIN';
                    position = '최고 관리자';
                    status = '승인';
                    window.tenantId = 'system_master';
                }
                
                let isMerchant = false;
                
                if (!snap.empty) {
                    const data = snap.docs[0].data();
                    role = data.role || data.tier || 'GUEST';
                    position = data.position || data.name || '직원';
                    status = data.status || '대기중';

                    // Jumper Auth DB often uses role='ceo' (lowercase) or 'CEO'
                    if (role === 'ceo') role = 'CEO';
                    
                    isMerchant = !!data.merchantId;

                    // Store tenant ID globally. Fallback to user email if missing
                    window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;
                }

                // Global variables for RBAC
                window.currentUserRole = role;
                window.currentUserStatus = status;

                // Stop unapproved users
                if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com'`;
    
    js = js.replace(regex, replacement);
    fs.writeFileSync('assets/js/auth.js', js, 'utf8');
} else {
    console.log("Not matched");
}
