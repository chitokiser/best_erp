import fs from 'fs';

let html = fs.readFileSync('materials.html', 'utf8');

// Replace the material-card structure with material-list-item horizontal structure
html = html.replace(/<div class="material-card".*?>[\s\S]*?<\/div>\s*<\/div>/g,
    `<div class="material-list-item" onclick="window.openDetail('\${m.id}')">
            \${imgUrl ? \`<div class="list-img-wrapper"><img src="\${imgUrl}" alt="\${m.name}" loading="lazy" onerror="this.style.display='none'"></div>\` : ''}
            <div class="list-content-wrapper">
                <h3>\${m.name} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">|\${m.brand || '브랜드미상'}</span></h3>
                <p class="desc" style="margin-top:0.25rem; margin-bottom: 0;">\${m.specification || '규격 정보 없음'}</p>
                <div class="price-row" style="margin-top: 0.5rem; display: flex; gap: 1rem; align-items: baseline;">
                    <span style="font-weight: bold; color: var(--primary-color); font-size: 1.1rem;">\${m.ourSellingPrice ? m.ourSellingPrice.toLocaleString() + ' VND' : '단가 허가필요'}</span>
                </div>
            </div>
            <div class="list-action-wrapper" style="margin-left: auto;">
                <span class="btn-primary" style="padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem; background: #e2e8f0; color: #333;">상세보기</span>
            </div>
        </div>`);

fs.writeFileSync('materials.html', html, 'utf8');

let css = fs.readFileSync('assets/css/style.css', 'utf8');
if (!css.includes('.material-list-item')) {
    css += `
/* Material List Horizontal Style */
.material-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}
.material-list-item {
    display: flex;
    align-items: center;
    background: #fff;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 1rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}
.material-list-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}
.list-img-wrapper {
    flex-shrink: 0;
    width: 80px;
    height: 80px;
    border-radius: 8px;
    overflow: hidden;
    margin-right: 1.5rem;
    background: #f1f5f9;
}
.list-img-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.list-content-wrapper {
    display: flex;
    flex-direction: column;
}
.list-content-wrapper h3 {
    margin: 0;
    font-size: 1.1rem;
}
.list-content-wrapper p {
    margin: 0;
    color: var(--text-secondary);
}

/* Mobile Optimization: Make list items stack efficiently on small screens */
@media (max-width: 600px) {
    .material-list-item {
        flex-direction: column;
        align-items: flex-start;
    }
    .list-action-wrapper {
        margin-left: 0 !important;
        margin-top: 1rem;
        width: 100%;
    }
    .list-action-wrapper span {
        display: block;
        text-align: center;
    }
}
`;
    fs.writeFileSync('assets/css/style.css', css, 'utf8');
}
