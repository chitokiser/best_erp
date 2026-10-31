import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const registerUser = async (email, password, name) => {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
            email: email, name: name || email.split('@')[0], position: '시스템 가입자',
            role: 'VIEWER', status: '대기중', createdAt: serverTimestamp()
        }, { merge: true });
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
        const isInAdminDir = window.location.pathname.includes('/admin/');
        window.location.href = isInAdminDir ? '../login.html' : 'login.html';
    } catch (error) {
        console.error("Logout Error:", error);
    }
};
window.logoutAndRedirect = logoutAdmin;

export const checkAdminAuth = (onAuthSuccess, onAuthFail) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                window.currentUserEmail = user.email || '';
                window.currentUserUid = user.uid || '';

                let snap = null;
                try {
                    snap = await getDoc(doc(db, 'users', user.uid));
                } catch (docErr) {
                    console.warn('users doc fetch warning:', docErr);
                }

                let role = 'GUEST';
                let position = '방문자';
                let status = '대기중';

                if ((!snap || !snap.exists()) && user.email === 'daguri75@gmail.com') {
                    // First time auto-provisioning for Super Admin
                    try {
                        await setDoc(doc(db, 'users', user.uid), {
                            email: user.email,
                            name: 'CEO',
                            position: '최고 관리자',
                            role: 'SUPER_ADMIN',
                            status: '승인',
                            tenantId: 'system_master',
                            createdAt: serverTimestamp()
                        }, { merge: true });
                    } catch (e) {}
                    role = 'SUPER_ADMIN';
                    position = '최고 관리자';
                    status = '승인';
                    window.tenantId = 'system_master';
                }

                let isMerchant = false;

                if (snap && snap.exists()) {
                    const data = snap.data();
                    const rawRole = (data.role || data.tier || 'GUEST').toUpperCase();
                    role = rawRole;
                    position = data.position || data.name || '직원';
                    status = data.status || '대기중';

                    const isStaffRole = ['STAFF', 'EMPLOYEE'].includes(rawRole);
                    isMerchant = !!(data.merchantId || data.merchant_id);

                    if (isStaffRole) {
                        role = 'STAFF';
                        position = data.position || '가맹점 직원';
                        status = '승인완료';
                    } else if (isMerchant || ['FRANCHISE', 'CEO', 'MERCHANT'].includes(rawRole)) {
                        role = 'CEO';
                        position = '가맹점 대표';
                        status = '승인완료';
                    }

                    // Store tenant ID globally as String to prevent doc() path errors
                    window.tenantId = String(data.merchantId || data.merchant_id || data.tenantId || data.tenant_id || data.company_id || '1791605366');

                    // Fetch dynamic store name for Multi-tenant UI
                    let sName = data.merchantName || data.brandName || data.company_name || data.companyName || data.storeName || data.company || data.name || 'BEST WINNER';
                    if (sName) {
                        window.currentStoreName = sName;
                        document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => el.textContent = sName);
                    }
                    if (window.tenantId && window.tenantId !== 'undefined' && window.tenantId !== 'null' && window.tenantId !== 'system_master') {
                        try {
                            const storeSnap = await getDoc(doc(db, 'stores', String(window.tenantId)));
                            if (storeSnap.exists() && storeSnap.data().storeName) {
                                sName = storeSnap.data().storeName;
                                window.currentStoreName = sName;
                                document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => el.textContent = sName);
                            }
                        } catch (err) { console.warn("Failed to load store branding", err); }
                    }
                }

                // 🚨 CRITICAL: hexttokenopbnb@gmail.com은 최고관리자가 아닌 BEST WINNER 가맹점 점주(CEO)
                const userEmailLower = (user.email || '').toLowerCase().trim();
                if (userEmailLower === 'hexttokenopbnb@gmail.com') {
                    role = 'CEO';
                    position = '가맹점 대표 (BEST WINNER)';
                    status = '승인완료';
                    isMerchant = true;
                    window.tenantId = '1791605366';
                    window.currentStoreName = 'BEST WINNER';

                    // Ensure Firestore user document has CEO role & status so security rules always permit access
                    try {
                        await setDoc(doc(db, 'users', user.uid), {
                            email: user.email,
                            role: 'CEO',
                            status: '승인완료',
                            position: '가맹점 대표 (BEST WINNER)',
                            merchantId: '1791605366',
                            tenantId: '1791605366'
                        }, { merge: true });
                    } catch (err) { console.warn("Failed to sync user doc to firestore", err); }
                } else if (userEmailLower === 'daguri75@gmail.com') {
                    role = 'SUPER_ADMIN';
                    position = '최고 관리자';
                    status = '승인';
                    window.tenantId = 'system_master';
                    window.currentStoreName = 'BEST M-SaaS 본사';
                } else if (role === 'SUPER_ADMIN') {
                    // daguri75@gmail.com 외의 계정은 SUPER_ADMIN 권한 획득 불가
                    role = 'CEO';
                    position = '가맹점 대표';
                }

                // 🔍 직원(STAFF) Fail-safe: users에 STAFF role이 없더라도 employees 컬렉션에 등록되어 있으면 자동 승인
                const allowedRoles = ['CEO', 'SUPER_ADMIN', 'ADMIN', 'STAFF', 'EMPLOYEE'];
                if (!allowedRoles.includes(role) && userEmailLower !== 'daguri75@gmail.com') {
                    try {
                        const empSnap = await getDocs(query(collection(db, 'employees'), where('contact', '==', user.email)));
                        if (!empSnap.empty) {
                            const empData = empSnap.docs[0].data();
                            role = 'STAFF';
                            position = empData.position || '가맹점 직원';
                            status = '승인완료';
                            if (empData.tenantId) {
                                window.tenantId = String(empData.tenantId);
                                window.currentStoreName = empData.storeName || window.currentStoreName;
                            }
                            // Sync users doc in background so subsequent checks are instant
                            try {
                                await setDoc(doc(db, 'users', user.uid), {
                                    email: user.email,
                                    role: 'STAFF',
                                    status: '승인완료',
                                    position: position,
                                    department: empData.department || '',
                                    merchantId: window.tenantId,
                                    tenantId: window.tenantId,
                                    storeName: window.currentStoreName
                                }, { merge: true });
                            } catch (e) {}
                        }
                    } catch (empCheckErr) {
                        console.warn("Employee lookup check failed:", empCheckErr);
                    }
                }

                // Default fallback for tenantId & currentStoreName so UI never stays on 가맹점(로딩중)
                if (!window.tenantId || window.tenantId === 'undefined' || window.tenantId === 'null') {
                    window.tenantId = '1791605366';
                }
                if (!window.currentStoreName || window.currentStoreName === '미등록 가맹점') {
                    window.currentStoreName = window.tenantId === '1791002036' ? '대한김치' : 'BEST WINNER';
                }
                document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => {
                    el.textContent = window.currentStoreName;
                });

                // Global variables for RBAC
                window.currentUserRole = role;
                window.currentUserPosition = position;
                window.currentUserStatus = status;

                // Stop unapproved users
                if (!isMerchant && !allowedRoles.includes(role) && userEmailLower !== 'daguri75@gmail.com') {
                    await signOut(auth);
                    const d = (snap && snap.exists()) ? snap.data() : {};
                    let errMsg = 'ERP 시스템 접근 권한이 없습니다. (가맹 승인 또는 직원 등록 필요)';
                    if (d.status === 'pending' || d.status === '대기중' || d.role === 'FRANCHISE' || d.role === 'franchise' || d.is_merchant_applicant) {
                        errMsg = '승인 대기 중인 계정입니다. 심사 후 이용 가능합니다.';
                    }
                    if (onAuthFail) {
                        onAuthFail(errMsg);
                    } else if (window.location.pathname.includes('/admin/')) {
                        alert(errMsg);
                        window.location.href = '../login.html';
                    }
                    return;
                }

                if (onAuthSuccess) onAuthSuccess(user);

                // Globally enhance the user badge in the navbar on all admin pages
                setTimeout(() => {
                    const navEmail = document.getElementById('navUserEmail') || 
                                     document.getElementById('navUserEmailSpan')?.closest('div') ||
                                     document.querySelector('.top-nav > div[style*="text-align: right"]') ||
                                     document.querySelector('.top-nav > div[style*="text-align:right"]');
                    if (navEmail) {
                        navEmail.innerHTML = `
                            <div style="display:flex; flex-direction:column; line-height:1.2; text-align:right; margin-left: 1rem;">
                                <span style="font-size:0.8rem; font-weight:bold; color:var(--primary-color, #4F46E5);">${role}</span>
                                <span style="font-size:0.75rem; color:var(--text-secondary, #64748b);">${position} (${user.email})</span>
                            </div>
                            <button onclick="window.logoutAndRedirect ? window.logoutAndRedirect() : (window.location.href='../login.html')" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color, #2563eb); font-weight:bold; white-space:nowrap;">[로그아웃]</button>
                        `;
                        navEmail.style.display = 'flex';
                        navEmail.style.alignItems = 'center';
                    }

                    // 헤더 브랜드 동적 연동 (가맹점명 표출)
                    if (window.currentStoreName) {
                        document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => el.textContent = window.currentStoreName);
                        document.querySelectorAll('.top-nav h1').forEach(h1 => {
                            h1.innerHTML = `<span style="color:#ef4444;" class="dynamic-brand-text">${window.currentStoreName}</span> <span style="color:var(--text-primary, #1e293b); font-size:1.15rem; font-weight:700;">M-SaaS</span>`;
                        });
                    }

                    // 🔒 RBAC: 고객관리 하위 'SaaS 회원관리' 메뉴는 daguri75@gmail.com 최고관리자에게만 노출
                    const isSuperAdmin = userEmailLower === 'daguri75@gmail.com';
                    document.querySelectorAll('a[href="users.html"], .saas-admin-only').forEach(el => {
                        if (isSuperAdmin) {
                            el.style.display = 'block';
                        } else {
                            el.remove();
                        }
                    });

                    // 현재 활성화된 메뉴 탭 자동 하이라이트
                    const currentFile = window.location.pathname.split('/').pop() || 'dashboard.html';
                    document.querySelectorAll('#navMenuList a, .top-nav ul a').forEach(a => {
                        const href = a.getAttribute('href');
                        if (href === currentFile || (currentFile === '' && href === 'dashboard.html')) {
                            a.style.color = '#4F46E5';
                            a.style.fontWeight = '700';
                            a.style.background = 'var(--ai-primary-light, #eef2ff)';
                            const parentDropdown = a.closest('.dropdown');
                            if (parentDropdown) {
                                const dropbtn = parentDropdown.querySelector('.dropbtn');
                                if (dropbtn) {
                                    dropbtn.style.color = '#4F46E5';
                                    dropbtn.style.fontWeight = '700';
                                }
                            }
                        }
                    });
                }, 50);

            } catch (e) {
                console.error('Auth verification error:', e);
                if (onAuthSuccess) onAuthSuccess(user);
            }
        } else {
            // 비로그인 상태일 때 '가맹점(로딩중)' 또는 '조회 중...' 무한 대기 방지
            document.querySelectorAll('.dynamic-brand-text, #dynamicStoreName').forEach(el => {
                if (el.textContent.includes('로딩중')) el.textContent = 'BEST M-SaaS';
            });
            const navEmail = document.getElementById('navUserEmail');
            const isInAdminDir = window.location.pathname.includes('/admin/');
            const loginPath = isInAdminDir ? '../login.html' : 'login.html';
            const currentUrl = window.location.pathname + window.location.search;

            if (navEmail) {
                navEmail.innerHTML = `<button onclick="window.location.href='${loginPath}?redirect=${encodeURIComponent(currentUrl)}'" style="margin-left:1rem; padding:0.45rem 0.9rem; background:#4F46E5; color:white; border:none; border-radius:0.4rem; cursor:pointer; font-weight:700; white-space:nowrap;">🔐 로그인</button>`;
                navEmail.style.display = 'flex';
                navEmail.style.alignItems = 'center';
            }

            if (onAuthFail) {
                onAuthFail('로그인이 필요한 화면입니다.');
            } else if (isInAdminDir && !window.location.pathname.endsWith('login.html')) {
                window.location.href = `${loginPath}?redirect=${encodeURIComponent(currentUrl)}`;
            }
        }
    });
};

// Global Mobile Navigation Logic
window.toggleNavMenu = () => {
    const nav = document.querySelector('.top-nav');
    if (nav) nav.classList.toggle('menu-open');
};

window.toggleDropdown = (el, e) => {
    // If clicking on an anchor tag, allow normal navigation!
    if (e && e.target && e.target.closest('a')) {
        return;
    }

    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const dd = el.closest('.dropdown') || el;
    if (!dd) return;

    // Close any other open dropdowns first
    document.querySelectorAll('.dropdown.is-open').forEach(other => {
        if (other !== dd) other.classList.remove('is-open');
    });

    dd.classList.toggle('is-open');
};

function setupMobileNav() {
    const nav = document.querySelector('.top-nav');
    if (!nav) return;

    // Check if hamburger button exists
    let toggleBtn = nav.querySelector('.mobile-nav-toggle, #hamburgerBtn, .mobile-only-btn');
    if (!toggleBtn) {
        toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-nav-toggle';
        toggleBtn.setAttribute('aria-label', '메뉴 열기');
        toggleBtn.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`;
        
        const brand = nav.querySelector('.nav-brand, .logo-container, div:first-child');
        if (brand && brand.parentNode) {
            brand.parentNode.insertBefore(toggleBtn, brand.nextSibling);
        } else {
            nav.prepend(toggleBtn);
        }
    }

    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        window.toggleNavMenu();
    };

    // Close when clicking outside
    document.addEventListener('click', (e) => {
        // If clicking on an anchor tag, let it navigate!
        if (e.target.closest('a')) return;

        // If clicking outside any dropdown, close open dropdowns
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown.is-open').forEach(dd => {
                dd.classList.remove('is-open');
            });
        }

        if (nav.classList.contains('menu-open') && !nav.contains(e.target)) {
            nav.classList.remove('menu-open');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMobileNav);
} else {
    setupMobileNav();
}
