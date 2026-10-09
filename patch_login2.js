const fs = require('fs');

let authJs = fs.readFileSync('assets/js/auth.js', 'utf8');

const targetStr = `alert('ERP 접근 권한이 없습니다. CEO 자격(정기구독)을 획득해주세요.');
                    await signOut(auth);
                    window.location.href = 'https://bestclubvn.netlify.app/';
                    return;`;

const repStr = `await signOut(auth);
                    const d = snap.exists() ? snap.data() : {};
                    let errMsg = 'ERP 시스템 접근 권한이 없습니다. (가맹 승인 필요)';
                    if (d.status === 'pending' || d.status === '대기중' || d.role === 'FRANCHISE' || d.role === 'franchise') {
                        errMsg = '승인 대기 중인 가맹점 계정입니다. 심사 후 이용 가능합니다.';
                    }
                    if (onAuthFail) onAuthFail(errMsg);
                    return;`;

authJs = authJs.replace(targetStr, repStr);
fs.writeFileSync('assets/js/auth.js', authJs, 'utf8');
