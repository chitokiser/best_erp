const fs = require('fs');
let authJs = fs.readFileSync('assets/js/auth.js', 'utf8');

const authRegex = /alert\([^;]+;\s*await signOut\(auth\);\s*window\.location\.href[^;]+;\s*return;/;
const authRep = `await signOut(auth);
                    const d = snap.exists() ? snap.data() : {};
                    let errMsg = 'ERP 시스템 접근 권한이 없습니다. (가맹 승인 필요)';
                    if (d.status === 'pending' || d.status === '대기중' || d.role === 'FRANCHISE' || d.role === 'franchise' || d.is_merchant_applicant) {
                        errMsg = '승인 대기 중인 가맹점 계정입니다. 심사 후 이용 가능합니다.';
                    }
                    if (onAuthFail) onAuthFail(errMsg);
                    return;`;

if(authRegex.test(authJs)) {
    authJs = authJs.replace(authRegex, authRep);
    fs.writeFileSync('assets/js/auth.js', authJs, 'utf8');
    console.log("Success");
} else {
    console.log("Not matched");
}
