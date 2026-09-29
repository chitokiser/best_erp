const fs = require('fs');
let code = fs.readFileSync('assets/js/ai-chat.js', 'utf8');

code = code.replace("document.getElementById('projCount').textContent =", "const pc = document.getElementById('projCount'); if (pc) pc.textContent =");

// Safely wrap listeners
code = code.replace("btnAiAnalyze.addEventListener(", "if(btnAiAnalyze) btnAiAnalyze.addEventListener(");
code = code.replace("aiQueryInput.addEventListener(", "if(aiQueryInput) aiQueryInput.addEventListener(");

fs.writeFileSync('assets/js/ai-chat.js', code, 'utf8');
console.log('Fixed ai-chat.js');
