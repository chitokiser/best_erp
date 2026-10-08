const fs = require('fs');

const newNavCss = `
        .dropdown { position: relative; display: inline-block; margin-top:2px; }
        .dropdown-content { display: none; position: absolute; background-color: white; min-width: 180px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 0.5rem; border: 1px solid #e2e8f0; z-index: 1000; overflow: hidden; top:100%; left:0; }
        .dropdown-content a { color: #334155 !important; padding: 0.8rem 1rem !important; text-decoration: none; display: block; font-size: 0.95rem; font-weight: 500; border-bottom: 1px solid #f1f5f9; transition: all 0.2s; white-space: nowrap; }
        .dropdown-content a:last-child { border-bottom: none; }
        .dropdown-content a:hover { background-color: #f8fafc; color: #4F46E5 !important; padding-left: 1.25rem !important; }
        .dropdown:hover .dropdown-content { display: block; animation: fadeInUp 0.2s ease-out; }
        .dropbtn { padding: 0.5rem 0.75rem; color: #475569; font-weight: 600; cursor: pointer; border-radius: 0.5rem; transition: background 0.2s; display:inline-block; }
        .dropdown:hover .dropbtn { color: #4F46E5; background: rgba(79, 70, 229, 0.05); }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
`;

const newNavUl = `<ul>
            <li><a href="dashboard.html">대시보드</a></li>
            <li class="dropdown">
                <span class="dropbtn">내부운영(HR) ▾</span>
                <div class="dropdown-content">
                    <a href="tasks.html">업무지시/보고</a>
                    <a href="finance.html">재무/회계</a>
                    <a href="employees.html">직원목록</a>
                </div>
            </li>
            <li class="dropdown">
                <span class="dropbtn">영업/프로젝트 ▾</span>
                <div class="dropdown-content">
                    <a href="projects.html">프로젝트 보드</a>
                    <a href="materials.html">자재관리</a>
                    <a href="suppliers.html">협력업체</a>
                </div>
            </li>
            <li class="dropdown">
                <span class="dropbtn">고객/회원관리 ▾</span>
                <div class="dropdown-content">
                    <a href="clients.html">고객 리스트</a>
                    <a href="contacts.html">인맥(명함)</a>
                    <a href="users.html">SaaS 회원관리</a>
                </div>
            </li>
        </ul>`;

const files = fs.readdirSync('admin').filter(f => f.endsWith('.html'));

files.forEach(file => {
    let content = fs.readFileSync('admin/' + file, 'utf8');
    
    // To handle edge cases where the DOM might be slightly different in dashboard vs others
    const ulMatch = content.match(/<ul>[\s\S]*?<\/ul>/);
    if(ulMatch && ulMatch[0].includes('대시보드') && ulMatch[0].includes('프로젝트')) {
        content = content.replace(ulMatch[0], newNavUl);
    }
    
    // Inject dropdown CSS
    if(!content.includes('.dropdown-content')) {
        content = content.replace('</style>', newNavCss + '\n    </style>');
    }
    
    // Add active class dynamically via JS
    if(!content.includes('highlightActiveMenu()')) {
        content = content.replace('</body>', `<script>
            function highlightActiveMenu() {
                const current = location.pathname.split('/').pop() || 'dashboard.html';
                document.querySelectorAll('.top-nav a').forEach(a => {
                    const href = a.getAttribute('href');
                    if (href && href === current) {
                        a.style.color = 'var(--primary-color, #4F46E5)';
                        a.style.fontWeight = '700';
                        const parentDropBtn = a.closest('.dropdown');
                        if (parentDropBtn) {
                            parentDropBtn.querySelector('.dropbtn').style.color = 'var(--primary-color, #4F46E5)';
                            parentDropBtn.querySelector('.dropbtn').style.background = 'rgba(79, 70, 229, 0.05)';
                        }
                    } else if (a.classList.contains('active') && href !== current) {
                        a.classList.remove('active');
                    }
                });
            }
            document.addEventListener('DOMContentLoaded', highlightActiveMenu);
        </script></body>`);
    }

    fs.writeFileSync('admin/' + file, content, 'utf8');
    console.log("Updated", file);
});
