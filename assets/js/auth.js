import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const registerUser = async (email, password, name) => {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', user.uid), {
            email: email, name: name || email.split('@')[0], position: '시스템 가입자',
            role: 'VIEWER', status: '대기중', createdAt: serverTimestamp()
        });
        return cred.user;
    } catch (err) { throw err; }
};

export const loginAdmin = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        console.error("Login Error:", error);
        throw error;
    }
};

export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google Login Error:", error);
        throw error;
    }
};

export const logoutAdmin = async () => {
    try {
        await signOut(auth);
        window.location.href = '../index.html';
    } catch (error) {
        console.error("Logout Error:", error);
    }
};
window.logoutAndRedirect = logoutAdmin;

export const checkAdminAuth = (onAuthSuccess, onAuthFail) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));

                let role = 'GUEST';
                let position = '방문자';
                let status = '대기중';

                if (!snap.exists() && user.email === 'daguri75@gmail.com') {
                    // First time auto-provisioning for Super Admin
                    await addDoc(collection(db, 'users'), {
                        email: user.email,
                        name: 'CEO',
                        position: '최고 관리자',
                        role: 'SUPER_ADMIN',
                        status: '승인',
                        tenantId: 'system_master',
                        createdAt: serverTimestamp()
                    });
                    role = 'SUPER_ADMIN';
                    position = '최고 관리자';
                    status = '승인';
                    window.tenantId = 'system_master';
                }

                let isMerchant = false;

                if (snap.exists()) {
                    const data = snap.data();
                    role = data.role || data.tier || 'GUEST';
                    position = data.position || data.name || '직원';
                    status = data.status || '대기중';

                    // Jumper Auth DB often uses role='ceo' (lowercase) or 'CEO'
                    if (role === 'ceo') role = 'CEO';

                    isMerchant = !!data.merchantId;

                    if (isMerchant) {
                        role = 'CEO';
                        position = '가맹점 대표';
                        status = '승인완료';
                    }

                    // Store tenant ID globally. Fallback to user email if missing
                    window.tenantId = data.merchantId || data.tenant_id || data.company_id || user.uid;

                    // Fetch dynamic store name for Multi-tenant UI
                    let sName = data.merchantName || data.brandName || data.company_name || data.companyName || data.storeName || data.company || data.name || '미등록 가맹점';
                    if (sName) {
                        window.currentStoreName = sName;
                        document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => el.textContent = sName);
                    }
                    try {
                        const storeSnap = await getDoc(doc(db, 'stores', window.tenantId));
                        if (storeSnap.exists() && storeSnap.data().storeName) {
                            sName = storeSnap.data().storeName;
                            window.currentStoreName = sName;
                            document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => el.textContent = sName);
                        }
                    } catch (err) { console.warn("Failed to load store branding", err); }
                }

                // Global variables for RBAC
                window.currentUserRole = role;
                window.currentUserStatus = status;

                // Stop unapproved users
                if (!isMerchant && !['CEO', 'SUPER_ADMIN', 'ADMIN'].includes(role) && user.email !== 'daguri75@gmail.com') {
                    await signOut(auth);
                    const d = snap.exists() ? snap.data() : {};
                    let errMsg = 'ERP 시스템 접근 권한이 없습니다. (가맹 승인 필요)';
                    if (d.status === 'pending' || d.status === '대기중' || d.role === 'FRANCHISE' || d.role === 'franchise' || d.is_merchant_applicant) {
                        errMsg = '승인 대기 중인 가맹점 계정입니다. 심사 후 이용 가능합니다.';
                    }
                    if (onAuthFail) onAuthFail(errMsg);
                    return;
                }

                if (onAuthSuccess) onAuthSuccess(user);

                // Globally enhance the user badge in the navbar if it exists
                setTimeout(() => {
                    const navEmail = document.getElementById('navUserEmail') || document.querySelector('.top-nav > div[style*="text-align: right"]');
                    if (navEmail && navEmail.id === 'navUserEmail') {
                        navEmail.innerHTML = `
                            <div style="display:flex; flex-direction:column; line-height:1.2; text-align:right; margin-left: 1rem;">
                                <span style="font-size:0.8rem; font-weight:bold; color:var(--primary-color);">${role}</span>
                                <span style="font-size:0.75rem; color:var(--text-secondary);">${position} (${user.email})</span>
                            </div>
                            <button onclick="window.logoutAndRedirect ? window.logoutAndRedirect() : (window.location.href='../index.html')" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold; white-space:nowrap;">[로그아웃]</button>
                        `;
                        navEmail.style.display = 'flex';
                        navEmail.style.alignItems = 'center';
                    }
                }, 100);

            } catch (e) {
                console.error('Auth verification error:', e);
            }
        } else {
            if (onAuthFail) onAuthFail();
        }
    });
};

// Global Hamburger Menu Logic
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    if (hamburgerBtn) {
        hamburgerBtn.addEventListener('click', () => {
            const nav = hamburgerBtn.closest('.top-nav');
            if (nav) {
                nav.classList.toggle('menu-open');
            }
        });
    }
});
