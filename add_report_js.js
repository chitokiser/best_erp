const fs = require('fs');

let c = fs.readFileSync('assets/js/admin/tasks.js', 'utf8');

const jsCode = `
    const employeeActionSection = document.getElementById('employeeActionSection');
    const reportContent = document.getElementById('reportContent');
    const reportProgress = document.getElementById('reportProgress');
    const btnSubmitReport = document.getElementById('btnSubmitReport');

    // Authority Check for Employee Reporting
    if (currentUserInfo.uid === data.assignedTo) {
        employeeActionSection.style.display = 'block';
        reportProgress.value = data.progress || 0;

        btnSubmitReport.addEventListener('click', async () => {
            const content = reportContent.value.trim();
            const prog = parseInt(reportProgress.value, 10);

            if (!content) {
                alert("진행 내용을 입력해주세요.");
                return;
            }
            if (isNaN(prog) || prog < 0 || prog > 100) {
                alert("진행률은 0에서 100 사이의 숫자로 입력해주세요.");
                return;
            }

            btnSubmitReport.disabled = true;
            btnSubmitReport.innerText = '제출 중...';

            try {
                let newStatus = prog === 100 ? 'COMPLETED' : 'IN_PROGRESS';
                
                await submitTaskReport(taskId, {
                    content: content,
                    progress: prog,
                    submittedBy: currentUserInfo.uid,
                    submittedByName: currentUserInfo.name || currentUserInfo.email
                });

                await updateTask(taskId, currentUserInfo.uid, {
                    status: newStatus,
                    progress: prog
                });

                alert("업무 보고가 완료되었습니다.");
                reportContent.value = '';
            } catch (err) {
                console.error("보고 실패:", err);
                alert("보고 제출 중 오류가 발생했습니다.");
            } finally {
                btnSubmitReport.disabled = false;
                btnSubmitReport.innerText = '보고 제출';
            }
        });
    }

    loadTaskTimeline(taskId);`;

c = c.replace(/    loadTaskTimeline\(taskId\);/, jsCode);
fs.writeFileSync('assets/js/admin/tasks.js', c, 'utf8');
console.log('Added report JS to tasks.js');
