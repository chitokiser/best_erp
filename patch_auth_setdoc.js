const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace("await addDoc(collection(db, 'users'), {", "await setDoc(doc(db, 'users', user.uid), {");

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
