// POS 판매 반영 화면: 판매 파일 → 메뉴별 수량 → 레시피대로 자재 재고 차감
import { db, auth } from './firebase-config.js';
import { checkAdminAuth } from './auth.js';
import {
    collection, getDocs, query, where, orderBy, limit, doc, updateDoc,
    runTransaction, increment, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { planDeduction, applyDeduction, normalizeName } from './recipeEngine.js';
import { extractSalesFromRows, rowsToTsv, parseCsv, toCsv, buildTemplateRows, buildSampleRows } from './posSalesParser.js';
import { geminiFetch } from './geminiClient.js';

const SHEETJS_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
const el = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let tenantId = '';
let isSuper = false;
let recipes = [];
let materials = [];
let current = null; // { mode: 'file'|'manual', sales, plan, fileHash, fileName, aliasMap }
let menus = []; // 우리 가맹점 메뉴 (직접 입력용)

function today() {
    const d = new Date(Date.now() + 7 * 3600 * 1000); // 베트남 시간
    return d.toISOString().slice(0, 10);
}

function setStatus(t, isErr = false) {
    const s = el('sdStatus');
    if (s) { s.textContent = t; s.style.color = isErr ? '#b91c1c' : '#4338ca'; }
}

async function sha16(buf) {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function loadBase() {
    const recipeQuery = isSuper ? collection(db, 'menu_recipes') : query(collection(db, 'menu_recipes'), where('merchantId', '==', String(tenantId)));
    const [rSnap, mSnap] = await Promise.all([getDocs(recipeQuery), getDocs(collection(db, 'materials'))]);
    recipes = rSnap.docs.map((d) => ({ id: d.id, productId: d.id, ...d.data() }));
    materials = mSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function readRows(file) {
    const buf = await file.arrayBuffer();
    const fileHash = await sha16(buf);
    if (/\.csv$/i.test(file.name)) {
        return { rows: parseCsv(new TextDecoder('utf-8').decode(buf)), fileHash };
    }
    const XLSX = await import(/* @vite-ignore */ SHEETJS_URL);
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return { rows: XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), fileHash };
}

async function extractWithAi(rows) {
    const prompt = `아래는 베트남 식당 POS 판매 보고서를 표로 옮긴 것입니다 (탭 구분).
메뉴(상품)별 판매 수량만 뽑아 JSON 배열로만 답하세요: [{"name":"메뉴 이름(원문 그대로)","qty":숫자}]
합계 줄, 할인, 서비스료, 세금 줄은 빼세요.

${rowsToTsv(rows)}`;
    const res = await geminiFetch({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json' }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || 'AI 호출 실패');
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    const arr = JSON.parse(text.match(/\[[\s\S]*\]/)?.[0] || '[]');
    return arr.map((x) => ({ name: String(x?.name || '').trim(), qty: Number(x?.qty) || 0 })).filter((x) => x.name && x.qty > 0);
}

function recipesWithAliases(aliasMap) {
    // 화면에서 연결한 POS 이름 → 레시피를 임시 별칭으로 붙여서 계획을 다시 만든다
    return recipes.map((r) => ({ ...r, aliases: [...(r.aliases || []), ...Object.keys(aliasMap).filter((k) => aliasMap[k] === r.productId)] }));
}

function rebuildPlan() {
    current.plan = planDeduction(current.sales, recipesWithAliases(current.aliasMap), materials);
    render();
}

function render() {
    const { plan } = current;
    const recipeOptions = recipes
        .map((r) => `<option value="${esc(r.productId)}">${esc(r.productName || r.productId)}</option>`).join('');
    const matchedHtml = plan.matched.map((m) => `<div style="display:flex; justify-content:space-between; padding:0.25rem 0; border-bottom:1px solid #f1f5f9;"><span>✅ ${esc(m.name)}</span><b>${m.qty}</b></div>`).join('');
    const unmatchedHtml = plan.unmatched.map((u) => `
        <div style="display:flex; justify-content:space-between; gap:0.5rem; align-items:center; padding:0.3rem 0; border-bottom:1px solid #fef3c7;">
            <span style="flex:1; min-width:0;">⚠️ ${esc(u.name)} <b>${u.qty}</b></span>
            <select data-pos-name="${esc(u.name)}" class="sd-map" style="max-width:55%; padding:0.3rem; border:1px solid #fcd34d; border-radius:0.35rem;">
                <option value="">레시피 연결 안 함</option>${recipeOptions}
            </select>
        </div>`).join('');
    el('sdSales').innerHTML = (matchedHtml || '') + (unmatchedHtml
        ? `<div style="margin-top:0.6rem; color:#92400e; font-size:0.8rem;">레시피가 없는 메뉴입니다. 같은 메뉴의 레시피를 고르면 다음부터 자동으로 연결됩니다.</div>${unmatchedHtml}`
        : '') || '<div>판매 내역이 없습니다.</div>';
    el('sdSales').querySelectorAll('.sd-map').forEach((sel) => {
        sel.value = current.aliasMap[sel.dataset.posName] || '';
        sel.addEventListener('change', () => {
            if (sel.value) current.aliasMap[sel.dataset.posName] = sel.value;
            else delete current.aliasMap[sel.dataset.posName];
            rebuildPlan();
        });
    });
    el('sdLines').innerHTML = plan.lines.length
        ? `<table style="width:100%; border-collapse:collapse;"><tr style="color:#64748b; font-size:0.75rem;"><th style="text-align:left;">자재</th><th style="text-align:right;">차감</th><th style="text-align:right;">재고</th></tr>` +
          plan.lines.map((l) => `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:0.3rem 0;">${esc(l.materialName)}${l.missing ? ' <span style="color:#b91c1c;">(자재 없음, 건너뜀)</span>' : ''}</td>
                <td style="text-align:right;">-${l.qty} ${esc(l.unit || '')}</td>
                <td style="text-align:right; color:${l.stockAfter < 0 ? '#b91c1c' : '#334155'}; font-weight:${l.stockAfter < 0 ? 800 : 500};">${l.stockBefore} → ${l.stockAfter}</td></tr>`).join('') + '</table>' +
          (plan.lines.some((l) => l.stockAfter < 0) ? '<div style="margin-top:0.5rem; color:#b91c1c; font-size:0.8rem;">빨간 숫자는 장부 재고보다 많이 팔린 자재입니다. 입고(지출) 등록이 빠졌는지 확인해 주세요.</div>' : '')
        : '<div>빠질 자재가 없습니다. 메뉴 관리에서 레시피를 먼저 넣어 주세요.</div>';
    el('sdPreview').style.display = 'block';
}

async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    el('sdPreview').style.display = 'none';
    try {
        setStatus('파일 읽는 중...');
        const { rows, fileHash } = await readRows(file);
        let { ok, sales } = extractSalesFromRows(rows);
        if (!ok || sales.length === 0) {
            setStatus('표 머리글을 못 찾아서 AI로 읽는 중...');
            sales = await extractWithAi(rows);
        }
        if (sales.length === 0) { setStatus('판매 내역을 찾지 못했습니다.', true); return; }
        await loadBase();
        current = { mode: 'file', sales, fileHash, fileName: file.name, aliasMap: {} };
        rebuildPlan();
        setStatus(`${file.name}: 메뉴 ${sales.length}종 읽음`);
    } catch (err) {
        console.error(err);
        setStatus('파일 처리 실패: ' + (err.message || err), true);
    }
}

async function onApply() {
    if (!current) return;
    const date = el('sdDate').value || today();
    const btn = el('sdApply');
    btn.disabled = true; btn.textContent = '반영 중...';
    try {
        // 화면에서 연결한 POS 이름은 레시피 별칭으로 저장 → 다음 업로드부터 자동 연결
        for (const [posName, productId] of Object.entries(current.aliasMap)) {
            try { await updateDoc(doc(db, 'menu_recipes', productId), { aliases: arrayUnion(posName) }); } catch (aliasErr) { console.warn('별칭 저장 실패', aliasErr); }
        }
        const manual = current.mode === 'manual';
        const r = await applyDeduction({
            db,
            fs: { doc, collection, runTransaction, increment, serverTimestamp },
            plan: current.plan,
            source: manual ? 'manual' : 'pos',
            // 직접 입력은 가맹점·날짜당 한 번만, 파일은 같은 파일·같은 날짜를 한 번만
            ref: manual ? `${tenantId || 'all'}_${date}` : `${tenantId || 'all'}_${date}_${current.fileHash}`,
            merchantId: tenantId,
            user: auth.currentUser,
            note: manual ? `마감 입력 ${date}` : `POS ${date} ${current.fileName}`
        });
        if (r.skipped) alert(manual
            ? `${date} 마감 수량은 이미 반영했습니다. (하루 한 번, 중복 차감 방지)\n고칠 게 있으면 자재관리에서 재고를 직접 조정해 주세요.`
            : '이 파일은 이미 같은 날짜로 반영했습니다. (중복 차감 방지)');
        else alert(`재고 차감 완료: 자재 ${r.count}개`);
        el('sdPreview').style.display = 'none';
        el('sdFile').value = '';
        if (manual) document.querySelectorAll('.me-qty').forEach((i) => { i.value = ''; });
        current = null;
        setStatus('');
        loadHistory();
    } catch (err) {
        console.error(err);
        alert('재고 차감 실패: ' + (err.message || err));
    } finally {
        btn.disabled = false; btn.textContent = '재고 차감 확정';
    }
}

async function loadHistory() {
    const box = el('sdHistory');
    try {
        const q = isSuper
            ? query(collection(db, 'sales_deductions'), orderBy('createdAt', 'desc'), limit(20))
            : query(collection(db, 'sales_deductions'), where('merchantId', '==', String(tenantId)), limit(50));
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 20);
        box.innerHTML = list.length ? list.map((d) => {
            const when = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleString('ko-KR') : '';
            const label = d.source === 'online_order' ? `온라인 주문 ${esc(d.ref)}`
                : d.source === 'manual' ? `마감 입력 ${esc(String(d.ref || '').split('_').pop())}` : '파일 업로드';
            const menus = (d.matched || []).map((m) => `${esc(m.name)} ${m.qty}`).join(', ');
            return `<div style="padding:0.45rem 0; border-bottom:1px solid #f1f5f9;"><b>${label}</b> · ${when}<br><span style="color:#64748b;">${menus || '-'} → 자재 ${(d.lines || []).length}개 차감${(d.unmatched || []).length ? `, 레시피 없음 ${(d.unmatched || []).length}종` : ''}</span></div>`;
        }).join('') : '아직 기록이 없습니다.';
    } catch (err) {
        console.warn(err);
        box.textContent = '기록을 불러오지 못했습니다.';
    }
}

// ---------- 직접 입력 (POS 가 없는 매장) ----------
function normMerchant(id) {
    const s = String(id || '').trim();
    if (['baekje_galbi', 'baekjegalbi', 'baekje'].includes(s)) return '1794710386';
    if (['bestwinner', 'best_winner'].includes(s)) return '1791605366';
    if (['daehankimchi', 'daehan_kimchi'].includes(s)) return '1791002036';
    return s;
}

async function loadMenus() {
    const snap = await getDocs(collection(db, 'merchant_products'));
    const mine = normMerchant(tenantId);
    menus = snap.docs.map((d) => {
        const x = d.data();
        return {
            id: d.id,
            name: x.product_name || x.name || '이름 없음',
            category: x.category || '',
            merchantId: normMerchant(x.merchant_id || x.merchantId || ''),
            status: x.sale_status || 'published',
            type: x.product_type || (x.category ? 'menu' : 'physical_product')
        };
    }).filter((m) => m.status !== 'deleted' && m.type !== 'physical_product' && (isSuper || m.merchantId === mine))
        .sort((a, b) => a.category.localeCompare(b.category, 'ko') || a.name.localeCompare(b.name, 'ko'));
}

function renderManual() {
    const box = el('meList');
    const kw = (el('meSearch').value || '').trim().toLowerCase();
    const hasRecipe = new Set(recipes.map((r) => r.productId));
    const list = menus.filter((m) => !kw || m.name.toLowerCase().includes(kw));
    if (menus.length === 0) { box.innerHTML = '<div style="color:#64748b;">등록된 메뉴가 없습니다. 스마트 메뉴 관리에서 먼저 메뉴를 넣어 주세요.</div>'; return; }
    box.querySelectorAll('.me-row').forEach((r) => { r.style.display = list.some((m) => m.id === r.dataset.id) ? '' : 'none'; });
    if (box.querySelector('.me-row')) return; // 처음 한 번만 그리고, 검색은 숨김/보임으로 (입력한 숫자 유지)
    box.innerHTML = menus.map((m) => `
        <label class="me-row" data-id="${esc(m.id)}" style="display:flex; align-items:center; gap:0.5rem; padding:0.45rem 0; border-bottom:1px solid #f1f5f9;">
            <span style="flex:1; min-width:0;">${esc(m.name)}${m.category ? ` <small style="color:#94a3b8;">${esc(m.category)}</small>` : ''}
                ${hasRecipe.has(m.id) ? '' : ' <small style="color:#b45309;">레시피 없음</small>'}</span>
            <input type="number" inputmode="numeric" min="0" step="1" class="me-qty" data-id="${esc(m.id)}" placeholder="0"
                style="width:84px; padding:0.5rem; border:1px solid #cbd5e1; border-radius:0.45rem; text-align:right; font-size:1rem;">
        </label>`).join('');
}

function onManualPreview() {
    const sales = [...document.querySelectorAll('.me-qty')]
        .map((i) => ({ productId: i.dataset.id, name: menus.find((m) => m.id === i.dataset.id)?.name || '', qty: Number(i.value) || 0 }))
        .filter((s) => s.qty > 0);
    if (sales.length === 0) { alert('판 수량을 하나 이상 넣어 주세요.'); return; }
    current = { mode: 'manual', sales, aliasMap: {} };
    rebuildPlan();
    el('sdPreview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function download(name, rows) {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showTab(tab) {
    ['manual', 'file'].forEach((t) => {
        el(`tab-${t}`).style.display = t === tab ? 'block' : 'none';
        const b = el(`btnTab-${t}`);
        b.style.background = t === tab ? '#4F46E5' : 'white';
        b.style.color = t === tab ? 'white' : '#334155';
    });
}

checkAdminAuth(
    (user) => {
        isSuper = String(user?.email || '').toLowerCase() === 'daguri75@gmail.com';
        tenantId = String(window.tenantId || '');
        el('sdDate').value = today();
        el('sdFile').addEventListener('change', onFile);
        el('sdApply').addEventListener('click', onApply);
        el('sdCancel').addEventListener('click', () => { el('sdPreview').style.display = 'none'; el('sdFile').value = ''; current = null; setStatus(''); });
        el('btnTab-manual').addEventListener('click', () => showTab('manual'));
        el('btnTab-file').addEventListener('click', () => showTab('file'));
        el('meSearch').addEventListener('input', renderManual);
        el('mePreview').addEventListener('click', onManualPreview);
        el('dlTemplate').addEventListener('click', () => download(`판매수량_양식_${today()}.csv`, buildTemplateRows(menus.map((m) => m.name))));
        el('dlSample').addEventListener('click', () => download('POS_샘플_KiotViet.csv', buildSampleRows(menus.map((m) => m.name))));
        showTab('manual');
        Promise.all([loadBase(), loadMenus()]).then(renderManual).catch((err) => {
            console.error(err);
            el('meList').textContent = '메뉴를 불러오지 못했습니다: ' + (err.message || err);
        });
        loadHistory();
    },
    () => { location.href = '../login.html?redirect=' + encodeURIComponent(location.pathname); }
);

export { normalizeName }; // 테스트·디버그용
