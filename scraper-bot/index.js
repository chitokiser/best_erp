require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// Google API settings
const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX;

app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "검색어가 없습니다." });

    console.log(`[프록시 봇] "${q}" Google Custom Search API로 검색 중...`);

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
        return res.json({
            items: [{
                title: `[검색 설정 오류] API 키 누락`,
                link: "#",
                snippet: "봇에 Google Search API 키가 설정되지 않았습니다.",
                pagemap: { cse_image: [{ src: "https://via.placeholder.com/150x150?text=Error" }] }
            }]
        });
    }

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(q)}&gl=vn`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.error && data.error.code === 403) {
            console.error("API Error:", data.error.message);
            return res.json({
                items: [{
                    title: `[API 권한 오류] 403 Forbidden`,
                    link: "#",
                    snippet: `Google Cloud Console에서 Custom Search API 권한을 확인하세요.\n${data.error.message}`,
                    pagemap: { cse_image: [{ src: "https://via.placeholder.com/150x150?text=403" }] }
                }]
            });
        }

        if (!data.items || data.items.length === 0) {
            return res.json({
                items: [{
                    title: `[검색 결과 없음] ${q}`,
                    link: `https://www.google.com.vn/search?q=${encodeURIComponent(q)}`,
                    snippet: `Google Search API로 검색을 시도했지만 결과를 찾을 수 없습니다.`,
                    pagemap: { cse_image: [{ src: "https://via.placeholder.com/150x150?text=No+Data" }] }
                }]
            });
        }

        // Return up to 5 items structured like the previous puppeteer logic
        const items = data.items.slice(0, 5).map(item => {
            let imgUrl = "https://via.placeholder.com/150x150?text=No+Image";
            if (item.pagemap && item.pagemap.cse_image && item.pagemap.cse_image.length > 0) {
                imgUrl = item.pagemap.cse_image[0].src;
            } else if (item.pagemap && item.pagemap.cse_thumbnail && item.pagemap.cse_thumbnail.length > 0) {
                imgUrl = item.pagemap.cse_thumbnail[0].src;
            }

            return {
                title: item.title,
                link: item.link,
                snippet: item.snippet,
                pagemap: { cse_image: [{ src: imgUrl }] } // Keep this compatible with frontend
            };
        });

        res.json({ items: items });
    } catch (e) {
        console.error("API 호출 에러:", e.message);
        res.json({
            items: [{
                title: `[스크래핑 에러] ${q}`,
                link: "#",
                snippet: `API 오류: ${e.message}`,
                pagemap: { cse_image: [{ src: "https://via.placeholder.com/150x150?text=Error" }] }
            }]
        });
    }
});

app.get('/', (req, res) => {
    res.send('Scraper Bot (Google Custom Search API) is Alive\n');
});

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BESTwinner 스크래핑 봇 (Google Search API 모드) 가동되었습니다. (포트: ${PORT})`);
});
