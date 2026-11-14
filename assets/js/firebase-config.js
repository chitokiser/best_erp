import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, onAuthStateChanged, connectAuthEmulator } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 로컬 테스트 전용: `VITE_FIREBASE_EMULATOR=127.0.0.1 npm run dev` 로 실행하면 Firebase 에뮬레이터
// (demo-* 프로젝트)에 연결된다. 운영 빌드에는 이 변수가 없으므로 영향 없음.
const EMULATOR_HOST = import.meta.env.DEV ? import.meta.env.VITE_FIREBASE_EMULATOR : undefined;

const firebaseConfig = EMULATOR_HOST
    ? { apiKey: 'demo-key', authDomain: `${EMULATOR_HOST}`, projectId: import.meta.env.VITE_FIREBASE_EMULATOR_PROJECT || 'demo-nvr' }
    : {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

if (EMULATOR_HOST) {
    connectFirestoreEmulator(db, EMULATOR_HOST, Number(import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT || 8085));
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT || 9099}`, { disableWarnings: true });
    console.warn(`[DEV] Firebase emulator 사용 중 (${EMULATOR_HOST}, project ${firebaseConfig.projectId})`);
}

// Authentication observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User is logged in:", user.uid);
    } else {
        console.log("User is not logged in");
    }
});
