import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAoaGEhlD87Z7za0jjqfGXtbsjcX6S-PAc",
  authDomain: "qcu-marketplace.firebaseapp.com",
  projectId: "qcu-marketplace",
  storageBucket: "qcu-marketplace.firebasestorage.app",
  messagingSenderId: "212298457029",
  appId: "1:212298457029:web:25707a95678ebeb3b5f5ac",
  measurementId: "G-4S2ECC8T4D"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// SIGURADUHIN NA NANDITO ITONG LINYA NA ITO:
export { auth, googleProvider };