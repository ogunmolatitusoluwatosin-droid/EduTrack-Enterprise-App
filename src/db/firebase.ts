// Firebase Client SDK Configuration & Initialization
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
  Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App singleton
export const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
export const auth = getAuth(firebaseApp);

// Initialize Cloud Firestore with long polling and persistent local cache
function initFirestoreInstance(): Firestore {
  const databaseId = firebaseConfigJson.firestoreDatabaseId || undefined;
  try {
    return initializeFirestore(
      firebaseApp,
      {
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      },
      databaseId
    );
  } catch {
    try {
      return databaseId ? getFirestore(firebaseApp, databaseId) : getFirestore(firebaseApp);
    } catch {
      return getFirestore(firebaseApp);
    }
  }
}

export const firestore = initFirestoreInstance();

// Initialize Firebase Storage
export const storage = getStorage(firebaseApp);

