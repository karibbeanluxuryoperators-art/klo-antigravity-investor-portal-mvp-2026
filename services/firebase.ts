import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// ── Role Map ────────────────────────────────────────────────────────────────
// Add emails here to assign roles. Everyone else → CLIENT
const ROLE_MAP: Record<string, "ADMIN" | "PARTNER"> = {
  "admin@klo.com": "ADMIN",
  "karibbeanluxuryoperators@gmail.com": "ADMIN",
  "partner@klo.com": "PARTNER",
  // Add more partner emails here as you onboard them
};

export type KLORole = "CLIENT" | "PARTNER" | "ADMIN";

export interface KLOUser {
  uid: string;
  email: string;
  name: string;
  photo: string | null;
  role: KLORole;
}

export function getRole(email: string | null): KLORole {
  if (!email) return "CLIENT";
  return ROLE_MAP[email.toLowerCase()] ?? "CLIENT";
}

export function firebaseUserToKLO(user: User): KLOUser {
  return {
    uid: user.uid,
    email: user.email ?? "",
    name: user.displayName ?? "Guest",
    photo: user.photoURL,
    role: getRole(user.email),
  };
}

// ── Auth Actions ────────────────────────────────────────────────────────────
export async function signInWithGoogle(): Promise<KLOUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return firebaseUserToKLO(result.user);
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onKLOAuthChange(callback: (user: KLOUser | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    callback(user ? firebaseUserToKLO(user) : null);
  });
}
