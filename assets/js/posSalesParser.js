// POS 판매 내보내기(엑셀/CSV) 표에서 "메뉴 이름 + 판매 수량"을 뽑는다.
// KiotViet, iPOS, Sapo 같은 베트남 POS 와 한국어/영어 머리글을 함께 인식한다.
// rows: 2차원 배열 (첫 몇 줄에 매장명·기간 같은 제목 줄이 있어도 됨)

const NAME_PATTERNS = [/tên\s*(hàng|món|sản phẩm|sp|mặt hàng)/i, /hàng\s*hóa/i, /^món/i, /mặt hàng/i,
    /item\s*name/i, /product\s*name/i, /^(item|product|menu|name)$/i, /메뉴/, /상품명?/, /품목/, /품명/];
const QTY_PATTERNS = [/số\s*lượng/i, /^sl$/i, /sl\s*bán/i, /^qty$/i, /quantity/i, /수량/, /판매량/, /sold/i];
const SKIP_NAME = /^(tổng|total|합계|총계|cộng|subtotal)/i;

function cellText(v) {
    return String(v ?? '').replace(/\s+/g, ' ').trim();
}

function toQty(v) {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').trim();
    if (!s) return NaN;
    // 1.234,5 / 1,234.5 / 2 같은 표기
    const normalized = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    const n = Number(normalized.replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : NaN;
}

// 머리글 줄과 이름/수량 열 위치를 찾는다 (처음 20줄 안에서)
export function detectColumns(rows) {
    const limit = Math.min((rows || []).length, 20);
    for (let r = 0; r < limit; r++) {
        const row = (rows[r] || []).map(cellText);
        const nameIdx = row.findIndex((c) => c && NAME_PATTERNS.some((p) => p.test(c)));
        const qtyIdx = row.findIndex((c, i) => i !== nameIdx && c && QTY_PATTERNS.some((p) => p.test(c)));
        if (nameIdx !== -1 && qtyIdx !== -1) return { headerRow: r, nameIdx, qtyIdx };
    }
    return null;
}

// 같은 메뉴가 여러 줄이면 수량을 합친다. 합계 줄, 수량 0 이하 줄은 뺀다.
export function extractSalesFromRows(rows) {
    const cols = detectColumns(rows);
    if (!cols) return { ok: false, sales: [] };
    const map = new Map();
    for (let r = cols.headerRow + 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const name = cellText(row[cols.nameIdx]);
        if (!name || SKIP_NAME.test(name)) continue;
        const qty = toQty(row[cols.qtyIdx]);
        if (!(qty > 0)) continue;
        map.set(name, (map.get(name) || 0) + qty);
    }
    return { ok: true, columns: cols, sales: [...map.entries()].map(([name, qty]) => ({ name, qty })) };
}

// AI 에 넘길 표 미리보기 (머리글 인식 실패 시)
export function rowsToTsv(rows, maxRows = 150) {
    return (rows || []).slice(0, maxRows).map((r) => (r || []).map(cellText).join('\t')).join('\n');
}
