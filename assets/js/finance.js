import { db, auth, storage } from './firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, addDoc, serverTimestamp, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { scanReceiptAI } from './aiApi.js';

const modal = document.getElementById('financeModal');
const openBtn = document.getElementById('openModalBtn');
const closeBtn = document.getElementById('closeModalBtn');
const cancelBtn = document.getElementById('btnCancelModal');
const form = document.getElementById('financeForm');
const tbody = document.getElementById('financeTableBody');
const finTypeSelect = document.getElementById('finType');
const typeCards = document.querySelectorAll('#typeSelectorGrid .type-card');
const amountInput = document.getElementById('finAmount');
const amountPreviewBadge = document.getElementById('amountPreviewBadge');
const amountPreviewText = document.getElementById('amountPreviewText');
const btnResetAmount = document.getElementById('btnResetAmount');

// Receipt OCR elements
const openReceiptOcrBtn = document.getElementById('openReceiptOcrBtn');
const receiptFileInput = document.getElementById('receiptFileInput');
const receiptPreviewBox = document.getElementById('receiptPreviewBox');
const receiptThumbImg = document.getElementById('receiptThumbImg');
const receiptOcrBadge = document.getElementById('receiptOcrBadge');
const receiptFileName = document.getElementById('receiptFileName');
const receiptItemSummaryText = document.getElementById('receiptItemSummaryText');
const receiptOcrProgress = document.getElementById('receiptOcrProgress');
const btnRemoveReceipt = document.getElementById('btnRemoveReceipt');

let currentReceiptDataUrl = '';
let currentReceiptMimeType = 'image/jpeg';
let currentReceiptItems = [];

function formatCurrency(val) {
    return new Intl.NumberFormat('ko-KR').format(val);
}

// Convert number to Korean readable expression (e.g., 50,000,000 -> 5천만 동)
function formatKoreanNumber(val) {
    if (!val || isNaN(val) || val <= 0) return '';
    const num = Number(val);
    const uk = Math.floor(num / 100000000);
    const man = Math.floor((num % 100000000) / 10000);
    const remainder = num % 10000;

    let parts = [];
    if (uk > 0) parts.push(`${formatCurrency(uk)}억`);
    if (man > 0) parts.push(`${formatCurrency(man)}만`);
    if (remainder > 0 && parts.length === 0) parts.push(`${formatCurrency(remainder)}`);

    return parts.join(' ') + ' 동';
}

function updateAmountPreview(val) {
    const num = Number(val) || 0;
    if (num > 0) {
        const kor = formatKoreanNumber(num);
        if (amountPreviewText) {
            amountPreviewText.textContent = `${formatCurrency(num)} VND` + (kor ? ` (${kor})` : '');
        }
        if (amountPreviewBadge) {
            amountPreviewBadge.style.display = 'inline-flex';
        }
    } else {
        if (amountPreviewBadge) {
            amountPreviewBadge.style.display = 'none';
        }
    }
}

function openModal() {
    const dateInput = document.getElementById('finDate');
    if (dateInput) dateInput.valueAsDate = new Date();
    modal.style.display = 'flex';
    setType('INCOME');
    updateAmountPreview(amountInput ? amountInput.value : 0);
    setTimeout(() => {
        if (amountInput) amountInput.focus();
    }, 100);
}

function closeModal() {
    modal.style.display = 'none';
    clearReceiptPreview();
}

function setType(type) {
    if (finTypeSelect) finTypeSelect.value = type;
    typeCards.forEach(card => {
        if (card.dataset.type === type) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });

    const btn = document.getElementById('btnSubmit');
    if (btn) {
        const labels = {
            INCOME: '수입 내역 저장',
            EXPENSE: '지출 내역 저장',
            RECEIVABLE: '미수금(받을돈) 등록',
            PAYABLE: '미지급금(줄돈) 등록'
        };
        const span = btn.querySelector('span');
        if (span) span.textContent = labels[type] || '저장하기';
    }
}

// Event Listeners for Modal
if (openBtn) openBtn.addEventListener('click', openModal);
if (closeBtn) closeBtn.addEventListener('click', closeModal);
if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
        closeModal();
    }
});

// Type Card Click Events
typeCards.forEach(card => {
    card.addEventListener('click', () => {
        setType(card.dataset.type);
    });
});

// Amount Input Events
if (amountInput) {
    amountInput.addEventListener('input', (e) => {
        updateAmountPreview(e.target.value);
    });
}

// Quick Amount Chips
document.querySelectorAll('.btn-chip[data-add]').forEach(chip => {
    chip.addEventListener('click', () => {
        const addVal = Number(chip.dataset.add) || 0;
        const currentVal = Number(amountInput.value) || 0;
        const nextVal = currentVal + addVal;
        amountInput.value = nextVal;
        updateAmountPreview(nextVal);
    });
});

if (btnResetAmount) {
    btnResetAmount.addEventListener('click', () => {
        amountInput.value = '';
        updateAmountPreview(0);
        amountInput.focus();
    });
}

async function loadFinanceData() {
    try {
        const snap = await getDocs(collection(db, 'financeRecords'));
        // DYNAMIC VIRTUAL PAYROLL INJECTION!
        let virtualPayrolls = [];
        try {
            const empSnap = await getDocs(collection(db, 'employees'));
            const now = new Date();
            const curYYYYMM = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
            const payDate = curYYYYMM + '-25'; // Assume payday is 25th
            
            empSnap.forEach(e => {
                const edata = e.data();
                if (edata.salary && Number(edata.salary) > 0) {
                    virtualPayrolls.push({
                        id: 'virtual_payroll_' + e.id,
                        type: 'PAYABLE',
                        category: '인건비/급여',
                        amount: Number(edata.salary),
                        date: payDate,
                        partner: (edata.name || '직원') + ' (' + (edata.position||'') + ')',
                        project: edata.department || '가맹점/본사 공통',
                        memo: `[시스템 자동생성] ${now.getMonth()+1}월 정기 급여 지급예정`
                    });
                }
            });
        } catch (empErr) {
            console.warn("Employees payroll fetch warning:", empErr);
        }

        if (snap.empty && virtualPayrolls.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted);">등록된 재무 데이터가 없습니다.</td></tr>';
            document.getElementById('sumIncome').textContent = '0 VND';
            document.getElementById('sumExpense').textContent = '0 VND';
            document.getElementById('sumReceivable').textContent = '0 VND';
            document.getElementById('sumPayable').textContent = '0 VND';
            return;
        }

        let html = '';
        let sums = { INCOME: 0, EXPENSE: 0, RECEIVABLE: 0, PAYABLE: 0 };

        let records = [];
        snap.forEach(doc => { records.push({ id: doc.id, ...doc.data() }); });
        // merge virtual records
        records = records.concat(virtualPayrolls);

        records.sort((a, b) => new Date(b.date) - new Date(a.date));

        window.__financeRecordsMap = {};
        records.forEach(data => {
            if (data.id) window.__financeRecordsMap[data.id] = data;
            const type = data.type || 'INCOME';
            const amount = Number(data.amount) || 0;

            sums[type] += amount;

            let badgeHtml = '';
            if (type === 'INCOME') badgeHtml = '<span class="type-badge badge-income">수입</span>';
            else if (type === 'EXPENSE') badgeHtml = '<span class="type-badge badge-expense">지출</span>';
            else if (type === 'RECEIVABLE') badgeHtml = '<span class="type-badge badge-receivable">받을 돈</span>';
            else if (type === 'PAYABLE') badgeHtml = '<span class="type-badge badge-payable">지출예정(줄돈)</span>';

            const partner = data.partner || '-';
            const project = data.project || '-';

            html += `
                <tr>
                    <td style="font-weight:600;">${data.date}</td>
                    <td>
                        ${badgeHtml}
                        <div style="font-size:0.85rem; color:var(--text-dark); margin-top:0.25rem;">${data.category || '기타/미분류'}</div>
                     </td>
                    <td style="font-weight:800; font-size:1.1rem;">${formatCurrency(amount)} VND</td>
                    <td>
                        <div style="color:var(--text-dark);">${partner}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted);">${project}</div>
                    </td>
                    <td style="color:var(--text-muted);">
                        <div>${data.memo || '-'}</div>
                        ${data.receiptUrl ? `
                            <div style="margin-top:0.35rem;">
                                <button type="button" class="btn-inspect-receipt" data-record-id="${data.id}" style="display:inline-flex; align-items:center; gap:0.35rem; font-size:0.75rem; background:#ECFDF5; color:#047857; border:1px solid #A7F3D0; padding:0.25rem 0.65rem; border-radius:0.4rem; font-weight:800; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05); transition:all 0.15s;">
                                    <span>📸</span> 영수증 검토
                                </button>
                            </div>
                        ` : ''}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('sumIncome').textContent = formatCurrency(sums.INCOME) + ' VND';
        document.getElementById('sumExpense').textContent = formatCurrency(sums.EXPENSE) + ' VND';
        document.getElementById('sumReceivable').textContent = formatCurrency(sums.RECEIVABLE) + ' VND';
        document.getElementById('sumPayable').textContent = formatCurrency(sums.PAYABLE) + ' VND';

    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">오류가 발생했습니다. (' + (err.message || '권한 문제일 수 있습니다') + ')</td></tr>';
    }
}

// Client-side image compression helper
function compressImage(dataUrl, maxWidth = 1400, maxHeight = 1800, quality = 0.82) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSubmit');
    const span = btn.querySelector('span');
    const prevText = span ? span.textContent : '저장하기';
    if (span) span.textContent = '영수증 및 지출 저장 중...';
    btn.disabled = true;

    try {
        const tId = window.tenantId || 'system_master';
        const sName = window.currentStoreName || '';
        let receiptUrl = '';
        if (currentReceiptDataUrl && currentReceiptDataUrl.startsWith('data:image')) {
            try {
                // Compress photo before uploading for fast transfer and crisp archival
                const compressedDataUrl = await compressImage(currentReceiptDataUrl, 1400, 1800, 0.82);
                if (storage) {
                    const storageRef = ref(storage, `receipts/${tId}/${Date.now()}_receipt.jpg`);
                    const uploadRes = await uploadString(storageRef, compressedDataUrl, 'data_url');
                    receiptUrl = await getDownloadURL(uploadRes.ref);
                }
                if (!receiptUrl) {
                    receiptUrl = compressedDataUrl;
                }
            } catch (storageErr) {
                console.warn('Receipt upload to storage failed, using compressed data fallback:', storageErr);
                receiptUrl = await compressImage(currentReceiptDataUrl, 1000, 1400, 0.7);
            }
        }

        await addDoc(collection(db, 'financeRecords'), {
            type: document.getElementById('finType').value,
            category: document.getElementById('finCategory').value,
            date: document.getElementById('finDate').value,
            amount: Number(document.getElementById('finAmount').value),
            partner: document.getElementById('finPartner').value,
            project: document.getElementById('finProject').value,
            memo: document.getElementById('finMemo').value,
            receiptUrl: receiptUrl,
            receiptItems: currentReceiptItems || [],
            tenantId: tId,
            storeName: sName,
            createdBy: auth.currentUser?.email || auth.currentUser?.uid || 'user',
            createdAt: serverTimestamp()
        });

        clearReceiptPreview();

        modal.style.display = 'none';
        form.reset();
        updateAmountPreview(0);
        await loadFinanceData();
    } catch (err) {
        console.error(err);
        alert('저장 실패: ' + err.message);
    } finally {
        if (span) span.textContent = prevText;
        btn.disabled = false;
    }
});

// Auth state observer for safe execution
onAuthStateChanged(auth, (user) => {
    if (user) {
        loadFinanceData();
    }
});

if (auth.currentUser) {
    loadFinanceData();
}

window.loadFinanceData = loadFinanceData;

// Beep chime helper
function playSuccessChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
}

// Receipt Inspector Viewer State
let currentReceiptRotation = 0;
let currentReceiptZoom = 1;

function updateReceiptViewerTransform() {
    const img = document.getElementById('receiptModalFullImg');
    if (img) {
        img.style.transform = `rotate(${currentReceiptRotation}deg) scale(${currentReceiptZoom})`;
    }
}

document.getElementById('btnZoomIn')?.addEventListener('click', () => {
    currentReceiptZoom = Math.min(currentReceiptZoom + 0.25, 3.5);
    updateReceiptViewerTransform();
});
document.getElementById('btnZoomOut')?.addEventListener('click', () => {
    currentReceiptZoom = Math.max(currentReceiptZoom - 0.25, 0.5);
    updateReceiptViewerTransform();
});
document.getElementById('btnRotateReceipt')?.addEventListener('click', () => {
    currentReceiptRotation = (currentReceiptRotation + 90) % 360;
    updateReceiptViewerTransform();
});
document.getElementById('btnResetZoom')?.addEventListener('click', () => {
    currentReceiptZoom = 1;
    currentReceiptRotation = 0;
    updateReceiptViewerTransform();
});

window.openReceiptInspectionModal = (record) => {
    currentReceiptRotation = 0;
    currentReceiptZoom = 1;
    updateReceiptViewerTransform();

    const inspectModal = document.getElementById('receiptImageModal');
    const img = document.getElementById('receiptModalFullImg');
    const dlLink = document.getElementById('receiptDownloadLink');

    if (!inspectModal || !img) return;

    img.src = record.receiptUrl || '';
    if (dlLink) {
        dlLink.href = record.receiptUrl || '#';
        dlLink.setAttribute('download', `receipt_${record.date || 'date'}.jpg`);
    }

    const storeEl = document.getElementById('auditStoreName');
    if (storeEl) storeEl.textContent = record.partner || record.storeName || '영수증 거래처';

    const dateEl = document.getElementById('auditDate');
    if (dateEl) dateEl.textContent = `결제일자: ${record.date || '-'}`;

    const amountEl = document.getElementById('auditAmount');
    if (amountEl) amountEl.textContent = `${formatCurrency(record.amount || 0)} VND`;

    const catEl = document.getElementById('auditCategory');
    if (catEl) catEl.textContent = record.category || '식자재/원부자재';

    const typeEl = document.getElementById('auditTypeBadge');
    if (typeEl) {
        typeEl.textContent = record.type === 'INCOME' ? '수입' : '지출';
        typeEl.style.color = record.type === 'INCOME' ? '#059669' : '#DC2626';
    }

    const memoEl = document.getElementById('auditMemo');
    if (memoEl) memoEl.textContent = record.memo || '기록된 메모 없음';

    // Populate itemized list
    const itemsListEl = document.getElementById('auditItemsList');
    const itemsCountEl = document.getElementById('auditItemsCount');
    const items = record.receiptItems || [];

    if (itemsCountEl) itemsCountEl.textContent = `${items.length}개 품목`;

    if (itemsListEl) {
        if (items.length === 0) {
            itemsListEl.innerHTML = '<div style="color:#94A3B8; text-align:center; padding:1.5rem;">단일 지출 내역 (세부 품목 없음)</div>';
        } else {
            itemsListEl.innerHTML = items.map((it, idx) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.45rem 0.6rem; background:#F8FAFC; border-radius:0.4rem; border:1px solid #F1F5F9;">
                    <div style="font-weight:600; color:#1E293B; max-width:65%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                        <span style="color:#64748B; font-size:0.75rem; margin-right:0.3rem;">#${idx + 1}</span>${it.name || '품목'}
                        ${it.quantity > 1 ? `<span style="font-size:0.75rem; color:#4F46E5; background:#EEF2FF; padding:0.1rem 0.35rem; border-radius:0.2rem; margin-left:0.25rem;">x${it.quantity}</span>` : ''}
                    </div>
                    <div style="font-weight:700; color:#0F172A;">
                        ${it.price ? formatCurrency(it.price) + ' VND' : '-'}
                    </div>
                </div>
            `).join('');
        }
    }

    const auditSubmitBtn = document.getElementById('btnAuditConfirmSubmit');
    if (auditSubmitBtn) {
        if (record.id) {
            auditSubmitBtn.style.display = 'none';
        } else {
            auditSubmitBtn.style.display = 'inline-flex';
        }
    }

    inspectModal.style.display = 'flex';
};

window.closeReceiptInspector = () => {
    const inspectModal = document.getElementById('receiptImageModal');
    if (inspectModal) inspectModal.style.display = 'none';
};

// Table event delegation for receipt inspector
tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-inspect-receipt');
    if (btn) {
        const recordId = btn.dataset.recordId;
        const record = window.__financeRecordsMap?.[recordId];
        if (record) {
            openReceiptInspectionModal(record);
        }
    }
});

let isReceiptAnalyzing = false;

function clearReceiptPreview() {
    isReceiptAnalyzing = false;
    currentReceiptDataUrl = '';
    currentReceiptItems = [];
    if (receiptFileInput) receiptFileInput.value = '';
    if (receiptPreviewBox) receiptPreviewBox.style.display = 'none';
    if (receiptThumbImg) receiptThumbImg.src = '';
    if (receiptItemSummaryText) receiptItemSummaryText.textContent = '';
    if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
    const quickBtn = document.getElementById('btnQuickSubmitReceipt');
    if (quickBtn) quickBtn.style.display = 'none';
}

const triggerPreviewInspect = () => {
    if (!currentReceiptDataUrl) return;

    if (isReceiptAnalyzing) {
        openReceiptInspectionModal({
            receiptUrl: currentReceiptDataUrl,
            partner: '⏳ AI 정밀 분석 진행 중... (2~4초)',
            date: document.getElementById('finDate')?.value || new Date().toISOString().split('T')[0],
            amount: 0,
            category: '식자재/원부자재',
            type: 'EXPENSE',
            receiptItems: [],
            memo: '⏳ AI가 영수증의 상호명, 결제일자, 총 결제금액 및 세부 품목을 정밀 분석하고 있습니다.\n분석이 완료되면 이 화면에 자동으로 즉시 채워집니다. 잠시만 기다려주세요.'
        });
        return;
    }

    openReceiptInspectionModal({
        receiptUrl: currentReceiptDataUrl,
        partner: document.getElementById('finPartner')?.value || '작성 중 거래처',
        date: document.getElementById('finDate')?.value || new Date().toISOString().split('T')[0],
        amount: Number(document.getElementById('finAmount')?.value) || 0,
        category: document.getElementById('finCategory')?.value || '식자재/원부자재',
        type: document.getElementById('finType')?.value || 'EXPENSE',
        receiptItems: currentReceiptItems || [],
        memo: document.getElementById('finMemo')?.value || '영수증 등록 전 사전 검토'
    });
};

document.getElementById('receiptThumbContainer')?.addEventListener('click', triggerPreviewInspect);
document.getElementById('linkPreviewInspect')?.addEventListener('click', triggerPreviewInspect);

document.getElementById('btnQuickSubmitReceipt')?.addEventListener('click', () => {
    if (form) form.requestSubmit();
});

document.getElementById('btnAuditConfirmSubmit')?.addEventListener('click', () => {
    window.closeReceiptInspector();
    if (form) form.requestSubmit();
});

if (btnRemoveReceipt) {
    btnRemoveReceipt.addEventListener('click', clearReceiptPreview);
}

if (openReceiptOcrBtn) {
    openReceiptOcrBtn.addEventListener('click', () => {
        openModal();
        setType('EXPENSE');
        if (receiptFileInput) {
            setTimeout(() => { receiptFileInput.click(); }, 200);
        }
    });
}

if (receiptFileInput) {
    receiptFileInput.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        isReceiptAnalyzing = true;
        if (receiptFileName) receiptFileName.textContent = file.name;

        // Display progress
        if (receiptPreviewBox) receiptPreviewBox.style.display = 'flex';
        if (receiptOcrProgress) receiptOcrProgress.style.display = 'block';
        if (receiptOcrBadge) {
            receiptOcrBadge.textContent = '⏳ AI 영수증 분석 중... (2~4초)';
            receiptOcrBadge.style.background = '#EFF6FF';
            receiptOcrBadge.style.color = '#1E40AF';
        }
        if (receiptItemSummaryText) {
            receiptItemSummaryText.textContent = '영수증 이미지를 분석하여 총액과 세부 품목을 추출하고 있습니다...';
        }

        try {
            // Read file into Data URL
            const rawDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            currentReceiptDataUrl = rawDataUrl;
            if (receiptThumbImg) receiptThumbImg.src = rawDataUrl;

            // Compress & standardize to clean JPEG (~1500px, 0.85 quality)
            // Fixes HEIC/PNG/WebP, eliminates mobile payload timeouts, and cuts processing time in half
            const optimizedJpegDataUrl = await compressImage(rawDataUrl, 1600, 2000, 0.85);
            currentReceiptDataUrl = optimizedJpegDataUrl;
            currentReceiptMimeType = 'image/jpeg';
            if (receiptThumbImg) receiptThumbImg.src = optimizedJpegDataUrl;

            // Extract base64 payload
            const base64Data = optimizedJpegDataUrl.split(',')[1];
            const ocrResult = await scanReceiptAI(base64Data, 'image/jpeg');

            isReceiptAnalyzing = false;

            // Auto-fill form fields
            setType('EXPENSE');

            const dateInput = document.getElementById('finDate');
            if (dateInput && ocrResult.date) dateInput.value = ocrResult.date;

            if (ocrResult.totalAmount && amountInput) {
                amountInput.value = ocrResult.totalAmount;
                updateAmountPreview(ocrResult.totalAmount);
            }

            const catInput = document.getElementById('finCategory');
            if (catInput && ocrResult.category) catInput.value = ocrResult.category;

            const partnerInput = document.getElementById('finPartner');
            if (partnerInput && ocrResult.storeName) partnerInput.value = ocrResult.storeName;

            const projectInput = document.getElementById('finProject');
            if (projectInput && !projectInput.value) {
                projectInput.value = '가맹점 매장 운영';
            }

            currentReceiptItems = ocrResult.items || [];
            const memoInput = document.getElementById('finMemo');
            if (memoInput) {
                const itemsDesc = currentReceiptItems.length > 0 
                    ? currentReceiptItems.map(it => `${it.name}${it.quantity > 1 ? ' x' + it.quantity : ''}${it.price ? ' (' + formatCurrency(it.price) + ')' : ''}`).join(', ')
                    : '';
                memoInput.value = `[AI 영수증 자동정리] ${ocrResult.summary || ''}${itemsDesc ? '\n품목: ' + itemsDesc : ''}`;
            }

            // Update UI badges
            if (receiptOcrBadge) {
                receiptOcrBadge.textContent = '✅ AI 영수증 분석 완료';
                receiptOcrBadge.style.background = '#DCFCE7';
                receiptOcrBadge.style.color = '#166534';
            }
            if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
            if (receiptItemSummaryText) {
                receiptItemSummaryText.textContent = `🏬 ${ocrResult.storeName || '상호명'} | 💰 ${formatCurrency(ocrResult.totalAmount)} ${ocrResult.currency || 'VND'} | ${ocrResult.summary || '지출 항목 정리 완료'}`;
            }

            // Show quick submit button in receipt card
            const quickBtn = document.getElementById('btnQuickSubmitReceipt');
            if (quickBtn) quickBtn.style.display = 'inline-flex';

            // Also update the main submit button label dynamically for clear visibility
            const submitBtn = document.getElementById('btnSubmit');
            if (submitBtn) {
                const span = submitBtn.querySelector('span');
                if (span) {
                    span.textContent = `💾 ${formatCurrency(ocrResult.totalAmount)} VND 지출 등록 (저장)`;
                }
            }

            // If user has the inspector modal already open, live-update it with extracted data!
            const inspectModal = document.getElementById('receiptImageModal');
            if (inspectModal && inspectModal.style.display === 'flex') {
                openReceiptInspectionModal({
                    receiptUrl: currentReceiptDataUrl,
                    partner: ocrResult.storeName || '영수증 거래처',
                    date: ocrResult.date,
                    amount: ocrResult.totalAmount,
                    category: ocrResult.category,
                    type: 'EXPENSE',
                    receiptItems: currentReceiptItems,
                    memo: `[AI 영수증 자동정리] ${ocrResult.summary || ''}`
                });
            }

            playSuccessChime();

        } catch (scanErr) {
            isReceiptAnalyzing = false;
            console.error("Receipt OCR error:", scanErr);
            if (receiptOcrProgress) receiptOcrProgress.style.display = 'none';
            if (receiptOcrBadge) {
                receiptOcrBadge.textContent = '⚠️ 수동 검토 필요';
                receiptOcrBadge.style.background = '#FEF3C7';
                receiptOcrBadge.style.color = '#92400E';
            }
            if (receiptItemSummaryText) {
                receiptItemSummaryText.textContent = `분석 중 오류 발생 (${scanErr.message || '네트워크 확인 필요'}). 사진은 저장 가능하며 금액을 직접 입력할 수 있습니다.`;
            }
        }
    });
}

// URL param action=receipt auto-trigger
setTimeout(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('action') === 'receipt') {
        openModal();
        setType('EXPENSE');
        if (receiptFileInput) {
            setTimeout(() => { receiptFileInput.click(); }, 300);
        }
    }
}, 300);
