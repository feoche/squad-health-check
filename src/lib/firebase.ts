import { FirebaseApp, initializeApp } from 'firebase/app';
import { Auth, getAuth, signInAnonymously } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { firebaseConfig } from './firebaseConfig';

let app: FirebaseApp | undefined;
let signingIn: Promise<string> | undefined;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);
}

/* Lazy so a missing config produces a readable error, not a blank page at import time */
function getApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured — fill in src/lib/firebaseConfig.ts (see README).');
  }
  return (app ??= initializeApp(firebaseConfig));
}

export function getDb(): Database {
  return getDatabase(getApp());
}

function getAuthInstance(): Auth {
  return getAuth(getApp());
}

/**
 * Resolves the anonymous uid, signing in on first use. The uid persists in
 * IndexedDB, so reloads keep the same participant identity.
 */
export function ensureSignedIn(): Promise<string> {
  signingIn ??= (async () => {
    const auth = getAuthInstance();
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser.uid;
    const cred = await signInAnonymously(auth);
    return cred.user.uid;
  })().catch((err) => {
    signingIn = undefined;
    throw err;
  });
  return signingIn;
}
