require('dotenv').config();
const cron = require('node-cron');
const axios = require('axios');
const admin = require('firebase-admin');

// 1. Firebase Admin SDK 초기화
// Railway 환경변수에서 개별 Firebase 변수를 읽어 초기화 (보안 우수)
try {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "aim119",
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-xxxxx@aim119.iam.gserviceaccount.com",
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
        })
    });
    console.log("🔥 Firebase Admin SDK 성공적으로 초기화됨!");
} catch (e) {
    console.error("Firebase Auth 설정 에러:", e.message);
}

const db = admin.firestore ? admin.firestore() : null;

// 2. 외부 API (베트남 현지 자재/기기 가격) 스크래핑 함수
async function fetchLatestPrices() {
    console.log(`[${new Date().toLocaleString()}] 📡 외부 단가 정보 스크래핑 시작...`);

    // 예시: Shopee VN이나 다른 베트남 철강 도매 API 엔드포인트라고 가정
    const targets = [
        { keyword: "A4 paper 80gsm", dbCategory: "기타" },
        { keyword: "Iron Rebar D10", dbCategory: "석재/철골" } // 예시
    ];

    let updatedCount = 0;

    for (let target of targets) {
        try {
            // 실제 구현 시에는 Cheerio 라이브러리(HTML 파싱)나 Puppeteer(무두 브라우저)를 사용하여
            // 쇼피나 로컬 B2B 몰의 돔(DOM) 혹은 오픈 API를 긁어옵니다.
            // 여긴 데모를 위한 랜덤 변동성 시뮬레이션입니다. (실제 axios.get("https://shopee.vn/api/v4/search/search_items...") 로직 세팅)

            console.log(`- '${target.keyword}' 최신 시세 검색 중...`);

            // 임의의 가격 변동폭 시뮬레이션 (-5% ~ +5% 변동)
            const randomFluctuation = 1 + (Math.random() * 0.1 - 0.05);

            if (db) {
                // DB에서 해당 카테고리와 키워드를 포함하는 자재를 꺼내 업데이트
                const snapshot = await db.collection('materials')
                    .where('categoryId', '==', target.dbCategory)
                    .get();

                snapshot.forEach(async (docRef) => {
                    const data = docRef.data();
                    if (data.name && data.name.toLowerCase().includes(target.keyword.split(' ')[0].toLowerCase())) {
                        const oldPrice = data.ourPurchasePrice || 0;
                        const newPrice = Math.round(oldPrice * randomFluctuation);

                        await db.collection('materials').doc(docRef.id).update({
                            ourPurchasePrice: newPrice,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });

                        // [옵션] Price History 컬렉션에도 남길 수 있습니다.
                        await db.collection('priceHistory').add({
                            materialId: docRef.id,
                            oldPrice,
                            newPrice,
                            changedAt: admin.firestore.FieldValue.serverTimestamp(),
                            reason: "Railway Bot Daily Auto Scraping",
                            changedBy: "System_Bot"
                        });

                        console.log(`  -> 🔄 [업데이트] ${data.name}: ${oldPrice} -> ${newPrice} VND`);
                        updatedCount++;
                    }
                });
            }
        } catch (e) {
            console.error(`- '${target.keyword}' 크롤링 중 서버 차단(CORS/Captcha) 등 에러 발생:`, e.message);
        }
    }

    console.log(`[${new Date().toLocaleString()}] ✅ 데일리 스크래핑 종료 (총 ${updatedCount}건 자동 업데이트 완료)`);
}

// 3. 스케줄링 등록 (매일 밤 자정 00:00 마다 실행 = 베트남 호치민 시간 기준)
// 크론(Cron) 표현식: 미닛(0) 아워(0) 데이(매일) 먼스(매월) 위크(매주)
cron.schedule('0 0 * * *', () => {
    fetchLatestPrices();
}, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
});

console.log("🚀 Railway BESTwinner 스크래핑 봇 서버가 가동되었습니다. (대기 중...)");

// Railway 환경에서는 웹 포트를 바인딩해주어야 Sleep 상태로 넘어가지 않고 유지됩니다.
const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Scraper Bot is Alive\\n');
}).listen(process.env.PORT || 3000);
