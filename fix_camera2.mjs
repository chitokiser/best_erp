import fs from 'fs';
let c = fs.readFileSync('mobile-task.html', 'utf8');

c = c.replace(
    `<div class="ai-upload-box" id="aiUploadTrigger">`,
    `<div class="ai-upload-box" id="aiUploadTrigger" style="position:relative; overflow:hidden;">
        <!-- Hidden but actually clickable file input for strict mobile browsers -->
        <input type="file" id="mobilePhotoInput" accept="image/*" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer;" />`
);

c = c.replace(
    `<!-- System Hidden File Input (supports camera on mobile) -->\n            <input type="file" id="mobilePhotoInput" accept="image/*" capture="environment" />`,
    ``
);

// We don't even need `uploadTrigger.addEventListener('click', ...)` anymore because they click the file input directly, but keeping it doesn't hurt.
fs.writeFileSync('mobile-task.html', c);
