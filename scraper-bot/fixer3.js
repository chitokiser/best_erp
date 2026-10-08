const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/app\.get\('\/api\/search',(.|\n)*?\}\);/, `app.get('/api/search', async (req, res) => {
    const q = req.query.q;
    if (!q) return res.status(400).json({ error: "검색어가 없습니다." });

    try {
        console.log(\`[프록시 봇] "\${q}" 검색 데이터 크롤링 중 (Daum 엔진)...\`);

        const response = await require('axios').get(\`https://search.daum.net/search?w=tot&q=\${encodeURIComponent(q)}\`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64 AppleWebKit/537.36) Chrome/114.0.0.0 Safari/537.36'
            }
        });

        const $ = require('cheerio').load(response.data);
        let items = [];

        $('.c-item-content').each((i, el) => {
            if (i >= 5) return false;
            const titleEl = $(el).find('.c-title-basic a, .tit_main');
            const title = titleEl.text().trim() || $(el).find('.c-item-content-title').text().trim();
            const link = titleEl.attr('href') || $(el).find('a').attr('href');
            const snippet = $(el).find('.c-desc-basic, .desc_txt').text().trim();
            let imgUrl = $(el).find('img.thumb_img').attr('src') || $(el).find('img').attr('src');
            
            if(imgUrl && imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
            if(!imgUrl) imgUrl = "https://via.placeholder.com/150x150?text=Auto+Scraped";

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

        // 결과가 없으면 Naver에서 긁기 재시도 (axios 헤더 수정)
        if (items.length === 0) {
            const res2 = await require('axios').get(\`https://search.naver.com/search.naver?where=nexearch&query=\${encodeURIComponent(q)}\`, {
                headers: { 'User-Agent': 'curl/7.68.0' }
            });
            const $2 = require('cheerio').load(res2.data);
            $2('.total_wrap').each((i, el) => {
                if (i >= 5) return false;
                const titleEl = $2(el).find('.link_tit, .api_txt_lines.total_tit');
                const title = titleEl.text().trim();
                const link = titleEl.attr('href');
                const snippet = $2(el).find('.dsc_txt, .total_dsc').text().trim();
                let imgUrl = $2(el).find('.thumb_bx img, .thumb_area img, .api_get').attr('src');
                
                if (title && link) {
                    items.push({
                        title, link, snippet: snippet || (title + " 상세정보 참조"), 
                        pagemap: { cse_image: [{ src: imgUrl || "https://via.placeholder.com/150x150?text=Naver+Data" }] }
                    });
                }
            });
        }

        if (items.length === 0) {
            items.push({
                title: \`[임시 생성 폼] \${q}\`,
                link: "https://search.naver.com/search.naver?query=" + encodeURIComponent(q),
                snippet: \`자동 검색 엔진 차단. 수동으로 상품 정보를 입력해주세요.\`,
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
