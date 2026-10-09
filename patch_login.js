const fs = require('fs');

// 1. Modify auth.js
let authJs = fs.readFileSync('assets/js/auth.js', 'utf8');

const targetAuth = `                // Stop unapproved users
                if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {
                    alert('ERP 접근 권한이 없습니다. CEO 자격(정기구독)을 획득해주세요.');
                    await signOut(auth);
                    window.location.href = 'https://bestclubvn.netlify.app/';
                    return;
                }`;
                
// Note: we can't do exact matching easily due to encoding / chars. We'll use regex.
const authRegex = /\/\/ Stop unapproved users[\s\S]*?return;\s*\}/;
const authRep = `// Stop unapproved users
                if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {
                    await signOut(auth);
                    const d = snap.exists() ? snap.data() : {};
                    let errMsg = 'ERP 시스템 접근 권한이 없습니다. (가맹 승인 필요)';
                    if (d.status === 'pending' || d.status === '대기중' || d.role === 'FRANCHISE' || d.role === 'franchise') {
                        errMsg = '승인 대기 중인 가맹점 계정입니다. 심사 후 이용 가능합니다.';
                    }
                    if (onAuthFail) onAuthFail(errMsg);
                    return;
                }`;

authJs = authJs.replace(authRegex, authRep);
fs.writeFileSync('assets/js/auth.js', authJs, 'utf8');


// 2. Modify login.html
let loginHtml = fs.readFileSync('login.html', 'utf8');

// Fix the UI tab wrap issue by adding white-space:nowrap on the 탭 버튼s
loginHtml = loginHtml.replace(/<button id="tabReg" type="button"/, '<button id="tabReg" type="button" style="white-space:nowrap;"');
loginHtml = loginHtml.replace(/<button id="tabLogin" type="button"/, '<button id="tabLogin" type="button" style="white-space:nowrap;"');

// In login.html, modify checkAdminAuth callback
const loginRegex = /checkAdminAuth\(\s*\(\s*user\s*\)\s*=>\s*\{[\s\S]*?\}\s*\)(?=\s*;)/;
const loginRep = `checkAdminAuth(
            (user) => {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect');
                if (redirect) {
                    window.location.href = decodeURIComponent(redirect);
                } else {
                    window.location.href = 'admin/dashboard.html';
                }
            },
            (errMsg) => { 
                if (errMsg) {
                    document.getElementById('loginError').textContent = errMsg;
                }
            }
        )`;
loginHtml = loginHtml.replace(loginRegex, loginRep);

fs.writeFileSync('login.html', loginHtml, 'utf8');

console.log("Patched auth.js and login.html");
