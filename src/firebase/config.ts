// src/firebase/config.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Configuración del proyecto "lapizarra-95eqd"
export const firebaseConfig = {
  apiKey: "AIzaSyA2XHO-VnkYuAwx3-cQ8xrWb3gzdzvTSow",
  authDomain: "lapizarra-95eqd.firebaseapp.com",
  projectId: "lapizarra-95eqd",
  storageBucket: "lapizarra-95eqd.appspot.com",
  messagingSenderId: "303306895935",
  appId: "1:303306895935:web:463b38b92cc31842ccfe8a"
};

// Inicializa Firebase solo una vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
export default app;
