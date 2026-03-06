import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper to get env var or fallback, ensuring we don't use "undefined" or "null" strings
const getEnv = (value: string | undefined, fallback: string) => {
  if (!value || value === 'undefined' || value === 'null') return fallback;
  return value;
};

const config: Record<string, string> = {};
const addConfig = (key: string, value: string | undefined, fallback: string) => {
  const val = getEnv(value, fallback);
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
    const databaseId = getEnv(process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID, firebaseConfig.firestoreDatabaseId);
    dbInstance = getFirestore(getAppInstance(), databaseId);
  }
  return dbInstance;
};

// For backward compatibility while we transition
export const auth = typeof window !== 'undefined' ? getAuthInstance() : ({} as Auth);
export const db = typeof window !== 'undefined' ? getDbInstance() : ({} as Firestore);

