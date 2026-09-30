const fs = require('fs');
let js = fs.readFileSync('assets/js/contacts.js', 'utf8');

js = js.replace("const ocrInput = document.getElementById('ocrInput');", "const ocrInputs = [document.getElementById('ocrCamera'), document.getElementById('ocrGallery')];");

js = js.replace(/if\s*\(ocrInput\)\s*\{\s*ocrInput.addEventListener\('change'/g, "ocrInputs.forEach(input => { if (input) { input.addEventListener('change'");

// Replace the end
js = js.replace(/ {8}\}\);\n    \}\n\}\);/g, "        });\n      }\n    });\n});");
// To be extremely safe, I'll just check if it was replaced.

fs.writeFileSync('assets/js/contacts.js', js, 'utf8');
