import fs from 'fs';
const file = 'material-detail.html';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `</div>
                            
                            <div style="margin-top: 2rem;">
                                <h3>상세 설명</h3>`;

const insertStr = `</div>
                            
                            <!-- 구매 요청 / 장바구니 담기 버튼 -->
                            <div style="margin-top: 1.5rem;">
                                <button class="btn-primary" style="width: 100%; padding: 1rem; font-size: 1.1rem; border-radius: 8px; background: #0f172a;" onclick="window.addToCart('\${m.id}', '\${m.name}', \${m.ourPurchasePrice || 0})">
                                    🛒 구매 결재 장바구니에 담기
                                </button>
                            </div>
                            
                            <div style="margin-top: 2rem;">
                                <h3>상세 설명</h3>`;

content = content.replace(targetStr, insertStr);

const scriptTarget = `loadMaterial();
    </script>`;

const scriptInsert = `loadMaterial();

        // Cart Logic
        const updateCartCount = () => {
            const cart = JSON.parse(localStorage.getItem('best_cart') || '[]');
            const countEl = document.getElementById('cartCount');
            if(countEl) countEl.textContent = cart.length;
        };

        window.addToCart = (id, name, price) => {
            const cart = JSON.parse(localStorage.getItem('best_cart') || '[]');
            const existing = cart.find(i => i.id === id);
            if (existing) {
                existing.quantity += 1;
            } else {
                cart.push({ id, name, price, quantity: 1 });
            }
            localStorage.setItem('best_cart', JSON.stringify(cart));
            updateCartCount();
            alert(name + ' 품목이 요청 장바구니에 담겼습니다.');
        };

        // Initialize cart count visually
        setTimeout(updateCartCount, 500);

    </script>`;

content = content.replace(scriptTarget, scriptInsert);
fs.writeFileSync(file, content, 'utf8');
console.log('Modified material detail page successfully.');
