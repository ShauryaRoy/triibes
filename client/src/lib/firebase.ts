import { initializeApp } from "firebase/app";
import { getAuth, signInWithRedirect, GoogleAuthProvider, getRedirectResult } from "firebase/auth";

// Check if Firebase credentials are available
const hasFirebaseCredentials = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_APP_ID
);

let app: any = null;
let auth: any = null;
let googleProvider: any = null;

if (hasFirebaseCredentials) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  
  // Configure Google provider
  if (googleProvider) {
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  }
}

export { auth, googleProvider };

// Sign in with Google
export function signInWithGoogle() {
  if (!hasFirebaseCredentials) {
    alert("Firebase credentials not configured. Please set up your Firebase project and add the API keys.");
    return Promise.reject(new Error("Firebase not configured"));
  }
  return signInWithRedirect(auth, googleProvider);
}

// Handle redirect result
export function handleGoogleRedirect() {
  if (!hasFirebaseCredentials) {
    return Promise.resolve(null);
  }
  return getRedirectResult(auth);
}

// Sign out
export function signOut() {
  if (!hasFirebaseCredentials) {
    return Promise.resolve();
  }
  return auth.signOut();
}
