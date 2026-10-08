const fs = require('fs');
let html = fs.readFileSync('admin/dashboard.html', 'utf8');

const staticReportRegex = /<div class="panel">\s*<h3 class="section-header" style="font-size: 1rem;">AI Daily Report[\s\S]*?<\/div>/m;
const newReportBlock = `<div class="panel">
                <h3 class="section-header" style="font-size: 1rem; display: flex; justify-content: space-between; align-items: center;">
                    <span>AI Daily Report <span style="color:#64748b; font-size:0.75rem; font-weight:400;" id="aiReportDate"></span></span>
                    <button class="btn-primary" id="btnGenerateAiReport" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;">🔄 실시간 리포트 생성</button>
                </h3>
                <div id="aiDailyReportContent" style="padding-left: 0.5rem; color: #475569; font-size: 0.9rem; line-height: 1.8;">
                    <p style="color:var(--text-muted);">우측 '생성' 버튼을 눌러 오늘 회사의 주요 지표를 AI로 분석하세요.</p>
                </div>
            </div>`;

html = html.replace(staticReportRegex, newReportBlock);

const newAiScript = `
        <script type="module">
        import { db } from '../assets/js/firebase-config.js';
        import { getDocs, query, collection, where } from 'firebase/firestore';
        
        document.addEventListener('DOMContentLoaded', () => {
            const today = new Date();
            const dateEl = document.getElementById('aiReportDate');
            if(dateEl) dateEl.innerText = today.toLocaleDateString();

            const btnGenerate = document.getElementById('btnGenerateAiReport');
            const reportContent = document.getElementById('aiDailyReportContent');
            
            if(btnGenerate) {
                btnGenerate.addEventListener('click', async () => {
                    btnGenerate.disabled = true;
                    btnGenerate.innerText = '분석중...';
                    
                    try {
                        const aiLogic = await import('../assets/js/aiApi.js');
                        const tId = window.tenantId || 'system_master';
                        const pSnap = await getDocs(query(collection(db, 'projects'), where('tenantId', '==', tId)));
                        const tSnap = await getDocs(query(collection(db, 'tasks'), where('tenantId', '==', tId)));
                        
                        let dataCtx = {
                            totalProjects: pSnap.size,
                            totalTasks: tSnap.size
                        };
                        
                        const prompt = "대표님을 위한 브리핑을 해주세요. (총 프로젝트 수: " + dataCtx.totalProjects + ", 결재문서 수: " + dataCtx.totalTasks + "). 짧고 강렬하게, 3가지 불릿 포인트로 오늘 집중해야 할 사항을 제안하고 무한한 성장 가능성을 격려해주세요.";
                        const result = await aiLogic.callGeminiAI(dataCtx, prompt);
                        
                        reportContent.innerHTML = result.replace(/\\n/g, '<br>').replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
                    } catch(e) {
                         console.error(e);
                         reportContent.innerHTML = '<span style="color:red">보고서 요약 중 오류가 발생했습니다.</span>';
                    }
                    btnGenerate.innerText = '🔄 생성 완료';
                    btnGenerate.disabled = false;
                });
            }
        });
        </script>
`;

html = html.replace('</body>', newAiScript + '\n</body>');
fs.writeFileSync('admin/dashboard.html', html, 'utf8');
console.log("Successfully patched admin/dashboard.html for AI Report");
