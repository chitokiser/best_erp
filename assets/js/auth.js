import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';

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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            // Can add custom claim check or specific UID check here for 'ADMIN'
            if (onAuthSuccess) onAuthSuccess(user);
        } else {
            if (onAuthFail) onAuthFail();
        }
    });
};
