/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import { Product, Booking, DayAvailability } from './types';

// Load local firebase-applet-config.json if present (in AI Studio), or fall back to VITE_FIREBASE_* env vars (on Vercel)
const localConfigModules = import.meta.glob('./firebase-applet-config.json', {
  eager: true
}) as Record<string, { default?: Record<string, string> } & Record<string, string>>;

const localFileConfig =
  localConfigModules['./firebase-applet-config.json']?.default ||
  localConfigModules['./firebase-applet-config.json'] ||
  {};

const env = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || localFileConfig.apiKey || '',
  authDomain:
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    localFileConfig.authDomain ||
    'gen-lang-client-0477450195.firebaseapp.com',
  projectId:
    env.VITE_FIREBASE_PROJECT_ID ||
    localFileConfig.projectId ||
    'gen-lang-client-0477450195',
  storageBucket:
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    localFileConfig.storageBucket ||
    'gen-lang-client-0477450195.firebasestorage.app',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    localFileConfig.messagingSenderId ||
    '954057320779',
  appId:
    env.VITE_FIREBASE_APP_ID ||
    localFileConfig.appId ||
    '1:954057320779:web:ed4b32520eca55caf760ce',
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID ||
    localFileConfig.firestoreDatabaseId ||
    'ai-studio-missbeauty-6ed06e6a-8365-43e0-803e-b334398e734c'
};

// Safe initialization: Never crash the page if VITE_FIREBASE_API_KEY is not configured yet on Vercel
let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  try {
    appInstance = initializeApp(firebaseConfig);
    dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);
    authInstance = getAuth(appInstance);
  } catch (err) {
    console.warn('Firebase client initialization skipped:', err);
  }
}

export const db = dbInstance as Firestore;
export const auth = authInstance as Auth;
export const googleProvider = new GoogleAuthProvider();

// Mandatory connection validation on boot (only when db is initialized)
async function testConnection() {
  if (!dbInstance) return;
  try {
    await getDocFromServer(doc(dbInstance, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: authInstance?.currentUser?.uid,
      email: authInstance?.currentUser?.email,
      emailVerified: authInstance?.currentUser?.emailVerified,
      isAnonymous: authInstance?.currentUser?.isAnonymous,
      tenantId: authInstance?.currentUser?.tenantId,
      providerInfo: authInstance?.currentUser?.providerData.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email
      }))
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// DEFENSIVE PAYLOAD SANITIZERS (Blueprint Synchronicity)
// ============================================================================
function clampString(val: unknown, maxLen: number): string {
  return String(val ?? '')
    .trim()
    .slice(0, maxLen);
}

// ============================================================================
// FIREBASE AUTHENTICATION & FIRESTORE HELPERS
// ============================================================================
export async function signInWithGoogleFirebase(): Promise<FirebaseUser> {
  if (!authInstance) {
    throw new Error('Firebase authentication is not configured.');
  }
  const result = await signInWithPopup(authInstance, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  if (!authInstance) return;
  try {
    if (authInstance.currentUser) {
      await signOut(authInstance);
    }
  } catch (e) {
    console.warn('Firebase signOut warning:', e);
  }
}

export function subscribeToFirebaseAuth(
  callback: (user: FirebaseUser | null) => void
): () => void {
  if (!authInstance) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(authInstance, callback);
}

export async function syncFirebaseUserToFirestore(params: {
  name?: string;
  phone?: string;
  notes?: string;
}): Promise<{ role: 'client' | 'owner' } | null> {
  if (!dbInstance || !authInstance) return null;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return null;

  const uid = fbUser.uid;
  const email = clampString(fbUser.email || '', 160);
  const displayName = clampString(
    params.name || fbUser.displayName || email.split('@')[0] || 'Guest',
    100
  );
  const phone = clampString(params.phone || '', 40);
  const notes = clampString(params.notes || '', 1000);

  const isAdminEmail =
    email.toLowerCase() === 'alsherafael@gmail.com' ||
    email.toLowerCase() === 'owner@missbeauty.atelier';
  const targetRole: 'client' | 'owner' = isAdminEmail ? 'owner' : 'client';

  const userRef = doc(dbInstance, 'users', uid);
  const privateRef = doc(dbInstance, 'users', uid, 'private', 'info');

  try {
    const existingPublic = await getDoc(userRef);
    if (!existingPublic.exists()) {
      await setDoc(userRef, {
        uid,
        displayName,
        role: targetRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(userRef, {
        uid,
        displayName,
        role: existingPublic.data().role || targetRole,
        createdAt: existingPublic.data().createdAt,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
  }

  try {
    const existingPrivate = await getDoc(privateRef);
    if (!existingPrivate.exists()) {
      await setDoc(privateRef, {
        uid,
        email,
        phone,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      const prev = existingPrivate.data();
      await updateDoc(privateRef, {
        uid,
        email,
        phone: phone || prev.phone || '',
        notes: notes || prev.notes || '',
        createdAt: prev.createdAt,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${uid}/private/info`);
  }

  return { role: targetRole };
}

export async function seedCatalogToFirestoreIfAdmin(
  services: Product[]
): Promise<void> {
  if (!dbInstance || !authInstance) return;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;
  const email = (fbUser.email || '').toLowerCase();
  if (email !== 'alsherafael@gmail.com' && email !== 'owner@missbeauty.atelier') {
    return;
  }

  for (const s of services) {
    const srvId = clampString(s.id, 128);
    const ref = doc(dbInstance, 'services', srvId);
    try {
      const snap = await getDoc(ref);
      const payload = {
        id: srvId,
        slug: clampString(s.slug, 100),
        name: clampString(s.name, 120),
        tagline: clampString(s.tagline, 200),
        description: clampString(s.description, 1000),
        longDescription: clampString(s.longDescription || s.description, 2000),
        price: Math.min(Math.max(Number(s.price) || 0, 0), 10000),
        duration: clampString(s.duration, 40),
        durationMinutes: Math.min(Math.max(Math.round(Number(s.durationMinutes) || 60), 15), 600),
        category: s.category,
        imageUrl: clampString(s.imageUrl, 500),
        active: s.active !== false,
        createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(ref, payload);
    } catch (err) {
      console.warn('Firestore service seed warning:', err);
    }
  }
}

export async function syncServiceToFirestore(s: Product): Promise<void> {
  if (!dbInstance || !authInstance) return;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const srvId = clampString(s.id, 128);
  const ref = doc(dbInstance, 'services', srvId);
  try {
    const snap = await getDoc(ref);
    await setDoc(ref, {
      id: srvId,
      slug: clampString(s.slug, 100),
      name: clampString(s.name, 120),
      tagline: clampString(s.tagline, 200),
      description: clampString(s.description, 1000),
      longDescription: clampString(s.longDescription || s.description, 2000),
      price: Math.min(Math.max(Number(s.price) || 0, 0), 10000),
      duration: clampString(s.duration, 40),
      durationMinutes: Math.min(Math.max(Math.round(Number(s.durationMinutes) || 60), 15), 600),
      category: s.category,
      imageUrl: clampString(s.imageUrl, 500),
      active: s.active !== false,
      createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `services/${srvId}`);
  }
}

export async function syncBookingCreationToFirestore(
  booking: Booking
): Promise<void> {
  if (!dbInstance || !authInstance) return;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const bkId = clampString(booking.id, 128).replace(/[^a-zA-Z0-9_-]/g, '_');
  const bookingRef = doc(dbInstance, 'bookings', bkId);
  const slotId = `${booking.appointmentDate}_${booking.startTime.replace(/[^a-zA-Z0-9_-]/g, '_')}`.slice(0, 128);
  const slotRef = doc(dbInstance, 'booked_slots', slotId);

  try {
    await setDoc(bookingRef, {
      id: bkId,
      reference: clampString(booking.reference, 32),
      clientId: fbUser.uid,
      clientName: clampString(booking.customerName, 100),
      clientEmail: clampString(booking.customerEmail, 160),
      clientPhone: clampString(booking.customerPhone || '', 40),
      serviceId: clampString(booking.serviceId, 64),
      serviceName: clampString(booking.serviceName, 120),
      price: Math.min(Math.max(Number(booking.price) || 0, 0), 10000),
      duration: clampString(booking.duration, 40),
      date: booking.appointmentDate,
      time: clampString(booking.startTime, 20),
      status: 'pending',
      notes: clampString(booking.notes || '', 500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    await setDoc(slotRef, {
      slotId,
      date: booking.appointmentDate,
      time: clampString(booking.startTime, 20),
      bookingId: bkId,
      clientId: fbUser.uid,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firestore booking sync skipped:', err);
  }
}

export async function syncBookingUpdateToFirestore(
  bookingId: string,
  action: 'cancel' | 'reschedule',
  newDetails?: { date?: string; time?: string; notes?: string }
): Promise<void> {
  if (!dbInstance || !authInstance) return;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  const bkId = clampString(bookingId, 128).replace(/[^a-zA-Z0-9_-]/g, '_');
  const bookingRef = doc(dbInstance, 'bookings', bkId);
  try {
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) return;
    const prev = snap.data();

    if (action === 'cancel') {
      await updateDoc(bookingRef, {
        ...prev,
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } else if (action === 'reschedule' && newDetails?.date && newDetails?.time) {
      await updateDoc(bookingRef, {
        ...prev,
        date: newDetails.date,
        time: clampString(newDetails.time, 20),
        notes:
          newDetails.notes !== undefined
            ? clampString(newDetails.notes, 500)
            : prev.notes,
        updatedAt: serverTimestamp()
      });
    }
  } catch (err) {
    console.warn('Firestore booking update sync skipped:', err);
  }
}

export async function syncAvailabilityToFirestore(
  availability: DayAvailability[]
): Promise<void> {
  if (!dbInstance || !authInstance) return;
  const fbUser = authInstance.currentUser;
  if (!fbUser || !fbUser.emailVerified) return;

  for (const day of availability) {
    const dayId = `day_${day.dayOfWeek}`;
    const ref = doc(dbInstance, 'availability', dayId);
    try {
      await setDoc(ref, {
        dayOfWeek: day.dayOfWeek,
        dayName: clampString(day.dayName, 20),
        isOpen: Boolean(day.isOpen),
        openTime: clampString(day.openTime, 10),
        closeTime: clampString(day.closeTime, 10),
        slots: day.slots.slice(0, 24).map((s) => clampString(s, 20)),
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn('Firestore availability sync warning:', err);
    }
  }
}
