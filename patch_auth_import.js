const fs = require('fs');
let js = fs.readFileSync('assets/js/auth.js', 'utf8');

js = js.replace("getDocs, addDoc, serverTimestamp } from 'firebase/firestore';", "getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';");

fs.writeFileSync('assets/js/auth.js', js, 'utf8');
