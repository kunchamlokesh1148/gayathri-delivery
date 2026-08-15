import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD8HkU-GlMjqe0oTHzlKO929676jTaAdYg",
  authDomain: "gayathri-c0c79.firebaseapp.com",
  projectId: "gayathri-c0c79",
  storageBucket: "gayathri-c0c79.firebasestorage.app",
  messagingSenderId: "559006653229",
  appId: "1:559006653229:web:37bb35b002b88fcda611a4",
  measurementId: "G-VWTZBV9G3X"
};

let app;
let auth = null;
let db = null;
let storage = null;
let isFirebaseActive = false;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  isFirebaseActive = true;
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase failed to initialize:", error);
}

export { auth, db, storage, isFirebaseActive };
