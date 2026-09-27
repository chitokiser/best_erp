const fs = require('fs');
const cp = require('child_process');

const envContent = fs.readFileSync('../.env', 'utf8');

const pkMatch = envContent.match(/FIREBASE_PRIVATE_KEY="?([^"\n]+)"?/);
const privateKey = pkMatch ? pkMatch[1].replace(/\\n/g, '\n') : '';

const emMatch = envContent.match(/FIREBASE_CLIENT_EMAIL="?([^"\n]+)"?/);
const clientEmail = emMatch ? emMatch[1] : 'firebase-adminsdk-h4tdx@aim119.iam.gserviceaccount.com';

const idMatch = envContent.match(/VITE_FIREBASE_PROJECT_ID="?([^"\n]+)"?/);
let projectId = idMatch ? idMatch[1] : 'aim119';

if (projectId.includes(')')) projectId = projectId.split(')')[0]; // clean up any weird artifacts

if (!privateKey) {
    console.error("No private key found!");
    process.exit(1);
}

function setVar(key, val) {
    console.log(`Setting ${key}...`);
    try {
        cp.execSync(`railway variable set ${key} --stdin`, {
            input: val || '',
            encoding: 'utf-8'
        });
        console.log(`Successfully set ${key}`);
    } catch (e) {
        console.error(`Failed setting ${key}`, e.message);
    }
}

setVar('VITE_FIREBASE_PROJECT_ID', projectId);
setVar('FIREBASE_PROJECT_ID', projectId);
setVar('FIREBASE_CLIENT_EMAIL', clientEmail);
setVar('FIREBASE_PRIVATE_KEY', privateKey);

console.log("Railway Upload Complete!");
