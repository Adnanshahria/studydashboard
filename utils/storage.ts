
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc, Firestore, initializeFirestore, persistentLocalCache, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, Auth } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../constants';
import { UserData, UserSettings } from '../types';

const FIREBASE_USER_COLLECTION = 'users';
const DOMAIN = '@study-dashboard.com';

// --- Singleton Initialization ---
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let firebaseAuth: Auth;

try {
    if (getApps().length === 0) {
        firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
        firebaseApp = getApp();
    }
    
    firebaseAuth = getAuth(firebaseApp);

    firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache(), 
        ignoreUndefinedProperties: true 
    });
    
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("CRITICAL: Firebase Initialization Failed", error);
}

// --- Helper: Sanitize Data ---
// Removes undefined values to prevent Firestore errors
const sanitize = (obj: any): any => {
    if (obj === undefined) return null;
    if (obj === null) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    
    const newObj: any = {};
    for (const key in obj) {
        const val = obj[key];
        if (val !== undefined) {
            newObj[key] = sanitize(val);
        }
    }
    return newObj;
};

// --- IndexedDB Utils (Legacy) ---
const DB_NAME = 'AS_Study_Dashboard';
const STORE_NAME = 'userData';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve({} as any); return; }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = () => resolve({} as any); 
  });
};

let db: IDBDatabase | null = null;

export const dbPut = async (storeName: string, data: { id: string; value: any }) => {
  try {
      if (!db) await openDB();
      // Basic implementation
  } catch (e) { console.error(e); }
};

export const dbClear = async (storeName: string) => {
  // Basic implementation
};

export const cleanupStorage = () => {
    // Placeholder
};

// --- Main Sync Hook ---

const ensureUserDoc = async (uid: string, initialSettings?: UserSettings, initialData?: UserData) => {
    if (!firestore || !uid) return;
    const ref = doc(firestore, FIREBASE_USER_COLLECTION, uid);
    try {
        const snap = await getDoc(ref);
        if (!snap.exists()) {
            await setDoc(ref, {
                createdAt: new Date().toISOString(),
                settings: sanitize(initialSettings || {}),
                data: sanitize(initialData || {})
            });
            return true;
        }
    } catch (e) {
        console.error("Error checking user doc:", e);
    }
    return false;
};

export const initFirebase = async (
    uid: string, 
    onData: (data: UserData | null, settings: UserSettings | null) => void,
    onStatus: (status: 'connected' | 'disconnected') => void,
    localSettingsToMigrate?: UserSettings,
    localDataToMigrate?: UserData
) => {
    try {
        if (!firestore) throw new Error("Firestore not initialized");
        if (!uid) throw new Error("No UID");
        
        onStatus('connected');
        await ensureUserDoc(uid, localSettingsToMigrate, localDataToMigrate);

        const unsub = onSnapshot(doc(firestore, FIREBASE_USER_COLLECTION, uid), (docSnap) => {
            if (docSnap.exists()) {
                const val = docSnap.data();
                onData(val.data || {}, val.settings || null);
            } else {
                onData(null, null);
            }
        }, (error) => {
            console.error("Firestore listener error", error);
            onStatus('disconnected');
        });
        
        return unsub;
    } catch (e) {
        console.error("Init Firebase failed", e);
        onStatus('disconnected');
        return () => {};
    }
};

// --- Direct Save Functions ---

export const saveSettings = async (uid: string, settings: UserSettings) => {
    if (!firestore || !uid) return;
    const userDoc = doc(firestore, FIREBASE_USER_COLLECTION, uid);
    try {
        // STRICT REPLACEMENT: We use updateDoc with a sanitized object.
        // Because we are updating the 'settings' field, this REPLACES the entire settings object map.
        // Keys missing in 'cleanSettings' will be removed from the DB map.
        const cleanSettings = sanitize(settings);
        await updateDoc(userDoc, { settings: cleanSettings });
    } catch (e) {
        console.error("Save Settings Failed", e);
        // Fallback for creating doc if missing (shouldn't happen due to initFirebase)
        // but avoided merge:true to ensure deletion capability
    }
};

export const saveUserProgress = async (uid: string, updates: Record<string, any>) => {
    if (!firestore || !uid) return;
    try {
        const userDoc = doc(firestore, FIREBASE_USER_COLLECTION, uid);
        const dotNotationUpdates: Record<string, any> = {};
        Object.entries(updates).forEach(([key, val]) => {
            if (val !== undefined) {
                dotNotationUpdates[`data.${key}`] = val;
            }
        });
        await updateDoc(userDoc, dotNotationUpdates);
    } catch (e) {
        console.error("Save Progress Failed", e);
    }
};

// --- Auth Helpers ---

const getEmail = (id: string) => id.includes('@') ? id : id + DOMAIN;

const getErrorMessage = (error: any) => {
    const code = error.code;
    if (code === 'auth/invalid-email') return 'Invalid User ID/Email format.';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') return 'Account not found or incorrect password.';
    if (code === 'auth/wrong-password') return 'Incorrect password.';
    if (code === 'auth/email-already-in-use') return 'User ID/Email already exists.';
    if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
    return error.message || 'Authentication failed.';
}

// --- Shadow Password Logic ---
// Since Firebase Auth requires old password for reset (which logged out users don't have),
// and user requested username-only flow without email, we store a 'valid_tokens' array in Firestore.

export const authenticateUser = async (id: string, pass: string) => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    
    const email = getEmail(id);
    // 1. Try standard Firebase Auth
    try {
        const result = await signInWithEmailAndPassword(firebaseAuth, email, pass);
        return { success: true, uid: result.user.uid };
    } catch (e: any) {
        // If Auth fails, return error (App.tsx handles fallback to shadowLogin)
        return { success: false, error: getErrorMessage(e) };
    }
};

// Modified Create User to store Username and Password Hash (Simulated)
export const createUser = async (id: string, pass: string) => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await createUserWithEmailAndPassword(firebaseAuth, getEmail(id), pass);
        // Save shadow credentials
        await saveUserProgress(result.user.uid, {
            username: id,
            valid_tokens: [pass] // Store password (insecure, but requested by user for this specific personal app)
        });
        return { success: true, uid: result.user.uid };
    } catch (e: any) {
        return { success: false, error: getErrorMessage(e) };
    }
};

export const loginAnonymously = async () => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await signInAnonymously(firebaseAuth);
        return { success: true, uid: result.user.uid };
    } catch (e: any) {
        return { success: false, error: getErrorMessage(e) };
    }
};

// The Requested "Direct Reset" 
export const resetUserPassword = async (id: string, newPass: string) => {
    if (!firestore) return { success: false, error: "Firestore not initialized" };
    
    try {
        const q = query(collection(firestore, FIREBASE_USER_COLLECTION), where("data.username", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: "User ID not found in database." };
        }

        let targetUid = '';
        let currentTokens: string[] = [];
        
        querySnapshot.forEach((doc) => {
            targetUid = doc.id;
            const d = doc.data();
            currentTokens = d.data?.valid_tokens || [];
        });

        // 2. Add new password to valid_tokens
        const updatedTokens = [...currentTokens, newPass];
        
        // 3. Update Doc
        await saveUserProgress(targetUid, { valid_tokens: updatedTokens });
        
        return { success: true };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: "Reset failed. ensure Firestore rules allow read/write or User ID is correct." };
    }
};

// Shadow Authenticator for the Login flow
// Called if standard Auth fails
export const shadowLogin = async (id: string, pass: string) => {
    if (!firestore) return { success: false, error: "Firestore not ready" };
    try {
        const q = query(collection(firestore, FIREBASE_USER_COLLECTION), where("data.username", "==", id));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) return { success: false, error: "Account not found." };

        let isValid = false;
        let uid = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const tokens = data.data?.valid_tokens || [];
            if (tokens.includes(pass)) {
                isValid = true;
                uid = doc.id;
            }
        });

        if (isValid) return { success: true, uid };
        return { success: false, error: "Incorrect password." };
    } catch (e) {
        return { success: false, error: "Shadow auth error." };
    }
};
