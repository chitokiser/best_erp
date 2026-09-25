import fs from 'fs';
import path from 'path';

function getHtmlFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (filePath.includes('node_modules') || filePath.includes('dist')) continue;
    if (fs.statSync(filePath).isDirectory()) {
      getHtmlFiles(filePath, fileList);
    } else if (file.endsWith('.html')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allHtmls = getHtmlFiles('.');
let inputs = {};

allHtmls.forEach(file => {
  // Normalize path for Windows
  const normalized = file.replace(/\\/g, '/');
  let name = normalized.replace('.html', '').replace('./', '').replace(/\//g, '_');
  if (name === 'index') name = 'main';
  inputs[name] = `resolve(__dirname, '${normalized}')`;
});

const configContent = `import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
${Object.keys(inputs).map(k => `        "${k}": ${inputs[k]}`).join(',\n')}
      }
    }
  }
});
`;

fs.writeFileSync('vite.config.js', configContent);
console.log('vite.config.js created with inputs:\n', Object.keys(inputs).join(', '));
