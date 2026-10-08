const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');
code = code.replace(/app\.get\('\/api\/search',(.|\n)*?\}\);/, `app.get('/api/search', async (req, res) => { 
    const q = req.query.q; 
    if (!q) return res.status(400).json({ error: "No query" }); 
    try { 
        const response = await require("axios").get("https://search.naver.com/search.naver?where=nexearch&query=" + encodeURIComponent(q), { headers: { "User-Agent": "Mozilla/5.0" } }); 
        const $ = require("cheerio").load(response.data); 
        let items = []; 
        $(".total_wrap").each((i, el) => { 
            if (i >= 5) return false; 
            const titleEl = $(el).find(".link_tit, .api_txt_lines.total_tit"); 
            const title = titleEl.text().trim(); 
            const link = titleEl.attr("href"); 
            const snippet = $(el).find(".dsc_txt, .total_dsc").text().trim(); 
            const imgUrl = $(el).find(".thumb_bx img, .thumb_area img, .api_get").attr("src"); 
            if (title && link) { 
                items.push({ title, link, snippet, pagemap: { cse_image: [{ src: imgUrl || "https://via.placeholder.com/150" }] } }); 
            } 
        }); 
        if (items.length === 0) { 
            items.push({ title: "[No results] " + q, link: "", snippet: "Failed to find details", pagemap: { cse_image: [{ src: "https://via.placeholder.com/150" }] } }); 
        } 
        res.json({ items }); 
    } catch (e) { 
        res.status(500).json({ error: e.message }); 
    } 
});`);
fs.writeFileSync('index.js', code, 'utf8');
