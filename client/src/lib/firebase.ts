// ⚡ OPTIMIZED: Lazy load Firebase to reduce initial bundle size
// Firebase is only loaded when user attempts to sign in with Google

let firebasePromise: Promise<any> | null = null;

// Check if Firebase credentials are available
const hasFirebaseCredentials = !!(
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID && 
  import.meta.env.VITE_FIREBASE_APP_ID
);

// Lazy load Firebase modules
async function loadFirebase() {
  if (!hasFirebaseCredentials) {
    throw new Error("Firebase not configured");
  }
  
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import("firebase/app"),
      import("firebase/auth")
    ]).then(([{ initializeApp }, authModule]) => {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      };

      const app = initializeApp(firebaseConfig);
      const auth = authModule.getAuth(app);
      const googleProvider = new authModule.GoogleAuthProvider();
      
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      
      return {
        auth,
        googleProvider,
        signInWithRedirect: authModule.signInWithRedirect,
        getRedirectResult: authModule.getRedirectResult
      };
    });
  }
  
  return firebasePromise;
}

// Legacy exports for compatibility (will lazy load when accessed)
export const auth = null;
export const googleProvider = null;

// Sign in with Google
export async function signInWithGoogle() {
  if (!hasFirebaseCredentials) {
    alert("Firebase credentials not configured. Please set up your Firebase project and add the API keys.");
    return Promise.reject(new Error("Firebase not configured"));
  }
  
  const firebase = await loadFirebase();
  return firebase.signInWithRedirect(firebase.auth, firebase.googleProvider);
}

// Handle redirect result
export async function handleGoogleRedirect() {
  if (!hasFirebaseCredentials) {
    return Promise.resolve(null);
  }
  
  const firebase = await loadFirebase();
  return firebase.getRedirectResult(firebase.auth);
}

// Sign out
export async function signOut() {
  if (!hasFirebaseCredentials) {
    return Promise.resolve();
  }
  
  const firebase = await loadFirebase();
  return firebase.auth.signOut();
}
