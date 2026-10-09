import { auth, db } from './firebase-config.js';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { checkAdminAuth } from './auth.js';

let storedMentees = [];

async function loadMentees() {
    const tbody = document.getElementById('menteeTableBody');
    try {
        // Query users where this store is their mentor (Using merchantId mapping from Phase 1)
        // Or if they explicitly scanned the QR event (where we could stamp storeId).
        // Since we fall back to global Jumper DB schema, we query where 'mentorEmail' == my email, etc.
        const q = query(collection(db, 'users'), where('mentorEmail', '==', window.currentUserEmail || auth.currentUser?.email || ''));
        const snap = await getDocs(q);
        
        let mentees = snap.docs.map(doc => {
            const d = doc.data();
            return {
                uid: doc.id,
                email: d.email || "",
                name: d.name || "고객",
                phone: d.phone || "",
                registeredAt: d.createdAt || d.registeredAt || null,
                lastEventAt: d.lastEventAt || null,
                points: d.points || d.generatedForMentor || 0
            };
        });

        // Augment missing emails
        for (let i = 0; i < mentees.length; i++) {
            if (!mentees[i].email && mentees[i].uid) {
                try {
                    const docSnap = await getDoc(doc(db, 'users', mentees[i].uid));
                    if (docSnap.exists()) {
                        mentees[i].email = docSnap.data().email || "";
                        if (!mentees[i].name) mentees[i].name = docSnap.data().name || "";
                    }
                } catch(e) {}
            }
        }
        storedMentees = mentees;
        renderMentees();
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">에러: ${e.message}</td></tr>`;
    }
}

window.renderMentees = function() {
    const tbody = document.getElementById('menteeTableBody');
    const searchVal = document.getElementById('CRM_search').value.toLowerCase();
    const filterAmt = document.getElementById('CRM_filterAmount').value;

    let filtered = storedMentees.filter(m => {
        let matchSearch = !searchVal || (m.name && m.name.toLowerCase().includes(searchVal)) || (m.email && m.email.toLowerCase().includes(searchVal));
        let matchAmt = true;
        if (filterAmt !== 'all') {
            matchAmt = (m.points || 0) >= Number(filterAmt);
        }
        return matchSearch && matchAmt;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:2rem; color:#64748b;">조건에 맞는 회원이 없습니다.</td></tr>';
        return;
    }

    let html = '';
    filtered.forEach(m => {
        const joinStr = m.registeredAt ? new Date(m.registeredAt.toDate ? m.registeredAt.toDate() : m.registeredAt).toLocaleDateString() : '최근';
        const eventStr = m.lastEventAt ? new Date(m.lastEventAt.toDate ? m.lastEventAt.toDate() : m.lastEventAt).toLocaleDateString() : '-';
        const p = (m.points || 0);
        
        let tier = `<span class="tag-status tag-new">신규 (NEW)</span>`;
        if (p >= 5000) tier = `<span class="tag-status tag-vip">VIP (우수)</span>`;
        else if (p >= 1000) tier = `<span class="tag-status tag-normal">일반 (Normal)</span>`;

        html += `
            <tr>
                <td style="color:#64748b; font-size:0.85rem;">${m.email || m.uid.substring(0,8)+'...'}</td>
                <td style="font-weight:600; color:#1e293b;">${m.name || '익명'}</td>
                <td>${joinStr} <br><span style="font-size:0.75rem; color:#94a3b8;">행운 참여: ${eventStr}</span></td>
                <td style="color:#059669; font-weight:800;">${p.toLocaleString()} P</td>
                <td>${tier}</td>
                <td><button onclick="giftPoint('${m.uid}', '${m.name}')" style="background:#4F46E5; color:white; border:none; padding:0.4rem 0.8rem; border-radius:0.4rem; cursor:pointer; font-weight:600; font-size:0.75rem;">+ 보너스 P 지급</button></td>
                <td><button onclick="viewOrders('${m.uid}')" style="padding:0.4rem 0.8rem; border:1px solid #e2e8f0; border-radius:0.4rem; background:white; cursor:pointer;">내역</button></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
};

window.giftPoint = async function(uid, name) {
    const amt = prompt(`${name} 고객에게 지급할 서비스 포인트(P)를 입력하세요.\n(리뷰 작성, 특별 보상 등)`);
    if (!amt || isNaN(amt) || Number(amt) <= 0) return;
    
    try {
        await updateDoc(doc(db, 'users', uid), {
            points: increment(Number(amt)),
            generatedForMentor: increment(Number(amt))
        });
        alert(`${amt} P 가 성공적으로 지급되었습니다!`);
        
        const m = storedMentees.find(x => x.uid === uid);
        if (m) m.points = (m.points || 0) + Number(amt);
        renderMentees();
    } catch(e) { alert('지급 실패: ' + e.message); }
};

window.viewOrders = async function(menteeId) {
    alert('해당 고객의 상세 구매 내역을 불러옵니다. (기존 Phase 1 동일 기능)');
};

window.exportToCSV = function() {
    let csv = '계정ID,이름,포인트\n';
    storedMentees.forEach(m => {
        csv += `${m.email||m.uid},${m.name},${m.points}\n`;
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `CRM_VIP_Export.csv`;
    link.click();
};

checkAdminAuth((user) => {
    window.currentUserEmail = user.email;
    loadMentees();
});
