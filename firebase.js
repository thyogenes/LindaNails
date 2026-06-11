// ============================================================
// firebase.js — Configuração do Firebase
// ⚠️ Substitua pelos dados do SEU projeto Firebase
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
 apiKey: "AIzaSyDUqEulxEsWVOfW5DkWK8d-rAEkn9ilsyg",
  authDomain: "lindanails.firebaseapp.com",
  projectId: "lindanails",
  storageBucket: "lindanails.firebasestorage.app",
  messagingSenderId: "4287453400",
  appId: "1:4287453400:web:d711fe4ab39aff19a09fad"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged };
