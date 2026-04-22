import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "therasense-b0c8a.firebasestorage.app"

const firebaseConfig = {
  apiKey: "AIzaSyAiX1RRxndc8kwTdS6S5vOoTTRNzVRKjfY",
  authDomain: "therasense-b0c8a.firebaseapp.com",
  projectId: "therasense-b0c8a",
  storageBucket,
  messagingSenderId: "648455984190",
  appId: "1:648455984190:web:57e8b4fb9b1674f750ed6f",
  measurementId: "G-824TY63N25"
};

const app = initializeApp(firebaseConfig);

const firebaseAuth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const firestoreDb = getFirestore(app)
const firebaseStorage = getStorage(app)

let analytics = null;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

export { firebaseAuth, googleProvider, firestoreDb, firebaseStorage, analytics };