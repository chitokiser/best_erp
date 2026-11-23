// 재무회계 지출등록 → 자재관리(materials) 품목 자동등록/갱신
//
// 지출 1건에 담긴 품목(영수증 AI 품목 또는 직접 입력)을 자재관리 품목과 이름으로 맞춰서
//  - 이미 있는 품목: 재고(stock)를 구매 수량만큼 늘리고 최근 구매단가(ourPurchasePrice)를 갱신
//  - 없는 품목: 새 자재 품목으로 등록 (자재코드 자동 생성)
// 순수 로직(planMaterialSync 등)은 Firestore 없이 테스트할 수 있게 분리해 둔다.

// 자재관리 카테고리 (admin/material-form.html 의 selCategory 와 같은 값)
export const MATERIAL_CATEGORIES = [
    '육류/축산물', '수산물/해산물', '농산물/채소·야채', '과일/신선청과', '쌀/곡류/면류',
    '유제품/계란', '양념/소스/조미료', '가공식품/냉동식품', '음료/주류/커피·원두',
    '베이커리/디저트', '주방소모품/포장재',
    '석재', '목재', '조명', '인테리어', '엘리베이터', '소방', '스마트주차장',
    '사무용품', '생활용품', '전자제품', 'IT', '기타'
];

// 이 지출 항목 분류일 때는 자재 자동등록을 기본으로 켠다.
const MATERIAL_EXPENSE_PATTERN = /자재|원부자재|식자재|소모품|원가|비품|재료/;

export function isMaterialExpenseCategory(category) {
    return MATERIAL_EXPENSE_PATTERN.test(String(category || ''));
}

// 이름 비교용 정규화: 대소문자, 공백, 흔한 구분기호 차이는 같은 품목으로 본다.
export function normalizeMaterialName(name) {
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

// 영수증 AI 품목({name, quantity, unit, unitPrice, price})을 편집용 행으로 변환.
// unitPrice 는 1단위 가격, price 는 줄 합계(수량 × 단가). unitPrice 가 없으면 합계를 수량으로 나눈다.
export function receiptItemsToRows(items) {
    return (Array.isArray(items) ? items : [])
        .map((it) => {
            const quantity = toNumber(it?.quantity) > 0 ? toNumber(it.quantity) : 1;
            let unitPrice = toNumber(it?.unitPrice);
            const lineTotal = toNumber(it?.lineTotal) || toNumber(it?.price);
            if (!unitPrice && lineTotal) unitPrice = Math.round(lineTotal / quantity);
            return {
                name: String(it?.name || '').trim(),
                quantity,
                unitPrice,
                unit: String(it?.unit || '').trim(),
                categoryId: ''
            };
        })
        .filter((r) => r.name);
}

// 기존 자재 목록에서 이름(또는 베트남어/영어 이름, 자재코드)이 같은 품목을 찾는다.
export function findExistingMaterial(materials, name) {
    const key = normalizeMaterialName(name);
    if (!key) return null;
    return (materials || []).find((m) =>
        [m.name, m.nameVi, m.nameEn, m.materialCode].some((n) => n && normalizeMaterialName(n) === key)
    ) || null;
}

// 지출 품목 행들을 기존 자재와 맞춰서 "생성/갱신" 계획을 만든다.
// 같은 지출 안에서 같은 이름이 여러 줄이면 한 품목으로 합친다.
export function planMaterialSync(rows, materials) {
    const merged = new Map();
    for (const raw of rows || []) {
        const name = String(raw?.name || '').trim();
        const key = normalizeMaterialName(name);
        if (!key) continue;
        const quantity = toNumber(raw.quantity) > 0 ? toNumber(raw.quantity) : 1;
        const unitPrice = Math.max(0, Math.round(toNumber(raw.unitPrice)));
        const prev = merged.get(key);
        if (prev) {
            prev.quantity += quantity;
            if (unitPrice) prev.unitPrice = unitPrice;
        } else {
            merged.set(key, {
                name,
                quantity,
                unitPrice,
                unit: String(raw.unit || '').trim(),
                categoryId: String(raw.categoryId || '').trim()
            });
        }
    }

    const plan = [];
    for (const row of merged.values()) {
        const existing = findExistingMaterial(materials, row.name);
        if (existing) {
            const oldStock = toNumber(existing.stock);
            const oldPrice = toNumber(existing.ourPurchasePrice);
            plan.push({
                action: 'update',
                materialId: existing.id,
                name: existing.name || row.name,
                quantity: row.quantity,
                unitPrice: row.unitPrice,
                oldStock,
                newStock: oldStock + row.quantity,
                oldPrice,
                newPrice: row.unitPrice || oldPrice
            });
        } else {
            plan.push({
                action: 'create',
                name: row.name,
                quantity: row.quantity,
                unitPrice: row.unitPrice,
                unit: row.unit || 'EA',
                categoryId: row.categoryId || '기타',
                newStock: row.quantity,
                newPrice: row.unitPrice
            });
        }
    }
    return plan;
}

// 자동 자재코드: AUTO-YYMMDD-XXXX (기존 코드와 겹치지 않게)
export function generateMaterialCode(existingCodes, date = new Date()) {
    const taken = new Set(existingCodes || []);
    const ymd = String(date.getFullYear()).slice(2) + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    for (let i = 0; i < 50; i++) {
        const code = `AUTO-${ymd}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
        if (!taken.has(code)) return code;
    }
    return `AUTO-${ymd}-${Date.now().toString(36).toUpperCase()}`;
}

// 계획을 Firestore 에 반영한다. fs 는 firebase/firestore 모듈 함수 묶음.
// 반환값: 지출 기록에 남길 연결 정보 [{ materialId, name, action, quantity, unitPrice }]
export async function applyMaterialSync({ db, fs, plan, materials, financeRecordId, expense, user }) {
    const { collection, addDoc, doc, updateDoc, serverTimestamp, increment } = fs;
    const uid = user?.uid || null;
    const who = user?.email || uid || 'user';
    const codes = (materials || []).map((m) => m.materialCode).filter(Boolean);
    const linked = [];

    for (const p of plan) {
        if (p.action === 'update') {
            const patch = {
                stock: increment(p.quantity),
                lastPurchasedAt: serverTimestamp(),
                lastPurchaseDate: expense.date || '',
                lastSupplierName: expense.partner || '',
                lastFinanceRecordId: financeRecordId,
                updatedAt: serverTimestamp(),
                updatedBy: uid
            };
            if (p.unitPrice) patch.ourPurchasePrice = p.unitPrice;
            await updateDoc(doc(db, 'materials', p.materialId), patch);
            if (p.unitPrice && p.unitPrice !== p.oldPrice) {
                await addDoc(collection(db, 'priceHistory'), {
                    materialId: p.materialId,
                    supplierId: null,
                    oldPrice: p.oldPrice,
                    newPrice: p.unitPrice,
                    currency: 'VND',
                    priceType: 'PURCHASE',
                    changedAt: serverTimestamp(),
                    changedBy: uid,
                    reason: `재무회계 지출등록 (${expense.partner || '거래처 미입력'})`
                });
            }
            linked.push({ materialId: p.materialId, name: p.name, action: 'update', quantity: p.quantity, unitPrice: p.unitPrice });
        } else {
            const materialCode = generateMaterialCode(codes);
            codes.push(materialCode);
            const ref = await addDoc(collection(db, 'materials'), {
                materialCode,
                name: p.name,
                nameVi: '',
                nameEn: '',
                categoryId: p.categoryId,
                subCategoryId: '',
                applications: [],
                brand: '',
                model: '',
                color: '',
                specification: '',
                unit: p.unit,
                ourPurchasePrice: p.unitPrice,
                ourSellingPrice: 0,
                stock: p.quantity,
                currency: 'VND',
                vatIncluded: false,
                description: `재무회계 지출등록으로 자동 생성 (${expense.date || ''} ${expense.partner || ''})`.trim(),
                images: [],
                supplierIds: [],
                status: 'active',
                source: 'finance_expense',
                lastPurchasedAt: serverTimestamp(),
                lastPurchaseDate: expense.date || '',
                lastSupplierName: expense.partner || '',
                lastFinanceRecordId: financeRecordId,
                tenantId: expense.tenantId || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: uid,
                updatedBy: uid
            });
            if (p.unitPrice) {
                await addDoc(collection(db, 'priceHistory'), {
                    materialId: ref.id,
                    supplierId: null,
                    oldPrice: 0,
                    newPrice: p.unitPrice,
                    currency: 'VND',
                    priceType: 'PURCHASE',
                    changedAt: serverTimestamp(),
                    changedBy: uid,
                    reason: 'Initial Registration (재무회계 지출등록)'
                });
            }
            linked.push({ materialId: ref.id, name: p.name, action: 'create', quantity: p.quantity, unitPrice: p.unitPrice });
        }
    }

    // 자재 입고 이력 (자재관리 쪽에서 추적할 수 있게). 이력 저장 실패는 등록 자체를 막지 않는다.
    for (const l of linked) {
        try { await addDoc(collection(db, 'material_purchase_logs'), {
            materialId: l.materialId,
            materialName: l.name,
            action: l.action,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            financeRecordId,
            partner: expense.partner || '',
            date: expense.date || '',
            userEmail: who,
            createdAt: serverTimestamp()
        }); } catch (logErr) { console.warn('material_purchase_logs 저장 실패:', logErr); }
    }
    return linked;
}
