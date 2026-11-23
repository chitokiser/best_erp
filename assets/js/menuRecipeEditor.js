// 메뉴 등록/수정 모달 안의 "🍳 레시피 (1인분 재료)" 편집기
// 레시피는 menu_recipes/{productId} 에 저장한다 (merchant_products 는 공개 문서라 재료 정보는 따로 둔다).
import { db } from './firebase-config.js';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { cleanRecipeItems, matchSuggestedRecipe } from './recipeEngine.js';
import { geminiFetch } from './geminiClient.js';

let materials = [];
let rows = [];
let loadedFor = null;

const el = (id) => document.getElementById(id);

function ensureSection() {
    if (el('recipeSection')) return;
    const anchor = el('mStatus')?.closest('div[style*="display:flex"]');
    if (!anchor) return;
    const wrap = document.createElement('div');
    wrap.id = 'recipeSection';
    wrap.style.cssText = 'margin:0.5rem 0 1rem; border:1.5px solid #FDE68A; background:#FFFBEB; border-radius:0.75rem; padding:0.85rem 1rem;';
    wrap.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <strong style="color:#78350F;">🍳 레시피 (1인분 재료)</strong>
            <div style="display:flex; gap:0.4rem;">
                <button type="button" id="btnRecipeAi" style="padding:0.4rem 0.7rem; border:1px solid #F59E0B; background:white; color:#B45309; border-radius:0.4rem; font-weight:700; cursor:pointer;">✨ AI 추천</button>
                <button type="button" id="btnRecipeAdd" style="padding:0.4rem 0.7rem; border:none; background:#F59E0B; color:white; border-radius:0.4rem; font-weight:700; cursor:pointer;">+ 재료</button>
            </div>
        </div>
        <p style="margin:0.35rem 0 0.5rem; font-size:0.75rem; color:#92400E;">이 메뉴가 1개 팔릴 때 빠지는 자재와 양입니다. 판매가 반영되면 자재관리 재고가 자동으로 줄어듭니다.</p>
        <div id="recipeRows"></div>
        <div id="recipeHint" style="font-size:0.75rem; color:#B45309; margin-top:0.35rem;"></div>`;
    anchor.insertAdjacentElement('afterend', wrap);
    el('btnRecipeAdd').addEventListener('click', () => { rows.push({ materialId: '', qty: 0 }); render(); });
    el('btnRecipeAi').addEventListener('click', suggestWithAi);
}

async function loadMaterials() {
    try {
        const snap = await getDocs(collection(db, 'materials'));
        materials = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            .filter((m) => m.status !== 'deleted')
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ko'));
    } catch (e) {
        console.warn('자재 목록 불러오기 실패:', e);
    }
}

function render() {
    const box = el('recipeRows');
    if (!box) return;
    box.innerHTML = '';
    if (rows.length === 0) {
        box.innerHTML = '<div style="font-size:0.8rem; color:#A16207;">아직 재료가 없습니다. [AI 추천]을 누르면 메뉴 이름으로 재료를 채워 드립니다.</div>';
        return;
    }
    rows.forEach((row, idx) => {
        const line = document.createElement('div');
        line.style.cssText = 'display:flex; gap:0.4rem; align-items:center; margin-bottom:0.35rem;';
        const sel = document.createElement('select');
        sel.style.cssText = 'flex:1; min-width:0; padding:0.45rem; border:1px solid #FCD34D; border-radius:0.4rem; background:white;';
        sel.innerHTML = '<option value="">자재 선택</option>' + materials.map((m) =>
            `<option value="${m.id}">${String(m.name || m.id).replace(/</g, '&lt;')}${m.unit ? ` (${m.unit})` : ''}</option>`).join('');
        sel.value = row.materialId || '';
        sel.addEventListener('change', () => {
            row.materialId = sel.value;
            const m = materials.find((x) => x.id === sel.value);
            row.materialName = m?.name || '';
            row.unit = m?.unit || '';
            unitEl.textContent = row.unit || '';
        });
        const qty = document.createElement('input');
        qty.type = 'number'; qty.min = '0'; qty.step = 'any';
        qty.value = row.qty || '';
        qty.placeholder = '양';
        qty.style.cssText = 'width:84px; padding:0.45rem; border:1px solid #FCD34D; border-radius:0.4rem;';
        qty.addEventListener('input', () => { row.qty = Number(qty.value) || 0; });
        const unitEl = document.createElement('span');
        unitEl.style.cssText = 'width:34px; font-size:0.75rem; color:#92400E;';
        unitEl.textContent = row.unit || materials.find((x) => x.id === row.materialId)?.unit || '';
        const del = document.createElement('button');
        del.type = 'button'; del.textContent = '✕';
        del.style.cssText = 'border:none; background:#FEF3C7; color:#92400E; width:26px; height:26px; border-radius:50%; cursor:pointer;';
        del.addEventListener('click', () => { rows.splice(idx, 1); render(); });
        line.append(sel, qty, unitEl, del);
        box.appendChild(line);
    });
}

async function suggestWithAi() {
    const name = (el('mName')?.value || '').trim();
    const hint = el('recipeHint');
    if (!name) { alert('먼저 메뉴 이름을 입력해 주세요.'); return; }
    const btn = el('btnRecipeAi');
    btn.disabled = true; btn.textContent = '추천 중...';
    if (hint) hint.textContent = '';
    try {
        const matList = materials.slice(0, 300).map((m) => `${m.name}${m.unit ? `(${m.unit})` : ''}`).join(', ');
        const prompt = `베트남의 한식당 메뉴 "${name}" 1인분(메뉴 1개)을 만드는 데 드는 주요 재료와 양을 추정해 주세요.
가능하면 아래 "우리 자재 목록"에 있는 이름을 그대로 쓰고, 양은 그 자재의 단위로 적어 주세요.
우리 자재 목록: ${matList || '(없음)'}
JSON 배열만 출력: [{"name":"재료명","qty":0.25,"unit":"kg"}]  (양념·소모품처럼 아주 적은 것은 빼도 됩니다)`;
        const res = await geminiFetch({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error?.message || 'AI 호출 실패');
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
        const { items, suggestedNew } = matchSuggestedRecipe(arr, materials);
        const have = new Set(rows.map((r) => r.materialId));
        items.forEach((it) => { if (!have.has(it.materialId)) rows.push(it); });
        render();
        if (hint) {
            hint.textContent = suggestedNew.length
                ? `자재관리에 없는 재료: ${suggestedNew.map((s) => `${s.name} ${s.qty}${s.unit}`).join(', ')} (자재로 먼저 등록하면 레시피에 넣을 수 있습니다)`
                : (items.length ? 'AI 추천을 채웠습니다. 양을 확인하고 저장해 주세요.' : '맞는 자재를 찾지 못했습니다.');
        }
    } catch (e) {
        console.error(e);
        alert('AI 레시피 추천 실패: ' + (e.message || e));
    } finally {
        btn.disabled = false; btn.textContent = '✨ AI 추천';
    }
}

export async function openRecipeEditor(productId) {
    ensureSection();
    rows = [];
    loadedFor = productId || null;
    render();
    await loadMaterials();
    if (productId) {
        try {
            const snap = await getDoc(doc(db, 'menu_recipes', productId));
            if (snap.exists() && loadedFor === productId) rows = (snap.data().items || []).map((r) => ({ ...r }));
        } catch (e) { console.warn('레시피 불러오기 실패:', e); }
    }
    render();
}

export async function saveRecipe(productId, { productName, merchantId }) {
    if (!productId) return;
    const items = cleanRecipeItems(rows).map((r) => {
        const m = materials.find((x) => x.id === r.materialId);
        return { ...r, materialName: m?.name || r.materialName, unit: m?.unit || r.unit };
    });
    const ref = doc(db, 'menu_recipes', productId);
    if (items.length === 0) {
        try { await deleteDoc(ref); } catch (_) { /* 없으면 무시 */ }
        return;
    }
    await setDoc(ref, {
        productId,
        productName: productName || '',
        merchantId: String(merchantId || ''),
        items,
        updatedAt: serverTimestamp()
    });
}
