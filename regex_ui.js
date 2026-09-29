const fs = require('fs');

let html = fs.readFileSync('admin/contacts.html', 'utf8');

const r2 = `                    <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom: 0.5rem;">
                        <span style="font-size:0.85rem; color:#475569;">💡 <strong>AI 명함 스캔:</strong> 카메라 촬영 또는 기기 앨범에서 사진을 불러와주세요.</span>
                        <div style="display:flex; gap:0.5rem; justify-content:center;">
                            <input type="file" id="ocrCamera" accept="image/*" capture="environment" style="display:none;" />
                            <input type="file" id="ocrGallery" accept="image/*" style="display:none;" />
                            <button type="button" onclick="document.getElementById('ocrCamera').click()"
                                style="background:var(--ai-gradient); color:white; border:none; border-radius:0.3rem; padding:0.5rem 1rem; cursor:pointer; font-weight:bold; font-size:0.9rem; flex:1;">📸 촬영 켜기</button>
                            <button type="button" onclick="document.getElementById('ocrGallery').click()"
                                style="background:#10B981; color:white; border:none; border-radius:0.3rem; padding:0.5rem 1rem; cursor:pointer; font-weight:bold; font-size:0.9rem; flex:1;">🖼️ 앨범 선택</button>
                        </div>
                    </div>`;

html = html.replace(/<div style="display:flex; justify-content:space-between; align-items:center;">[\s\S]*?스캔하기<\/button>\s*<\/div>/i, r2);
fs.writeFileSync('admin/contacts.html', html, 'utf8');


let js = fs.readFileSync('assets/js/contacts.js', 'utf8');
const searchFor = "const ocrInput = document.getElementById('ocrInput');";
const replaceWith = "const ocrInputs = [document.getElementById('ocrCamera'), document.getElementById('ocrGallery')];";

if (js.includes(searchFor)) {
    js = js.replace(searchFor, replaceWith);

    const bindTarget = /if\s*\(ocrInput\)\s*\{\s*ocrInput\.addEventListener\('change',\s*async\s*\(e\)\s*=>\s*\{/i;
    const bindReplace = `ocrInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', async (e) => {`;

    js = js.replace(bindTarget, bindReplace);

    const endTarget = /reader\.readAsDataURL\(\s*file\s*\);\s*\}\);\s*\}/i;
    const endReplace = `reader.readAsDataURL(file);\n        });\n      }\n    });`;
    js = js.replace(endTarget, endReplace);

    fs.writeFileSync('assets/js/contacts.js', js, 'utf8');
    console.log("Fixed JS");
} else {
    console.log("JS not found");
}
