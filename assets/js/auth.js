import { auth, db } from './firebase-config.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

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
