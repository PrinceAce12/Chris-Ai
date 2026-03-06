import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper to clean up config values
const cleanValue = (key: string, val: string) => {
  if (!val) return '';
  // Remove "key:" prefix if present (case insensitive), handling optional quotes around the value
  // e.g. "authDomain: example.com" -> "example.com"
  // e.g. "authDomain": "example.com" -> "example.com"
  let cleaned = val.replace(new RegExp(`^["']?${key}["']?\\s*[:=]\\s*`, 'i'), '');
  
  // Remove surrounding quotes
  cleaned = cleaned.replace(/^["']|["']$/g, '').trim();
  return cleaned;
};

// Helper to get env var or fallback
const getEnv = (key: string, value: string | undefined, fallback: string) => {
  let val = value;
  
  // If env var is missing or invalid, use fallback
  if (!val || val === 'undefined' || val === 'null' || val === 'TODO_KEYHERE' || val.length < 2) {
    val = fallback;
  }

  // Clean whatever value we decided to use
  const cleaned = cleanValue(key, val);

  // If it's an API key, it should start with AIza
  if (key === 'apiKey' && fallback.startsWith('AIza') && !cleaned.startsWith('AIza')) {
    return fallback;
  }
  
  return cleaned;
};

const config: Record<string, string> = {};
const addConfig = (key: string, value: string | undefined, fallback: string) => {
  const val = getEnv(key, value, fallback);
  if (val) config[key] = val;
};

addConfig('apiKey', process.env.NEXT_PUBLIC_FIREBASE_API_KEY, firebaseConfig.apiKey);
addConfig('authDomain', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, firebaseConfig.authDomain);
addConfig('projectId', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, firebaseConfig.projectId);
addConfig('storageBucket', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, firebaseConfig.storageBucket);
addConfig('messagingSenderId', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, firebaseConfig.messagingSenderId);
addConfig('appId', process.env.NEXT_PUBLIC_FIREBASE_APP_ID, firebaseConfig.appId);
addConfig('measurementId', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, firebaseConfig.measurementId);

if (typeof window !== 'undefined') {
  console.log('[Firebase Config Check] Project ID:', config.projectId);
  console.log('[Firebase Config Check] Auth Domain:', config.authDomain);
  if (!config.apiKey || config.apiKey.length < 10) {
    console.error('[Firebase Config Check] API Key is missing or too short!');
  }
}

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;

const getAppInstance = () => {
  if (!getApps().length) {
    return initializeApp(config);
  }
  return getApp();
};

export const getAuthInstance = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getAppInstance());
  }
  return authInstance;
};

export const getDbInstance = (): Firestore => {
  if (!dbInstance) {
    const databaseId = getEnv('firestoreDatabaseId', process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID, firebaseConfig.firestoreDatabaseId);
    console.log('[Firebase Config Check] Firestore Database ID:', databaseId);
    
    try {
      // Try to initialize with long polling to fix connection issues
      dbInstance = initializeFirestore(getAppInstance(), {
        experimentalForceLongPolling: true,
      }, databaseId);
    } catch (e) {
      // If already initialized or fails, fallback to getFirestore
      console.warn('Failed to initialize Firestore with settings, falling back to default:', e);
      dbInstance = getFirestore(getAppInstance(), databaseId);
    }
  }
  return dbInstance;
};

// For backward compatibility while we transition
export const auth = typeof window !== 'undefined' ? getAuthInstance() : ({} as Auth);
export const db = typeof window !== 'undefined' ? getDbInstance() : ({} as Firestore);

