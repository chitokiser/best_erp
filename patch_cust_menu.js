const fs = require('fs');
const file = 'customer-menu.html';
let html = fs.readFileSync(file, 'utf8');

// Replace the placeholder image with actual image
html = html.replace(/<div class="menu-img">📷<\/div>/g, 
"`<div class=\"menu-img\" style=\"background-image:url('${m.imageUrl||''}'); background-size:cover; background-position:center;\">${!m.imageUrl ? '📷' : ''}</div>`");

// Also fix the dropdown JS in the top-nav for all pages. Wait, customer-menu.html doesn't have top-nav dropdowns, so it's fine.
fs.writeFileSync(file, html, 'utf8');
