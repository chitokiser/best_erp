const fs = require('fs');
const jumperRulesPath = 'C:/Users/Asus/Desktop/project/jumper/jumper_v10/firestore.rules';
const erpRulesPath = 'firestore.rules';
const jumperRules = fs.readFileSync(jumperRulesPath, 'utf8');
const erpRules = fs.readFileSync(erpRulesPath, 'utf8');
const erpMatch = erpRules.match(/match \/databases\/\{database\}\/documents \{([\s\S]+?)\}\n\}/);
if (!erpMatch) { console.log('Could not parse ERP rules'); process.exit(1); }
let erpContent = erpMatch[1];
erpContent = erpContent.replace(/match \/\{document=\*\*\} \{[\s\S]*?allow read, write: if isCEO\(\);\s*\}/, '');
let mergedRules = jumperRules.replace(/match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/, '\n    // ------ BEST ERP SAAS RULES ------\n' + erpContent + '\n    // ------ END BEST ERP SAAS RULES ------\n\n    match /{document=**} {\n      allow read, write: if false;\n    }');
fs.writeFileSync(jumperRulesPath, mergedRules, 'utf8');
console.log('Successfully merged ERP rules into Jumper firestore.rules');
