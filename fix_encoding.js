const fs = require('fs');
let html = fs.readFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', 'utf8');

const blockRegex = /window\.addKanbanTask = async \(\) => \{[\s\S]*?window\.delTask = async \(id\) => \{[\s\S]*?\}\s*;/m;

const replacementBlock = `window.addKanbanTask = async () => {
            const title = prompt("새 태스크 제목:");
            if (!title) return;
            const desc = prompt("설명 기재 (선택):");
            await addDoc(collection(db, 'projects', projectId, 'tasks'), {
                title, description: desc || '', status: 'todo', tag: '신규'
            });
            loadTasks();
        };

        window.editTask = async (id, oldT, oldD) => {
            const nt = prompt("제목:", oldT); if (!nt) return;
            const nd = prompt("설명:", oldD);
            await updateDoc(doc(db, 'projects', projectId, 'tasks', id), { title: nt, description: nd });
            loadTasks();
        };

        window.delTask = async (id) => {
            if (confirm("정말 삭제하시겠습니까?")) {
                await deleteDoc(doc(db, 'projects', projectId, 'tasks', id));
                loadTasks();
            }
        };`;

if (blockRegex.test(html)) {
    html = html.replace(blockRegex, replacementBlock);
    fs.writeFileSync('c:/Users/Asus/Desktop/project/BEST/BEST_ERP/admin/project-detail.html', html, 'utf8');
    console.log('Fixed Korean characters in Kanban logic.');
} else {
    console.log('Regex did not match.');
}
