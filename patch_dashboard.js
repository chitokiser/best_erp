const fs = require('fs');
let html = fs.readFileSync('admin/dashboard.html', 'utf8');

const metricsGridRegex = /<div class="metrics-grid">[\s\S]*?<!-- Charts Section -->/m;
const newMetricsGrid = `<div class="metrics-grid">
                <!-- 1. 프로젝트 평점 (또는 AI 요약 점수) -->
                <div class="metric-card ai-focus">
                    <div class="metric-title">프로젝트 평점 (내부 평가)</div>
                    <div class="metric-value"><span id="metricAiScore">5.0</span> <span style="font-size: 1rem; font-weight: 400; opacity: 0.8;">점</span></div>
                    <div style="font-size: 0.75rem; background: rgba(255,255,255,0.2); display: inline-block; padding: 0.25rem 0.5rem; border-radius: 1rem; margin-top: 0.5rem;">최우수 등급 유지 중</div>
                </div>
                <!-- 2. 진행중 프로젝트 -->
                <div class="metric-card">
                    <div class="metric-title">진행중인 프로젝트</div>
                    <div class="metric-value"><span id="metricProjectCount">0</span><span style="font-size:1rem;">개</span></div>
                    <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.5rem;" id="metricProjectDesc">정상 0 · 주의 0</div>
                </div>
                <!-- 3. 결재 대기 문서 -->
                <div class="metric-card">
                    <div class="metric-title">결재 대기 문서</div>
                    <div class="metric-value"><span id="metricTasksCount">0</span><span style="font-size:1rem;">건</span></div>
                    <div style="font-size: 0.75rem; color: var(--warning); margin-top: 0.5rem;">즉시 확인 및 승인 요망</div>
                </div>
                <!-- 4. 현장 이슈 -->
                <div class="metric-card">
                    <div class="metric-title">현장 이슈 (미해결)</div>
                    <div class="metric-value"><span id="metricIssueCount">0</span><span style="font-size:1rem;">건</span></div>
                    <div style="font-size: 0.75rem; color: var(--danger); margin-top: 0.5rem;">공정 지연 리스크 주의</div>
                </div>
            </div>

            <!-- Charts Section -->`;

html = html.replace(metricsGridRegex, newMetricsGrid);

const initLiveDashboardRegex = /const initLiveDashboard = \(\) => \{[\s\S]*?            \}\);\s*\n\s*\};\s*\n\s*document\.addEventListener/m;
const newInitLiveDashboard = `const initLiveDashboard = () => {
            const ctxLive = document.getElementById('liveProjectChart').getContext('2d');
            liveProjectChart = new Chart(ctxLive, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: '진행률(%)',
                        data: [],
                        backgroundColor: '#4F46E5',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    animation: { duration: 800, easing: 'easeOutQuart' },
                    scales: { y: { beginAtZero: true, max: 100 } }
                }
            });

            const tId = window.tenantId || 'system_master';
            
            // 1. Projects Query
            const qProjects = query(collection(db, 'projects'), where('tenantId', '==', tId));
            onSnapshot(qProjects, (snapshot) => {
                const labels = [];
                const data = [];
                let inProgress = 0;
                let normal = 0;
                let warning = 0;

                snapshot.forEach((doc) => {
                    const project = doc.data();
                    if (project.status !== '완료' && project.status !== 'COMPLETED') {
                        inProgress++;
                        const prog = project.progress || 0;
                        if(prog < 30) warning++;
                        else normal++;

                        labels.push(project.name || '무제');
                        data.push(prog);
                    }
                });

                const elCount = document.getElementById('metricProjectCount');
                if(elCount) elCount.innerText = inProgress;
                
                const elDesc = document.getElementById('metricProjectDesc');
                if(elDesc) elDesc.innerHTML = '<span style="color:var(--success)">정상 ' + normal + '</span> · <span style="color:var(--warning)">주의/위험 ' + warning + '</span>';

                liveProjectChart.data.labels = labels;
                liveProjectChart.data.datasets[0].data = data;
                liveProjectChart.data.datasets[0].backgroundColor = data.map(val =>
                    val < 30 ? '#EF4444' : (val < 70 ? '#F59E0B' : '#10B981')
                );
                liveProjectChart.update();
            });

            // 2. Tasks/Approvals Query
            const qTasks = query(collection(db, 'tasks'), where('tenantId', '==', tId), where('status', 'in', ['PENDING', '진행중']));
            onSnapshot(qTasks, (snapshot) => {
                const el = document.getElementById('metricTasksCount');
                if (el) el.innerText = snapshot.size;
            });

            // 3. Site Issues Query
            const qIssues = query(collection(db, 'siteLogs'), where('tenantId', '==', tId), where('type', '==', 'ISSUE'));
            onSnapshot(qIssues, (snapshot) => {
                let unresolved = 0;
                snapshot.forEach(doc => {
                    if (doc.data().status !== 'RESOLVED' && doc.data().status !== '해결됨') unresolved++;
                });
                const el = document.getElementById('metricIssueCount');
                if(el) el.innerText = unresolved;
            });
        };

        document.addEventListener`;

html = html.replace(initLiveDashboardRegex, newInitLiveDashboard);
fs.writeFileSync('admin/dashboard.html', html, 'utf8');
console.log("Successfully patched admin/dashboard.html");
