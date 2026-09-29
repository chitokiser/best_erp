const fs = require('fs');

// 1. employees.html
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', 'utf8');

const eLabelOld = '<label>급여 (연봉/월급)</label>';
const eLabelNew = '<label>월 급여 (VND)</label>';
html = html.replace(eLabelOld, eLabelNew);

const eInputOld = 'id="empSalary" placeholder="예: 5,000만원 또는 월 400만원"';
const eInputNew = 'type="number" id="empSalary" placeholder="예: 25000000 (숫자만)" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.5rem; box-sizing: border-box;"';
html = html.replace(eInputOld, eInputNew);

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/employees.html', html, 'utf8');

// 2. employees.js
let eJs = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', 'utf8');
const salaryOld = `salary: document.getElementById('empSalary').value,`;
const salaryNew = `salary: Number(document.getElementById('empSalary').value) || 0,`;
eJs = eJs.replace(salaryOld, salaryNew);

// update format in table too
const formatFunc = `
function formatVND(val) {
    if(!val) return '-';
    return new Intl.NumberFormat('ko-KR').format(val) + ' VND';
}`;
if (!eJs.includes('formatVND')) {
    eJs = eJs + '\n' + formatFunc;
    const loadSalaryOld = `<div style="font-weight:600; color:var(--ai-primary);">\${data.salary || '-'}</div>`;
    const loadSalaryNew = `<div style="font-weight:600; color:var(--ai-primary);">\${formatVND(data.salary)}</div>`;
    eJs = eJs.replace(loadSalaryOld, loadSalaryNew);
}
fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/employees.js', eJs, 'utf8');

// 3. finance.js -> dynamically load employees and inject payrolls for this month
let fJs = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/finance.js', 'utf8');

const regexFinanceLoad = /const snap = await getDocs\(collection\(db, 'financeRecords'\)\);/m;
const financeLoadNew = `const snap = await getDocs(collection(db, 'financeRecords'));
        // DYNAMIC VIRTUAL PAYROLL INJECTION!
        const empSnap = await getDocs(collection(db, 'employees'));
        const now = new Date();
        const curYYYYMM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        const payDate = curYYYYMM + '-25'; // Assume payday is 25th
        
        let virtualPayrolls = [];
        empSnap.forEach(e => {
            const edata = e.data();
            if (edata.salary && Number(edata.salary) > 0) {
                virtualPayrolls.push({
                    id: 'virtual_payroll_' + e.id,
                    type: 'PAYABLE',
                    category: '인건비/급여',
                    amount: Number(edata.salary),
                    date: payDate,
                    partner: (edata.name || '직원') + ' (' + (edata.position||'') + ')',
                    project: '본사 공통',
                    memo: \`[시스템 자동생성] \${now.getMonth()+1}월 정기 급여 지급예정\`
                });
            }
        });`;
if (!fJs.includes('virtualPayrolls')) {
    fJs = fJs.replace(regexFinanceLoad, financeLoadNew);

    // push them into records array
    const recordPushRegex = /snap\.forEach\(doc => \{ records\.push\(\{ id: doc\.id, \.\.\.doc\.data\(\) \}\); \}\);/m;
    const recordPushNew = `snap.forEach(doc => { records.push({ id: doc.id, ...doc.data() }); });
        // merge virtual records
        records = records.concat(virtualPayrolls);`;
    fJs = fJs.replace(recordPushRegex, recordPushNew);
}

fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/assets/js/finance.js', fJs, 'utf8');
console.log('Done');
