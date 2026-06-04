import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, where, onSnapshot, serverTimestamp, increment, runTransaction } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const discordProvider = new OAuthProvider("oidc.discord.com");

discordProvider.addScope("identify");
discordProvider.addScope("email");
discordProvider.setCustomParameters({ prompt: "consent" });

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const signInWithDiscord = () => signInWithPopup(auth, discordProvider);
export const logOut = () => signOut(auth);

export const tournamentsRef = collection(db, "tournaments");
export const usersRef = collection(db, "users");
export const logsRef = collection(db, "logs");
export const invitesRef = collection(db, "invites");

export {
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  increment,
  runTransaction,
};