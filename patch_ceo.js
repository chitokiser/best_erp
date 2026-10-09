const fs = require('fs');

let html = fs.readFileSync('admin/users.html', 'utf8');

// I will add the CEO role option to the HTML modal.

const targetHtml = `<div class="role-option" onclick="selectRole('ADMIN')" id="opt-ADMIN">`;
const repHtml = `<div class="role-option" onclick="selectRole('CEO')" id="opt-CEO">
                <h4>독립 기업/가맹점 대표 (CEO) <span style="font-size:1.2rem;">��</span></h4>
                <p>본인만의 완벽히 독립된 ERP 인프라(별도 테넌트)를 운영할 수 있는 최고 권한입니다.</p>
            </div>
            
            <div class="role-option" onclick="selectRole('ADMIN')" id="opt-ADMIN">`;

html = html.replace(targetHtml, repHtml);

// And update the JavaScript logic for CEO role

const targetJs = `if (selectedRole === 'ADMIN' || selectedRole === 'STAFF') {
                    updateData.tenant_id = 'system_master'; // Bond them to the Super Admin's workspace!
                }`;
                
const repJs = `if (selectedRole === 'ADMIN' || selectedRole === 'STAFF') {
                    updateData.tenant_id = 'system_master'; // Bond them to the Super Admin's workspace!
                } else if (selectedRole === 'CEO') {
                    updateData.tenant_id = currentlyEditingUserId; // Isolate them to their own personal workspace!
                }`;

html = html.replace(targetJs, repJs);

// Fix initial selection
html = html.replace(`const initialRole = ['ADMIN', 'STAFF'].includes(currentRole?.toUpperCase()) ? currentRole.toUpperCase() : 'VIEWER';`, 
`const initialRole = ['CEO', 'ADMIN', 'STAFF'].includes(currentRole?.toUpperCase()) ? currentRole.toUpperCase() : 'VIEWER';`);

fs.writeFileSync('admin/users.html', html, 'utf8');
