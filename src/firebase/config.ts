// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Configuración del proyecto "lapizarra-95eqd"
// These values are used for backend/server-side rendering.
// On the client, Next.js will replace process.env.NEXT_PUBLIC_* with the actual values
// defined in apphosting.yaml for production or a local .env file for development.
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA2XHO-VnkYuAwx3-cQ8xrWb3gzdzvTSow",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "lapizarra-95eqd.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lapizarra-95eqd",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "lapizarra-95eqd.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "303306895935",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:303306895935:web:8111132726548fb6ccfe8a"
};

// Initialize Firebase only once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
export default app;
