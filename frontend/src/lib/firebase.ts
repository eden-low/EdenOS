import { getApp, getApps, initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'

const firebaseEnvironmentKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

export interface FirebaseServices {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
}

export type FirebaseInitialization =
  | { status: 'ready'; services: FirebaseServices }
  | { status: 'error'; message: string }

function readEnvironmentValue(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined

  const trimmed = value.trim()
  return trimmed && trimmed !== '...' ? trimmed : undefined
}

function initializeFirebase(): FirebaseInitialization {
  const values = {
    VITE_FIREBASE_API_KEY: readEnvironmentValue(import.meta.env.VITE_FIREBASE_API_KEY),
    VITE_FIREBASE_AUTH_DOMAIN: readEnvironmentValue(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
    VITE_FIREBASE_PROJECT_ID: readEnvironmentValue(import.meta.env.VITE_FIREBASE_PROJECT_ID),
    VITE_FIREBASE_STORAGE_BUCKET: readEnvironmentValue(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
    VITE_FIREBASE_MESSAGING_SENDER_ID: readEnvironmentValue(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    VITE_FIREBASE_APP_ID: readEnvironmentValue(import.meta.env.VITE_FIREBASE_APP_ID),
  }
  const missingKeys = firebaseEnvironmentKeys.filter((key) => !values[key])

  if (missingKeys.length > 0) {
    return {
      status: 'error',
      message: `Add values for ${missingKeys.join(', ')} to frontend/.env.local, then restart EdenOS.`,
    }
  }

  const options: FirebaseOptions = {
    apiKey: values.VITE_FIREBASE_API_KEY,
    authDomain: values.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: values.VITE_FIREBASE_PROJECT_ID,
    storageBucket: values.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: values.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: values.VITE_FIREBASE_APP_ID,
  }

  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(options)
    const auth = getAuth(app)
    const firestore = getFirestore(app)
    if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
      connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
      connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
    }
    return {
      status: 'ready',
      services: {
        app,
        auth,
        firestore,
      },
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('Firebase initialization failed.', error)
    return {
      status: 'error',
      message: 'Firebase could not initialize. Check the EdenOS Firebase environment configuration.',
    }
  }
}

export const firebaseInitialization = initializeFirebase()
