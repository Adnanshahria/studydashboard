import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, getDoc, Firestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously, sendPasswordResetEmail, Auth } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../constants';
import { UserData, UserSettings } from '../types';

const FIREBASE_USER_COLLECTION = 'users';
const DOMAIN = '@study-dashboard.com';

// --- Singleton Initialization ---
let firebaseApp: FirebaseApp;
let firestore: Firestore;
let firebaseAuth: Auth;

try {
    // Initialize App
    if (getApps().length === 0) {
        firebaseApp = initializeApp(FIREBASE_CONFIG);
    } else {
        firebaseApp = getApp();
    }
    
    // Initialize Auth
    firebaseAuth = getAuth(firebaseApp);

    // Initialize Firestore with settings
    firestore = initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache(), 
        ignoreUndefinedProperties: true 
    });
    
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("CRITICAL: Firebase Initialization Failed", error);
}

// --- Helper: Sanitize Data ---
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

// --- IndexedDB Utils (Legacy/Backup) ---
const DB_NAME = 'AS_Study_Dashboard';
const STORE_NAME = 'userData';

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { resolve({} as any); return; }
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };
    request.onerror = () => resolve({} as any); 
  });
};

let db: IDBDatabase | null = null;

export const dbPut = async (storeName: string, data: { id: string; value: any }) => {
  try {
      if (!db) await openDB();
      if (!db) return;
      return new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); 
      });
  } catch (e) { console.error(e); }
};

export const dbClear = async (storeName: string) => {
  try {
      if (!db) await openDB();
      if (!db) return;
      return new Promise<void>((resolve, reject) => {
        const tx = db!.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve(); 
      });
  } catch (e) { console.error(e); }
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
        const cleanSettings = sanitize(settings);
        await updateDoc(userDoc, { settings: cleanSettings });
    } catch (e) {
        console.error("Save Settings Failed", e);
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
    if (code === 'auth/network-request-failed') return 'Network error. Check connection.';
    if (code === 'auth/too-many-requests') return 'Too many attempts. Try later.';
    return error.message || 'Authentication failed.';
}

export const authenticateUser = async (id: string, pass: string) => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await signInWithEmailAndPassword(firebaseAuth, getEmail(id), pass);
        return { success: true, uid: result.user.uid };
    } catch (e: any) {
        return { success: false, error: getErrorMessage(e) };
    }
};

export const createUser = async (id: string, pass: string) => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        const result = await createUserWithEmailAndPassword(firebaseAuth, getEmail(id), pass);
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

export const resetUserPassword = async (id: string) => {
    if (!firebaseAuth) return { success: false, error: "Firebase Auth not initialized" };
    try {
        await sendPasswordResetEmail(firebaseAuth, getEmail(id));
        return { success: true };
    } catch (e: any) {
        return { success: false, error: getErrorMessage(e) };
    }
};