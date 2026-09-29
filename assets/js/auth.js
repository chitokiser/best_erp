import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const registerUser = async (email, password, name) => {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await addDoc(collection(db, 'users'), {
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

export const checkAdminAuth = (onAuthSuccess, onAuthFail) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (onAuthSuccess) onAuthSuccess(user);

            // Globally enhance the user badge in the navbar if it exists
            setTimeout(async () => {
                const navEmail = document.getElementById('navUserEmail');
                if (navEmail) {
                    try {
                        const q = query(collection(db, 'users'), where('email', '==', user.email));
                        const snap = await getDocs(q);

                        let role = 'GUEST';
                        let position = '방문자';

                        if (snap.empty && user.email === 'daguri75@gmail.com') {
                            // First time auto-provisioning for Super Admin
                            await addDoc(collection(db, 'users'), {
                                email: user.email,
                                name: 'CEO',
                                position: '최고 관리자',
                                role: 'SUPER_ADMIN',
                                status: '승인됨',
                                createdAt: serverTimestamp()
                            });
                            role = 'SUPER_ADMIN';
                            position = '최고 관리자';
                        } else if (!snap.empty) {
                            const data = snap.docs[0].data();
                            role = data.role || 'GUEST';
                            position = data.position || data.name || '직원';
                        }

                        navEmail.innerHTML = `
                            <div style="display:flex; flex-direction:column; line-height:1.2; text-align:right; margin-left: 1rem;">
                                <span style="font-size:0.8rem; font-weight:bold; color:var(--primary-color);">${role}</span>
                                <span style="font-size:0.75rem; color:var(--text-secondary);">${position} (${user.email})</span>
                            </div>
                            <button onclick="window.logoutAndRedirect ? window.logoutAndRedirect() : (window.location.href='../index.html')" style="margin-left:0.5rem; background:none; border:none; cursor:pointer; color:var(--primary-color); font-weight:bold; white-space:nowrap;">[로그아웃]</button>
                        `;
                        navEmail.style.display = 'flex';
                        navEmail.style.alignItems = 'center';
                    } catch (e) {
                        console.error('Navbar user fetch error:', e);
                    }
                }
            }, 300);
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

// Inject Emergency Mobile Nav CSS to bypass Vite Cache
(function() {
    const style = document.createElement('style');
    style.innerHTML = 
        .mobile-only { display: none !important; }
        
        @media (max-width: 768px) {
            .mobile-only { display: block !important; }
            .logo-container { width: 100% !important; justify-content: space-between !important; margin-bottom: 1rem !important; }
            
            .top-nav { flex-direction: column !important; align-items: flex-start !important; }
            .top-nav ul { display: none !important; }
            .top-nav > div:last-child { display: none !important; }
            
            .top-nav.menu-open ul { 
                display: flex !important; flex-direction: column !important; 
                background: white; width: 100%; border-radius: 0.5rem; 
                box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 0.5rem !important; gap: 0 !important; 
            }
            .top-nav.menu-open > div:last-child { display: block !important; }
            .top-nav.menu-open ul li { width: 100%; border-bottom: 1px solid #f1f5f9; }
            .top-nav.menu-open ul li a { display: block !important; padding: 1rem !important; font-size: 1.1rem !important; text-align: center; white-space: normal !important; }
            
            th, td, .form-group label, .card-title, .summary-label { font-size: 0.8rem !important; padding: 0.6rem !important; }
            .card-value, .summary-val { font-size: 1.2rem !important; }
            h2 { font-size: 1.2rem !important; }
            h3 { font-size: 1rem !important; }
        }
        
        /* PC Anti-squish */
        .top-nav ul { flex-wrap: nowrap !important; }
        .top-nav ul li a { white-space: nowrap !important; }
    ;
    document.head.appendChild(style);
})();
