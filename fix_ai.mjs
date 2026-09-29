import fs from 'fs';

let c = fs.readFileSync('assets/js/ai-chat.js', 'utf8');
const idx = c.indexOf('loadingDiv.textContent');

c = c.slice(0, idx) + `loadingDiv.textContent = "AI 분석 중입니다...";
        chatWindow.appendChild(loadingDiv);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const answer = await aiChatProcess(userText);
        chatWindow.removeChild(loadingDiv);
        addMessage(answer, false);
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
};

document.addEventListener('DOMContentLoaded', initAIChat);`;

fs.writeFileSync('assets/js/ai-chat.js', c, 'utf8');
console.log('Fixed');
