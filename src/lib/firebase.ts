import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Check if variables are provided in (import.meta as any).env or fallback to hardcoded keys
const metaEnv = (import.meta as any).env || {};
const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyCbfJN0YwcS_Gd5-rY5mJ1nsA0Uy1arwgA",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "double-composition-667s8.firebaseapp.com",
  projectId: metaEnv.VITE_FIREBASE_PROJECT_ID || "double-composition-667s8",
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "double-composition-667s8.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "158055240353",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:158055240353:web:fe2c28baad710109f6d6e0"
};

let app;
let auth: any;
let db: any;
let isRealFirebase = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  auth = getAuth(app);
  db = getFirestore(app, "ai-studio-b37509cf-5a5d-4dd7-be69-7e2538cd2dc8");
  isRealFirebase = true;
} catch (error) {
  console.warn("Firebase lazy initialization failed:", error);
}

export { db, auth };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Seamless Auth Interface
export interface GoogleUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export type AuthStateCallback = (user: GoogleUser | null) => void;

class CustomAuthService {
  private listeners: AuthStateCallback[] = [];
  private currentUser: GoogleUser | null = null;
  private cachedAccessToken: string | null = null;

  constructor() {
    // Check localStorage for persisted real session
    const saved = localStorage.getItem("user_session");
    if (saved) {
      try {
        this.currentUser = JSON.parse(saved);
      } catch {
        this.currentUser = null;
      }
    }

    if (isRealFirebase && auth) {
      // Check for redirect result when the page loads (handles logins that redirected instead of popup)
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            const u: GoogleUser = {
              uid: result.user.uid,
              displayName: result.user.displayName,
              email: result.user.email,
              photoURL: result.user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${result.user.email}`
            };
            this.currentUser = u;
            const credential = GoogleAuthProvider.credentialFromResult(result);
            if (credential) {
              this.cachedAccessToken = credential.accessToken || null;
            }
            localStorage.setItem("user_session", JSON.stringify(u));
            this.notifyListeners();
          }
        })
        .catch((err) => {
          console.warn("getRedirectResult exception (may be normal if no redirect occurred):", err);
        });

      onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
          const u: GoogleUser = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${firebaseUser.email}`
          };
          this.currentUser = u;
          localStorage.setItem("user_session", JSON.stringify(u));
          this.notifyListeners();
        } else {
          this.currentUser = null;
          this.cachedAccessToken = null;
          localStorage.removeItem("user_session");
          this.notifyListeners();
        }
      });
    }
  }

  getCurrentUser(): GoogleUser | null {
    return this.currentUser;
  }

  getAccessToken(): string | null {
    return this.cachedAccessToken;
  }

  setAccessToken(token: string | null) {
    this.cachedAccessToken = token;
  }

  // Subscribe to auth state changes
  subscribe(callback: AuthStateCallback): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  // Check if current configuration is dummy
  isConfigDummy(): boolean {
    return firebaseConfig.apiKey === "AIzaSyDummyKeyForPreviewSandbox123456";
  }

  async loginWithGoogle(): Promise<GoogleUser> {
    if (isRealFirebase && auth) {
      const provider = new GoogleAuthProvider();

      try {
        // Try sign signInWithPopup first
        const result = await signInWithPopup(auth, provider);
        const u: GoogleUser = {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${result.user.email}`
        };
        
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential) {
          this.cachedAccessToken = credential.accessToken || null;
        }

        this.currentUser = u;
        localStorage.setItem("user_session", JSON.stringify(u));
        this.notifyListeners();
        return u;
      } catch (err: any) {
        // If popup was blocked or closed, try redirect login to make sure user gets signed in securely
        const isPopupBlockedOrFailed = err instanceof Error && (
          err.message.includes("popup-blocked") || 
          err.message.includes("popup-closed-by-user") ||
          (err as any).code === "auth/popup-blocked" ||
          (err as any).code === "auth/popup-closed-by-user"
        );

        if (isPopupBlockedOrFailed) {
          console.warn("Google Sign-In popup failed or blocked. Automatically launching redirect sign-in...", err);
          try {
            await signInWithRedirect(auth, provider);
            // This starts a page redirect, returning a pending promise so the UI knows to stay loading
            return new Promise(() => {});
          } catch (redirectErr) {
            console.error("Firebase Sign-In Redirect failed:", redirectErr);
            throw redirectErr;
          }
        } else {
          // Re-throw other real authentication errors (e.g. invalid API key, network error)
          throw err;
        }
      }
    } else {
      throw new Error("Local instance check: Firebase Auth is not active on this workspace.");
    }
  }

  async loginWithEmailAndPassword(email: string, password: string): Promise<GoogleUser> {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const cleanEmail = email.trim().toLowerCase();
    try {
      const userDocRef = doc(db, "users", cleanEmail);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        console.log(`Email ${cleanEmail} not registered. Auto-registering user...`);
        // If they don't have an account yet, automatically register them!
        // This provides a seamless, 100% friction-free flow for the user.
        return await this.registerWithEmailAndPassword(cleanEmail, password, cleanEmail.split("@")[0]);
      }

      const userData = userSnap.data();
      
      // Compute hash of the entered password
      const msgBuffer = new TextEncoder().encode(password + "streamhub_secure_salt!");
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const enteredHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      if (userData.passwordHash !== enteredHash) {
        throw new Error("Incorrect password. Please verify and try again. (पासवर्ड गलत है। कृपया सही पासवर्ड दर्ज करें।)");
      }

      const u: GoogleUser = {
        uid: userData.userId || "usr_" + Math.random().toString(36).substr(2, 9),
        displayName: userData.displayName || cleanEmail.split("@")[0],
        email: userData.email || cleanEmail,
        photoURL: userData.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanEmail}`
      };

      this.currentUser = u;
      localStorage.setItem("user_session", JSON.stringify(u));
      this.notifyListeners();
      return u;
    } catch (err: any) {
      console.error("Custom Email/Password Sign-In failed:", err);
      throw err;
    }
  }

  async registerWithEmailAndPassword(email: string, password: string, displayName: string): Promise<GoogleUser> {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const cleanEmail = email.trim().toLowerCase();
    try {
      const userDocRef = doc(db, "users", cleanEmail);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        throw new Error("This email is already in use. Try logging in instead. (यह ईमेल आईडी पहले से ही रजिस्टर्ड है। कृपया लॉगिन करें।)");
      }

      // Compute hash of the password
      const msgBuffer = new TextEncoder().encode(password + "streamhub_secure_salt!");
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const customUid = "usr_" + Math.random().toString(36).substr(2, 12);

      const u: GoogleUser = {
        uid: customUid,
        displayName: displayName.trim() || cleanEmail.split("@")[0],
        email: cleanEmail,
        photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanEmail}`
      };

      await setDoc(userDocRef, {
        userId: customUid,
        email: cleanEmail,
        displayName: displayName.trim() || cleanEmail.split("@")[0],
        passwordHash: passwordHash,
        createdAt: serverTimestamp()
      });

      this.currentUser = u;
      localStorage.setItem("user_session", JSON.stringify(u));
      this.notifyListeners();
      return u;
    } catch (err: any) {
      console.error("Custom Email/Password SignUp failed:", err);
      throw err;
    }
  }

  async sendOtp(email: string): Promise<{ success: boolean; otp?: string; message: string; warning?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to send verification OTP.");
      }

      return {
        success: true,
        otp: data.otp,
        message: data.message,
        warning: data.warning
      };
    } catch (err: any) {
      console.error("sendOtp failed:", err);
      throw err;
    }
  }

  async verifyOtp(email: string, otp: string, displayName?: string): Promise<GoogleUser> {
    if (!db) {
      throw new Error("Firestore database is not initialized.");
    }
    const cleanEmail = email.trim().toLowerCase();
    
    try {
      // 1. Verify with Backend OTP Engine
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to verify. Invalid or expired OTP.");
      }

      // 2. Fetch or Sync Firestore Document
      const userDocRef = doc(db, "users", cleanEmail);
      const userSnap = await getDoc(userDocRef);

      let u: GoogleUser;

      if (userSnap.exists()) {
        const userData = userSnap.data();
        u = {
          uid: userData.userId || "usr_" + Math.random().toString(36).substr(2, 9),
          displayName: userData.displayName || cleanEmail.split("@")[0],
          email: userData.email || cleanEmail,
          photoURL: userData.photoURL || `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanEmail}`
        };
      } else {
        // Automatically register new user!
        const customUid = "usr_" + Math.random().toString(36).substr(2, 12);
        const nameToUse = (displayName || cleanEmail.split("@")[0]).trim();
        u = {
          uid: customUid,
          displayName: nameToUse,
          email: cleanEmail,
          photoURL: `https://api.dicebear.com/7.x/adventurer/svg?seed=${cleanEmail}`
        };

        await setDoc(userDocRef, {
          userId: customUid,
          email: cleanEmail,
          displayName: nameToUse,
          createdAt: serverTimestamp()
        });
      }

      this.currentUser = u;
      localStorage.setItem("user_session", JSON.stringify(u));
      this.notifyListeners();
      return u;
    } catch (err: any) {
      console.error("verifyOtp failed:", err);
      throw err;
    }
  }

  async logout(): Promise<void> {
    if (isRealFirebase && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Firebase logout error:", err);
      }
    }
    this.currentUser = null;
    this.cachedAccessToken = null;
    localStorage.removeItem("user_session");
    this.notifyListeners();
  }
}

export const authService = new CustomAuthService();
