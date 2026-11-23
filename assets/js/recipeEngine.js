// 메뉴 레시피(1인분 재료) → 판매 수량만큼 자재 재고 자동 차감
//
// 레시피 저장 위치: menu_recipes/{productId}
//   { productId, productName, merchantId, items: [{ materialId, materialName, qty, unit }], updatedAt }
//   qty 는 "메뉴 1개(1인분)에 드는 자재 양"이고, 단위는 자재관리 품목의 단위(unit)를 따른다.
// 차감 기록: sales_deductions/{sourceKey}  (같은 판매를 두 번 빼지 않도록 sourceKey 로 중복 방지)
//            material_usage_logs           (자재관리 "소모/반출 내역"에 그대로 보임)
// 순수 로직(planDeduction 등)은 Firestore 없이 테스트할 수 있게 분리해 둔다.

export function normalizeName(name) {
    return String(name || '')
        .normalize('NFC')
        .toLowerCase()
        .replace(/[\s ]+/g, '')
        .replace(/[()\[\]{}.,·_\-/\\'"`]/g, '');
}

function toNumber(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const n = Number(String(v ?? '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : 0;
}

// 레시피 행 정리: 자재가 정해지고 양이 0보다 큰 행만 남긴다.
export function cleanRecipeItems(items) {
    return (Array.isArray(items) ? items : [])
        .map((it) => ({
            materialId: String(it?.materialId || '').trim(),
            materialName: String(it?.materialName || '').trim(),
            qty: Math.max(0, toNumber(it?.qty)),
            unit: String(it?.unit || '').trim()
        }))
        .filter((it) => it.materialId && it.qty > 0);
}

// 판매 줄({ productId?, name, qty })을 레시피와 맞춘다. productId 가 없으면 메뉴 이름으로 찾는다.
export function findRecipe(recipes, sale) {
    const list = recipes || [];
    if (sale?.productId) {
        const byId = list.find((r) => r.productId === sale.productId);
        if (byId) return byId;
    }
    const key = normalizeName(sale?.name);
    if (!key) return null;
    return list.find((r) => normalizeName(r.productName) === key
        || (r.aliases || []).some((a) => normalizeName(a) === key)) || null;
}

// 판매 목록 → 자재별 차감량 계획
// 반환: { lines: [{ materialId, materialName, unit, qty, stockBefore, stockAfter }],
//         matched: [{ name, qty, productId }], unmatched: [{ name, qty }] }
export function planDeduction(sales, recipes, materials) {
    const byMaterial = new Map();
    const matched = [];
    const unmatched = [];

    for (const sale of sales || []) {
        const qty = toNumber(sale?.qty);
        if (!(qty > 0)) continue;
        const recipe = findRecipe(recipes, sale);
        const items = recipe ? cleanRecipeItems(recipe.items) : [];
        if (!recipe || items.length === 0) {
            unmatched.push({ name: String(sale?.name || sale?.productId || ''), qty });
            continue;
        }
        matched.push({ name: recipe.productName || sale.name, qty, productId: recipe.productId });
        for (const it of items) {
            const prev = byMaterial.get(it.materialId) || { materialId: it.materialId, materialName: it.materialName, unit: it.unit, qty: 0 };
            prev.qty += it.qty * qty;
            byMaterial.set(it.materialId, prev);
        }
    }

    const lines = [...byMaterial.values()].map((l) => {
        const m = (materials || []).find((x) => x.id === l.materialId);
        const stockBefore = toNumber(m?.stock);
        const qty = Math.round(l.qty * 1000) / 1000;
        return {
            ...l,
            qty,
            materialName: m?.name || l.materialName,
            unit: m?.unit || l.unit,
            stockBefore,
            stockAfter: Math.round((stockBefore - qty) * 1000) / 1000,
            missing: !m
        };
    });
    return { lines, matched, unmatched };
}

// 같은 판매 묶음을 두 번 빼지 않기 위한 키 (Firestore 문서 ID로 쓸 수 있는 문자)
export function makeSourceKey(source, ref) {
    return `${source}_${String(ref || '')}`.replace(/[^A-Za-z0-9_\-]/g, '_').slice(0, 140);
}

// 계획을 Firestore 에 반영한다. fs 는 firebase/firestore 모듈 함수 묶음.
// 이미 같은 sourceKey 로 차감했으면 아무것도 하지 않고 { skipped: true } 를 돌려준다.
export async function applyDeduction({ db, fs, plan, source, ref, merchantId, user, note }) {
    const { doc, collection, runTransaction, increment, serverTimestamp } = fs;
    const sourceKey = makeSourceKey(source, ref);
    const dedRef = doc(db, 'sales_deductions', sourceKey);
    const lines = (plan?.lines || []).filter((l) => !l.missing && l.qty > 0);

    const result = await runTransaction(db, async (tx) => {
        const existing = await tx.get(dedRef);
        if (existing.exists()) return { skipped: true, sourceKey };
        for (const l of lines) {
            tx.update(doc(db, 'materials', l.materialId), {
                stock: increment(-l.qty),
                lastUsedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            tx.set(doc(collection(db, 'material_usage_logs')), {
                materialId: l.materialId,
                materialName: l.materialName,
                quantity: l.qty,
                unit: l.unit || '',
                reason: `판매 자동 차감 (${note || source})`,
                source,
                sourceKey,
                merchantId: merchantId || '',
                userEmail: user?.email || 'system',
                userName: '레시피 자동차감',
                createdAt: serverTimestamp()
            });
        }
        tx.set(dedRef, {
            source,
            ref: String(ref || ''),
            merchantId: merchantId || '',
            matched: plan?.matched || [],
            unmatched: plan?.unmatched || [],
            lines: lines.map(({ materialId, materialName, unit, qty }) => ({ materialId, materialName, unit, qty })),
            createdBy: user?.email || user?.uid || 'system',
            createdAt: serverTimestamp()
        });
        return { skipped: false, sourceKey, count: lines.length };
    });
    return result;
}

// AI 레시피 추천 응답(JSON)을 기존 자재 목록과 맞춘다. 자재에 없는 재료는 suggestedNew 로 돌려준다.
export function matchSuggestedRecipe(suggested, materials) {
    const items = [];
    const suggestedNew = [];
    for (const s of Array.isArray(suggested) ? suggested : []) {
        const key = normalizeName(s?.name);
        if (!key) continue;
        const m = (materials || []).find((x) => [x.name, x.nameVi, x.nameEn].some((n) => n && normalizeName(n) === key))
            || (materials || []).find((x) => x.name && (normalizeName(x.name).includes(key) || key.includes(normalizeName(x.name))));
        const qty = Math.max(0, toNumber(s?.qty));
        if (m) items.push({ materialId: m.id, materialName: m.name, qty, unit: m.unit || s.unit || '' });
        else suggestedNew.push({ name: String(s.name).trim(), qty, unit: String(s?.unit || '').trim() });
    }
    return { items, suggestedNew };
}
