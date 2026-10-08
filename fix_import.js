const fs = require('fs');
const jsPath = 'assets/js/employees.js';
let js = fs.readFileSync(jsPath, 'utf8');

js = js.replace(
    /import \{ collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp \} from 'firebase\/firestore';/,
    "import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';"
);

// I should also make sure they aren't somehow duplicated or missed:
if (!js.includes('import { collection, getDocs,')) {
    // maybe formatted differently
    js = js.replace(
        /import\s+\{[\s\S]*?\}\s+from\s+'firebase\/firestore';/,
        "import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';"
    );
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('Fixed imports in employees.js');
