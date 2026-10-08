const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace("const q = query(collection(db, 'users'), where('email', '==', user.email));\n                const snap = await getDocs(q);", 
`const userRef = doc(db, 'users', user.uid);
                const snap = await getDoc(userRef);`);

js = js.replace('if (snap.empty && user.email === \'daguri75@gmail.com\') {', 'if (!snap.exists() && user.email === \'daguri75@gmail.com\') {');

js = js.replace('} else if (!snap.empty) {', '} else if (snap.exists()) {');
js = js.replace('if (!snap.empty) {', 'if (snap.exists()) {'); // for the second block!

js = js.replace('const data = snap.docs[0].data();', 'const data = snap.data();');
js = js.replace('const data = snap.docs[0].data();', 'const data = snap.data();'); // in case there are multiple

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
