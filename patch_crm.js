const fs = require('fs');
let js = fs.readFileSync('assets/js/admin-crm.js', 'utf8');

const regex = /storedMentees = mentees;\s*renderMentees\(\);/;
const replacement = `// Augment missing emails from DB
        const { doc, getDoc } = await import('firebase/firestore');
        for (let i = 0; i < mentees.length; i++) {
            if (!mentees[i].email && mentees[i].uid) {
                try {
                    const snap = await getDoc(doc(db, 'users', mentees[i].uid));
                    if (snap.exists()) {
                        mentees[i].email = snap.data().email || "";
                        if (!mentees[i].name) mentees[i].name = snap.data().name || "";
                    }
                } catch(err) { /* ignore */ }
            }
        }

        storedMentees = mentees;
        renderMentees();`;

js = js.replace(regex, replacement);
fs.writeFileSync('assets/js/admin-crm.js', js, 'utf8');
