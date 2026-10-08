const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

const loginContainerRegex = /<div class="login-container">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;
const newLoginHtml = `
    <div style="display:flex; width:100%; min-height:100vh;">
        <!-- Left Side: Intro to bestclub ax -->
        <div style="flex:1; background: linear-gradient(135deg, #4f46e5, #0f172a); color: white; display: flex; flex-direction: column; justify-content: center; padding: 4rem; position: relative; overflow: hidden;">
            <div style="position: absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: rgba(129, 140, 248, 0.2); border-radius: 50%; filter: blur(50px);"></div>
            <div style="position: absolute; bottom: -50px; left: -50px; width: 300px; height: 300px; background: rgba(99, 102, 241, 0.3); border-radius: 50%; filter: blur(70px);"></div>
            
            <div style="z-index: 10;">
                <h1 style="font-size: 3.5rem; font-weight: 800; margin-bottom: 0.5rem; line-height: 1.2;">BESTCLUB AX</h1>
                <h2 style="font-size: 1.5rem; font-weight: 500; color: #818cf8; margin-bottom: 2rem;">AI 경영관리 SaaS 플랫폼</h2>
                <p style="font-size: 1.1rem; line-height: 1.8; color: #cbd5e1; max-width: 500px; margin-bottom: 3rem;">
                    Jumper 네트워크와 연동된 강력한 AI 경영참모가 대표님의 비즈니스를 돕습니다. 실시간 프로젝트 현황, 결재 대기 문서, 현장 리스크를 한눈에 파악하고 해결책을 제시받으세요.
                </p>
                
                <div style="display: flex; gap: 1rem; flex-wrap:wrap;">
                    <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 1rem 1.5rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-weight: 700; font-size: 1.5rem; color: #fff;">100%</div>
                        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">실시간 데이터 결합</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); padding: 1rem 1.5rem; border-radius: 1rem; border: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-weight: 700; font-size: 1.5rem; color: #fff;">Multi-Tenant</div>
                        <div style="font-size: 0.85rem; color: #94a3b8; margin-top: 0.25rem;">독립된 리소스 공간</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right Side: Login -->
        <div style="flex:1; background: white; display: flex; align-items: center; justify-content: center; padding: 2rem;">
            <div class="login-container" style="box-shadow: none; border: none; width: 100%; max-width: 450px; background: transparent;">
                <h1 style="text-align: center; color: var(--text-dark); margin-bottom: 2rem; font-weight: 800; font-size:2rem; letter-spacing:-1px;">보안 로그인</h1>

                <div class="tab-header" style="display:flex; border-bottom: 2px solid #e2e8f0; margin-bottom: 2rem;">
                    <button class="active" id="btnModeLogin" style="flex:1; padding:1rem; border:none; background:none; font-weight:600; color:var(--primary-color); border-bottom:2px solid var(--primary-color);">Jumper 회원 로그인</button>
                    <button id="btnModeRegister" style="flex:1; padding:1rem; border:none; background:none; font-weight:600; color:var(--text-muted); cursor:pointer;">신규 신청</button>
                </div>

                <div class="form-group" id="grpName" style="display:none; margin-bottom: 1.5rem;">
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.9rem;">이름/직책</label>
                    <input type="text" id="txtName" placeholder="홍길동 대표" style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem;">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.9rem;">Jumper 계정 (Email)</label>
                    <input type="email" id="txtEmail" placeholder="ceo@company.com" style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem;">
                </div>
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.9rem;">비밀번호</label>
                    <input type="password" id="txtPassword" placeholder="••••••••" style="width:100%; padding:0.75rem; border:1px solid #e2e8f0; border-radius:0.5rem;">
                </div>

                <p id="loginError" class="error-msg" style="color: #dc2626; font-size: 0.875rem; font-weight: 500; height: 1.2rem;"></p>

                <button class="btn-primary" id="btnSubmit" style="width: 100%; font-size: 1.1rem; padding: 1rem; margin-top: 1rem; background: var(--primary-color); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600;">로그인</button>

                <div class="divider" style="display:flex; align-items:center; margin: 2rem 0; color:#94a3b8; font-size:0.875rem;">
                    <div style="flex:1; border-bottom:1px solid #e2e8f0;"></div>
                    <span style="padding: 0 1rem;">또는</span>
                    <div style="flex:1; border-bottom:1px solid #e2e8f0;"></div>
                </div>

                <button id="btnGoogle" style="width: 100%; display:flex; justify-content:center; align-items:center; gap:0.5rem; border: 1px solid #e2e8f0; background:white; color:#334155; border-radius: 0.5rem; padding:1rem; font-weight:600; font-size: 1rem; cursor:pointer;">
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" alt="Google">
                    Jumper 구글 연동 로그인
                </button>
                <div style="text-align:center; font-size:0.8rem; color:#94a3b8; margin-top:1.5rem;">
                    Jumper 계정으로 통합 로그인됩니다.
                </div>
            </div>
        </div>
    </div>`;

html = html.replace(/<body>[\s\S]*?<\/body>/, `<body>
${newLoginHtml}
<script type="module" src="assets/js/firebase-config.js"></script>
    <script type="module">
        import { loginAdmin, registerUser, loginWithGoogle, checkAdminAuth } from './assets/js/auth.js';

        let mode = 'login';
        const errP = document.getElementById('loginError');

        const btnL = document.getElementById('btnModeLogin');
        const btnR = document.getElementById('btnModeRegister');
        const grpName = document.getElementById('grpName');
        const btnSub = document.getElementById('btnSubmit');

        const setMode = (m) => {
            mode = m;
            errP.textContent = '';
            if (m === 'login') {
                grpName.style.display = 'none';
                btnSub.textContent = '로그인';
                btnL.style.color = '#4F46E5'; btnL.style.borderBottom = '2px solid #4F46E5';
                btnR.style.color = '#64748B'; btnR.style.borderBottom = 'none';
            } else {
                grpName.style.display = 'block';
                btnSub.textContent = '가입 요청';
                btnR.style.color = '#4F46E5'; btnR.style.borderBottom = '2px solid #4F46E5';
                btnL.style.color = '#64748B'; btnL.style.borderBottom = 'none';
            }
        };

        checkAdminAuth(
            (user) => {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get('redirect');
                if (redirect) {
                    window.location.href = decodeURIComponent(redirect);
                } else {
                    window.location.href = 'admin/dashboard.html';
                }
            },
            () => { } // Stay on login page
        );

        if(btnL) btnL.addEventListener('click', () => setMode('login'));
        if(btnR) btnR.addEventListener('click', () => setMode('register'));

        if(btnSub) btnSub.addEventListener('click', async () => {
            const email = document.getElementById('txtEmail').value;
            const pw = document.getElementById('txtPassword').value;
            const name = document.getElementById('txtName') ? document.getElementById('txtName').value : '';

            try {
                if (mode === 'login') {
                    await loginAdmin(email, pw);
                } else {
                    if (!name) { errP.textContent = '이름을 입력하세요.'; return; }
                    await registerUser(email, pw, name);
                    alert('가입이 완료되었습니다. 최고 관리자의 가입 승인을 기다려주세요.');
                    setMode('login');
                }
            } catch (err) {
                console.error(err);
                if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                    errP.textContent = '이메일 또는 비밀번호가 일치하지 않습니다.';
                } else if (err.code === 'auth/email-already-in-use') {
                    errP.textContent = '이미 가입된 이메일 계정입니다.';
                } else {
                    errP.textContent = '오류 발생: ' + err.message;
                }
            }
        });

        if(document.getElementById('btnGoogle')) document.getElementById('btnGoogle').addEventListener('click', async () => {
            document.getElementById('loginError').textContent = '';
            try {
                await loginWithGoogle();
                // CheckAdminAuth observer will auto redirect to dashboard
            } catch (err) {
                console.error(err);
                document.getElementById('loginError').textContent = 'Google 로그인 중 오류가 발생했습니다. (' + err.code + ')';
            }
        });
    </script>
</body>`);

html = html.replace(/<style>[\s\S]*?<\/style>/, `
    <style>
        :root {
            --primary-color: #4F46E5;
            --text-dark: #1E293B;
            --text-muted: #64748B;
        }
        body, html { margin: 0; padding: 0; font-family: 'Inter', sans-serif; height: 100%; background: #fdfdfd; }
        
        @media screen and (max-width: 900px) {
            body > div { flex-direction: column !important; }
            body > div > div:first-child { padding: 2rem !important; min-height: 40vh; }
            body > div > div:first-child h1 { font-size: 2.5rem !important; }
            body > div > div:last-child { padding: 1rem !important; }
        }
    </style>
`);

fs.writeFileSync('login.html', html, 'utf8');
console.log('Login HTML redesigned successfully');
