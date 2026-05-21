import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  type User,
  type Auth,
} from 'firebase/auth';

// Dev mode: when Firebase isn't configured, skip auth entirely and use dev-token.
export const DEV_MODE = !import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let auth: Auth | null = null;

if (!DEV_MODE) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
}

const googleProvider = new GoogleAuthProvider();

// Email allowlist — configured via VITE_ALLOWED_EMAILS env var (comma-separated).
// When empty, any authenticated Google user is allowed.
const ALLOWED_EMAILS: string[] = (import.meta.env.VITE_ALLOWED_EMAILS || '')
  .split(',')
  .map((e: string) => e.trim().toLowerCase())
  .filter(Boolean);

export function isEmailAllowed(email: string | null): boolean {
  if (!email) return false;
  if (ALLOWED_EMAILS.length === 0) return true;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export async function signInWithGoogle(): Promise<User> {
  if (DEV_MODE || !auth) {
    throw new Error('Firebase not configured — use dev mode');
  }
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;

  if (!isEmailAllowed(user.email)) {
    await firebaseSignOut(auth);
    throw new Error(
      'Access denied. Your email is not authorized to use this application.'
    );
  }

  return user;
}

export async function signOut(): Promise<void> {
  if (auth) {
    await firebaseSignOut(auth);
  }
}

function onAuthStateChanged(
  authInstance: Auth | null,
  callback: (user: User | null) => void
) {
  if (!authInstance) {
    // Dev mode — no Firebase, just call with null immediately
    callback(null);
    return () => {};
  }
  return firebaseOnAuthStateChanged(authInstance, callback);
}

export { auth, onAuthStateChanged };
export type { User };
