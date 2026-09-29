const fs = require('fs');

let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/dashboard.html', 'utf8');

// Add IDs
html = html.replace('<div class="metric-value">4.8억</div>', '<div class="metric-value" id="dashValRevenue">로딩중</div>');
html = html.replace('<div class="metric-value">8.2K <span style="font-size:0.9rem; color:var(--text-muted);">만</span></div>', '<div class="metric-value" id="dashValProfit">로딩중</div>');
html = html.replace('<div class="metric-value">183개</div>', '<div class="metric-value" id="dashValClients">로딩중</div>');

const scriptLogic = `
    <!-- AI Chat Module -->
    <script type="module" src="../assets/js/ai-chat.js"></script>
    <script type="module">
        import { checkAdminAuth } from '../assets/js/auth.js';
        import { db } from '../assets/js/firebase-config.js';
        import { collection, getDocs } from 'firebase/firestore';

        function formatK(val) {
            if (val === 0) return '0 <span>VND</span>';
            const v = Math.abs(val);
            let str = '';
            if (v >= 100000000) str = (v / 100000000).toFixed(1) + '억';
            else if (v >= 10000) str = (v / 10000).toFixed(0) + '<span style="font-size:0.9rem; color:var(--text-muted);">만</span>';
            else str = new Intl.NumberFormat('ko-KR').format(v);
            return (val < 0 ? '-' : '') + str;
        }

        checkAdminAuth(async (user) => {
            try {
                // 직원수
                const empSnap = await getDocs(collection(db, 'employees'));
                document.getElementById('empCount').textContent = empSnap.size + '명';

                // 프로젝트수
                const projSnap = await getDocs(collection(db, 'projects'));
                document.getElementById('projCount').textContent = projSnap.size + '개';

                // 거래처 (고객 + 협력사 + 인맥)
                const clientSnap = await getDocs(collection(db, 'clients'));
                // Just fallback to counts if collections exist 
                // Using try catch deeply just in case collection doesn't exist
                let totalC = clientSnap.size;
                document.getElementById('dashValClients').textContent = totalC + '개'; 
                // It's ok to just show client size, or we can fetch contacts too
                try { totalC += (await getDocs(collection(db, 'suppliers'))).size; } catch(e){}
                try { totalC += (await getDocs(collection(db, 'contacts'))).size; } catch(e){}
                document.getElementById('dashValClients').textContent = totalC + '개'; 

                // 재무 연동
                const finSnap = await getDocs(collection(db, 'financeRecords'));
                let income = 0; let receivable = 0; let expense = 0; let payable = 0;
                
                let virtualPayroll = 0;
                empSnap.forEach(e => {
                    const s = Number(e.data().salary) || 0;
                    virtualPayroll += s;
                });
                payable += virtualPayroll;

                finSnap.forEach(doc => {
                    const d = doc.data();
                    const amt = Number(d.amount) || 0;
                    if(d.type === 'INCOME') income += amt;
                    else if(d.type === 'RECEIVABLE') receivable += amt;
                    else if(d.type === 'EXPENSE') expense += amt;
                    else if(d.type === 'PAYABLE') payable += amt;
                });

                const estRevenue = income + receivable;
                const estProfit = estRevenue - (expense + payable);

                document.getElementById('dashValRevenue').innerHTML = formatK(estRevenue);
                document.getElementById('dashValProfit').innerHTML = formatK(estProfit);

            } catch(e) {
                console.error("Dashboard Load Error:", e);
            }
        }, () => { window.location.href = '../login.html'; });
    </script>
`;

html = html.replace('<!-- AI Chat Module -->\r\n    <script type="module" src="../assets/js/ai-chat.js"></script>', scriptLogic);
// Handle LF vs CRLF
html = html.replace('<!-- AI Chat Module -->\n    <script type="module" src="../assets/js/ai-chat.js"></script>', scriptLogic);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/dashboard.html', html, 'utf8');
console.log('Dashboard logic injected');
