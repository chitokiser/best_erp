const fs = require('fs');

let html = fs.readFileSync('admin/contacts.html', 'utf8');

const t2 = `                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>💡 <strong>AI 명함 스캔:</strong> 카메라로 명함을 찍거나 업로드하면 AI가 자동 입력합니다.</span>
                        <input type="file" id="ocrInput" accept="image/*" capture="environment" style="display:none;" />
                        <button type="button" onclick="document.getElementById('ocrInput').click()"
                            style="background:var(--ai-gradient); color:white; border:none; border-radius:0.3rem; padding:0.4rem 0.8rem; cursor:pointer; font-weight:bold; font-size:0.8rem;">📸
                            스캔하기</button>
                    </div>`;

const r2 = `                    <div style="display:flex; flex-direction:column; gap:0.5rem;">
                        <span style="font-size:0.9rem;">💡 <strong>AI 명함 스캔:</strong> 명함을 찍거나 기존 사진을 첨부하세요.</span>
                        <div style="display:flex; gap:0.5rem; justify-content:center;">
                            <input type="file" id="ocrCamera" accept="image/*" capture="environment" style="display:none;" />
                            <input type="file" id="ocrGallery" accept="image/*" style="display:none;" />
                            <button type="button" onclick="document.getElementById('ocrCamera').click()"
                                style="background:var(--ai-gradient); color:white; border:none; border-radius:0.3rem; padding:0.5rem 1rem; cursor:pointer; font-weight:bold; font-size:0.9rem; flex:1;">📸 촬영하기</button>
                            <button type="button" onclick="document.getElementById('ocrGallery').click()"
                                style="background:#10B981; color:white; border:none; border-radius:0.3rem; padding:0.5rem 1rem; cursor:pointer; font-weight:bold; font-size:0.9rem; flex:1;">🖼️ 앨범에서 선택</button>
                        </div>
                    </div>`;

if (html.includes('id="ocrInput"')) {
    html = html.replace(t2, r2);
} else {
    console.log("ocrInput not found in HTML, probably already fixed or mismatch");
}
fs.writeFileSync('admin/contacts.html', html, 'utf8');

let js = fs.readFileSync('assets/js/contacts.js', 'utf8');
const searchFor = `    const ocrInput = document.getElementById('ocrInput');

    if (ocrInput) {
        ocrInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;`;

const replaceWith = `    const ocrInputs = [document.getElementById('ocrCamera'), document.getElementById('ocrGallery')];

    ocrInputs.forEach(input => {
      if (input) {
        input.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;`;

if (js.includes("document.getElementById('ocrInput')")) {
    js = js.replace(searchFor, replaceWith);
    js = js.replace(/        \}\);\n    \}/g, "        });\n      }\n    });");
    fs.writeFileSync('assets/js/contacts.js', js, 'utf8');
    console.log("Fixed JS");
} else {
    console.log("JS already fixed or mismatch");
}

