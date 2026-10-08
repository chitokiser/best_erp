const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/app\.get\('\/api\/search',(.|\n)*?\}\);/, `app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "검색어가 없습니다." });

    try {
        console.log(\`[프록시 봇] "\${q}" 검색 데이터 크롤링 중 (Yahoo 엔진)...\`);

        // 가장 개방형인 야후 검색엔진 사용
        const response = await require('axios').get(\`https://search.yahoo.com/search?p=\${encodeURIComponent(q)}\`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = require('cheerio').load(response.data);
        let items = [];

        $('.algo').each((i, el) => {
            if (i >= 5) return false;
            const titleEl = $(el).find('h3.title a');
            const title = titleEl.text().trim();
            const link = titleEl.attr('href');
            const snippet = $(el).find('.compText, .abstr').text().trim();
            // 야후는 이미지를 따로 크게 던져주지 않으므로 기본 placeholder
            const imgUrl = "https://via.placeholder.com/150x150?text=Auto+Scraped";

            if (title && link) {
                items.push({
                    title: title,
                    link: link,
                    snippet: snippet,
                    pagemap: { 
                       cse_image: [{ src: imgUrl }] 
                    }
                });
            }
        });

        if (items.length === 0) {
            items.push({
                title: \`[임시 생성 폼] \${q}\`,
                link: "https://search.yahoo.com/search?p=" + encodeURIComponent(q),
                snippet: \`자동 검색이 잠시 막혔거나 관련 상품 결과가 없습니다. 수동으로 상품 정보를 입력해주세요.\`,
                pagemap: { cse_image: [{ src: "https://via.placeholder.com/150x150?text=No+Data" }] }
            });
        }

        res.json({ items: items });
    } catch (e) {
        console.error("크롤링 에러:", e.message);
        res.status(500).json({ error: e.message });
    }
});`);
fs.writeFileSync('index.js', code, 'utf8');
