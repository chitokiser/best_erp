const fs = require('fs');
let html = fs.readFileSync('admin/menus.html', 'utf8');

const targetModalImage = `<label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#334155;">메뉴명 <span style="color:red">*</span></label>`;
const replaceModalImage = `<label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#334155;">메뉴 사진 (옵션)</label>
            <input type="file" id="mImageFile" accept="image/*" style="margin-bottom:1rem; width:100%;">
            
            <label style="display:block; margin-bottom:0.5rem; font-weight:600; color:#334155;">메뉴명 <span style="color:red">*</span></label>`;

if(!html.includes('mImageFile')) {
    html = html.replace(targetModalImage, replaceModalImage);
}
fs.writeFileSync('admin/menus.html', html, 'utf8');

let js = fs.readFileSync('assets/js/admin-menus.js', 'utf8');

// Inside HTML generating card
js = js.replace(/<div class="menu-img">📷 이미지 준비중<\/div>/g, 
"`<div class=\"menu-img\" style=\"background-image:url('${m.imageUrl||''}'); background-size:cover; background-position:center;\">${!m.imageUrl ? '📷 준비중' : ''}</div>`");

js = js.replace(/document.getElementById\('mName'\).value = '';/g,
"document.getElementById('mName').value = '';\ndocument.getElementById('mImageFile').value = '';");

const saveTarget = `const data = {
        name, desc, price, category: cat, tags,
        updatedAt: serverTimestamp()
    };`;

const saveReplace = `const data = {
        name, desc, price, category: cat, tags,
        updatedAt: serverTimestamp()
    };
    
    // Read Image Base64
    const imgFile = document.getElementById('mImageFile').files[0];
    if (imgFile) {
        const reader = new FileReader();
        await new Promise((resolve) => {
            reader.onload = (e) => { data.imageUrl = e.target.result; resolve(); };
            reader.readAsDataURL(imgFile);
        });
    }`;

if(!js.includes('mImageFile')) {
    js = js.replace(saveTarget, saveReplace);
    fs.writeFileSync('assets/js/admin-menus.js', js, 'utf8');
}
