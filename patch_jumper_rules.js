const fs = require('fs');
let jRules = fs.readFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', 'utf8');

const oldIsCeo = `function isCEO() {
      return isAuthenticated() && (
        request.auth.token.email == 'daguri75@gmail.com' ||
        getUserData().role == 'SUPER_ADMIN' ||
        getUserData().role == 'CEO'
      );
    }`;
const newIsCeo = `function isCEO() {
      return isAuthenticated() && (
        request.auth.token.email == 'daguri75@gmail.com' ||
        getUserData().role == 'SUPER_ADMIN' ||
        getUserData().role == 'CEO' ||
        getUserData().merchantId != null
      );
    }`;

const oldIsStaff = `function isStaff() {
      return isAuthenticated() && (
        request.auth.token.email == 'daguri75@gmail.com' ||
        getUserData().role in ['SUPER_ADMIN', 'CEO', 'ADMIN', 'STAFF']
      );
    }`;
const newIsStaff = `function isStaff() {
      return isAuthenticated() && (
        request.auth.token.email == 'daguri75@gmail.com' ||
        getUserData().role in ['SUPER_ADMIN', 'CEO', 'ADMIN', 'STAFF'] ||
        getUserData().merchantId != null
      );
    }`;

if (jRules.includes("getUserData().role == 'SUPER_ADMIN'")) {
    jRules = jRules.replace(oldIsCeo, newIsCeo);
    jRules = jRules.replace(oldIsStaff, newIsStaff);
    fs.writeFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', jRules, 'utf8');
}
