const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
const brandRule = `
    match /system_branding/{tenantId} {
      allow read: if isAuthenticated();
      allow write: if isCEO();
    }
`;
rules = rules.replace(/match \/tasks\/\{taskId\}/, brandRule.trim() + '\n\n    match /tasks/{taskId}');
fs.writeFileSync('firestore.rules', rules, 'utf8');

// Do the same for jumper_v10 rules
let jRules = fs.readFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', 'utf8');
jRules = jRules.replace(/match \/tasks\/\{taskId\}/, brandRule.trim() + '\n\n    match /tasks/{taskId}');
fs.writeFileSync('C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules', jRules, 'utf8');
