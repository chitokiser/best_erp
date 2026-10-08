const fs = require('fs');
let c = fs.readFileSync('firestore.rules', 'utf8');

const newRule = `    function getUserData() {
      let docPath = /databases/$(database)/documents/users/$(request.auth.uid);
      return exists(docPath) ? get(docPath).data : {"role": "EMPLOYEE"};
    }`;

c = c.replace(/    function getUserData\(\) \{[\s\S]*?\}\n/, newRule + '\n');
fs.writeFileSync('firestore.rules', c, 'utf8');
console.log('Rules updated');
