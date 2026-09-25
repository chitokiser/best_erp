import fs from 'fs';
import path from 'path';

function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            findHtmlFiles(filePath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const htmlFiles = findHtmlFiles('./');

htmlFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');

    let modified = false;

    // 1. BEST ADMIN to BEST Group
    if (content.includes('BEST ADMIN')) {
        content = content.replace(/BEST ADMIN/g, 'BEST Group');
        modified = true;
    }

    // 2. Add users.html to nav
    if (file.includes('admin') && !content.includes('users.html')) {
        content = content.replace(/(<li><a href="suppliers\.html".*?>공급업체<\/a><\/li>)/g, '$1\n                    <li><a href="users.html">권한관리</a></li>');
        modified = true;
    }

    // 3. Update dropdown categories
    if (content.includes('value="벽재"')) {
        content = content.replace(/<option value="벽재">벽재<\/option>[\s\S]*?<option value="마감재">마감재<\/option>/g, `<option value="인테리어">인테리어</option>
                        <option value="엘리베이터">엘리베이터</option>
                        <option value="소방">소방</option>
                        <option value="스마트주차장">스마트주차장</option>
                        <option value="기타">기타</option>`);
        modified = true;
    }

    // 4. Update categories.html array
    if (file.includes('categories.html') && content.includes('{ id: \'벽재\'')) {
        content = content.replace(/const cats = \[\s*\{ id: '벽재'.*?\s*\];/s, `        const cats = [
            { id: '인테리어', name: '인테리어 (Interior)', img: 'https://images.unsplash.com/photo-1540932239986-30128078f3c5?w=600' },
            { id: '엘리베이터', name: '엘리베이터 (Elevator)', img: 'https://images.unsplash.com/photo-1517581561081-3316cc810d29?w=600' },
            { id: '소방', name: '소방 (Fire Fighting)', img: 'https://images.unsplash.com/photo-1453227588063-bb302b62f50b?w=600' },
            { id: '스마트주차장', name: '스마트주차장 (Smart Parking)', img: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600' },
            { id: '기타', name: '기타 (Others)', img: 'https://images.unsplash.com/photo-1516156008625-3a9d6067fab5?w=600' }
        ];`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
