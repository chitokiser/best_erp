import fs from 'fs';
import cp from 'child_process';

const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');

for (const line of lines) {
    if (line.startsWith('VITE_')) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let key = match[1].trim();
            let val = match[2].trim().replace(/^"|"$/g, '');
            // Some cleanups due to dirty typos in env
            if (val.includes('tracker)')) val = val.split('tracker)')[0] + 'tracker';
            if (val.includes('FbphZ1zY')) val = val.split('appFbphZ1zY')[0] + 'app';

            console.log(`Setting ${key} in Netlify...`);
            try {
                cp.execSync(`netlify env:set ${key} ${val} --force`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`Failed on ${key}`);
            }
        }
    }
}
