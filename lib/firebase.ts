import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Helper to get env var or fallback, ensuring we don't use "undefined" or "null" strings
const getEnv = (key: string, fallback: string) => {
  const value = process.env[key];
  if (!value || value === 'undefined' || value === 'null') return fallback;
  return value;
};

const config = {
  apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey),
  authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain),
  projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId),
  storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket),
  messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId),
  appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId),
  measurementId: getEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', firebaseConfig.measurementId),
};

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
    dbInstance = getFirestore(getAppInstance(), firebaseConfig.firestoreDatabaseId);
  }
  return dbInstance;
};

// For backward compatibility while we transition
export const auth = typeof window !== 'undefined' ? getAuthInstance() : ({} as Auth);
export const db = typeof window !== 'undefined' ? getDbInstance() : ({} as Firestore);

