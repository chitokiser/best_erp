import fs from 'fs';
import https from 'https';

const dotenv = fs.readFileSync('.env', 'utf8');
const match = dotenv.match(/VITE_TELEGRAM_BOT_TOKEN=([^\n\r]+)/);
if (!match) {
    console.log("No token found");
    process.exit(1);
}
const token = match[1];

https.get(`https://api.telegram.org/bot${token}/getUpdates`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (json.ok && json.result.length > 0) {
                let latestGroupId = null;
                let latestGroupTitle = "";

                json.result.forEach(r => {
                    if (r.message && r.message.chat && (r.message.chat.type === 'group' || r.message.chat.type === 'supergroup')) {
                        latestGroupId = r.message.chat.id;
                        latestGroupTitle = r.message.chat.title;
                    }
                    if (r.my_chat_member && r.my_chat_member.chat && (r.my_chat_member.chat.type === 'group' || r.my_chat_member.chat.type === 'supergroup')) {
                        latestGroupId = r.my_chat_member.chat.id;
                        latestGroupTitle = r.my_chat_member.chat.title;
                    }
                });

                if (latestGroupId) {
                    console.log("FOUND_GROUP_ID=" + latestGroupId);
                    console.log("GROUP_TITLE=" + latestGroupTitle);
                } else {
                    console.log("No group event found in getUpdates.");
                }
            } else {
                console.log("No updates found or error: ", json);
            }
        } catch (e) {
            console.log("Error parsing update:", e);
        }
    });
}).on('error', err => console.log("Req error:", err));
