const fs = require('fs');
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');

const regex = /function renderCard\(id, data, statusCol\) \{[\s\S]*?col\.appendChild\(card\);\s*\n\s*\}/m;

const newRenderCard = `function renderCard(id, data, statusCol) {
            const col = document.getElementById(statusCol);
            if (!col) return;
            const card = document.createElement('div');
            card.className = 'kanban-card'; card.draggable = true; card.id = id;

            card.addEventListener('dragstart', (e) => {
                window.draggedCardId = id;
                e.dataTransfer.setData("text", id);
            });
            card.addEventListener('dragend', () => { window.draggedCardId = null; });

            let tagText = '신규';
            let tagBg = '#dbeafe';
            let tagColor = '#1e40af';
            
            if (statusCol === 'in_progress') {
                tagText = '진행 중';
                tagBg = '#fef3c7';
                tagColor = '#d97706';
            } else if (statusCol === 'waiting') {
                tagText = '대기중';
                tagBg = '#fee2e2';
                tagColor = '#b91c1c';
            } else if (statusCol === 'done') {
                tagText = '완료됨';
                tagBg = '#d1fae5';
                tagColor = '#059669';
            }

            card.innerHTML = \`
                <div class="card-actions">
                    <button onclick="window.editTask('\${id}', '\${data.title}', '\${data.description}')">✏️</button>
                    <button onclick="window.delTask('\${id}')">🗑️</button>
                </div>
                <span class="task-tag" style="background:\${tagBg}; color:\${tagColor}; padding:0.25rem 0.6rem; border-radius:12px; font-size:0.75rem; font-weight:bold; display:inline-block; margin-bottom:0.5rem;">\${tagText}</span>
                <h4 style="margin:0 0 0.5rem 0; font-size:1rem; padding-right:1rem;">\${data.title}</h4>
                <p style="margin:0; font-size:0.8rem; color:gray;">\${data.description}</p>
            \`;
            col.appendChild(card);
        }`;

if (regex.test(html)) {
    html = html.replace(regex, newRenderCard);
    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', html, 'utf8');
    console.log('Updated renderCard.');
} else {
    console.log('Could not match renderCard.');
}
