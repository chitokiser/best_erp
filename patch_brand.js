const fs = require('fs');
let html = fs.readFileSync('admin/dashboard.html', 'utf8');

const brandHtml = `<h1 id="brandTitle" style="color:var(--ai-primary); margin:0; font-size:1.5rem; font-weight:800; display:flex; align-items:center; gap:0.5rem;">
               <span id="brandLogoText" style="color:#ef4444;">BEST</span> 
               <span id="brandMainText">AI경영관리</span>
               <button id="btnEditBrand" style="display:none; background:none; border:none; cursor:pointer; font-size:0.8rem;" title="로고/타이틀 설정">⚙️</button>
           </h1>`;

html = html.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, brandHtml);

const scriptToAdd = `
        <script type="module">
        import { doc, getDoc, setDoc } from 'firebase/firestore';
        import { db } from '../assets/js/firebase-config.js';
        
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(async () => {
                const tId = window.tenantId || 'system_master';
                const brandRef = doc(db, 'system_branding', tId);
                
                try {
                    const snap = await getDoc(brandRef);
                    if(snap.exists()) {
                        const bData = snap.data();
                        if(bData.logoText) document.getElementById('brandLogoText').innerText = bData.logoText;
                        if(bData.logoColor) document.getElementById('brandLogoText').style.color = bData.logoColor;
                        if(bData.mainText) document.getElementById('brandMainText').innerText = bData.mainText;
                    }
                } catch(e) { console.error("Brand loading error", e); }

                if (window.currentUserRole === 'SUPER_ADMIN' || window.currentUserRole === 'CEO') {
                    const btn = document.getElementById('btnEditBrand');
                    if(btn) {
                        btn.style.display = 'inline-block';
                        btn.onclick = async (e) => {
                            e.preventDefault();
                            e.stopPropagation(); // prevent navigation
                            const newLogo = prompt('포인트 로고 텍스트 (예: BEST):', document.getElementById('brandLogoText').innerText);
                            if(newLogo === null) return;
                            const newColor = prompt('포인트 컬러 (예: #ef4444 또는 red):', document.getElementById('brandLogoText').style.color || '#ef4444');
                            if(newColor === null) return;
                            const newMain = prompt('메인 브랜딩 타이틀 (예: AI경영관리):', document.getElementById('brandMainText').innerText);
                            if(newMain === null) return;
                            
                            document.getElementById('brandLogoText').innerText = newLogo;
                            document.getElementById('brandLogoText').style.color = newColor;
                            document.getElementById('brandMainText').innerText = newMain;
                            
                            await setDoc(brandRef, {
                                logoText: newLogo,
                                logoColor: newColor,
                                mainText: newMain
                            });
                            alert('브랜딩이 저장되었습니다. (테넌트 전용)');
                        };
                    }
                }
            }, 1500);
        });
        </script>
`;
html = html.replace('</head>', scriptToAdd + '\n</head>');
fs.writeFileSync('admin/dashboard.html', html, 'utf8');
