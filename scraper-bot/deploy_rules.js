const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getSecurityRules } = require('firebase-admin/security-rules');

const envContent = fs.readFileSync('../.env', 'utf8');
const pkMatch = envContent.match(/FIREBASE_PRIVATE_KEY="?([^"\n]+)"?/);
const privateKey = pkMatch ? pkMatch[1].replace(/\\n/g, '\n') : '';
const emMatch = envContent.match(/FIREBASE_CLIENT_EMAIL="?([^"\n]+)"?/);
const clientEmail = emMatch ? emMatch[1] : '';
const idMatch = envContent.match(/VITE_FIREBASE_PROJECT_ID="?([^"\n]+)"?/);
let projectId = idMatch ? idMatch[1] : '';
if (projectId.includes(')')) projectId = projectId.split(')')[0];

initializeApp({
    credential: cert({
        projectId: projectId || "aim119",
        clientEmail: clientEmail,
        privateKey: privateKey,
    })
});

const rulesSource = fs.readFileSync('../firestore.rules', 'utf8');

async function deployRules() {
    try {
        const securityRules = getSecurityRules();

        console.log("Creating Ruleset...");
        const ruleset = await securityRules.createRuleset({
            source: {
                files: [
                    {
                        name: "firestore.rules",
                        content: rulesSource
                    }
                ]
            }
        });

        console.log("Releasing Ruleset...", ruleset.name);
        await securityRules.releaseFirestoreRuleset(ruleset.name);

        console.log("Firestore Rules Deployed Successfully!");
        process.exit(0);
    } catch (e) {
        console.error("Deploy failed:", e);
        process.exit(1);
    }
}

deployRules();
