const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace(/const q = query\(collection\(db, 'users'\), where\('email', '==', user\.email\)\);\s*const snap = await getDocs\(q\);/, 
`const snap = await getDoc(doc(db, 'users', user.uid));`);

js = js.replace(/!snap\.empty/g, 'snap.exists()');
js = js.replace(/snap\.empty/g, '!snap.exists()');

js = js.replace(/const data = snap\.docs\[0\]\.data\(\);/g, 'const data = snap.data();');

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
