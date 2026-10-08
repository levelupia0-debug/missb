/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
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
  getDocFromServer
} from 'firebase/firestore';
import { Product, Booking, UserProfile, DayAvailability } from './types';

// Load local firebase-applet-config.json if present (in AI Studio), or fall back to VITE_FIREBASE_* env vars (on GitHub / Vercel)
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
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || localFileConfig.authDomain || '',
  projectId: env.VITE_FIREBASE_PROJECT_ID || localFileConfig.projectId || '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || localFileConfig.storageBucket || '',
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || localFileConfig.messagingSenderId || '',
  appId: env.VITE_FIREBASE_APP_ID || localFileConfig.appId || '',
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || localFileConfig.firestoreDatabaseId || ''
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Mandatory connection validation on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
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
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validation helpers synchronized with firebase-blueprint.json
const ID_REGEX = /^[a-zA-Z0-9_\-]+$/;
const DATE_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

function sanitizeId(raw: string, fallbackPrefix = 'id'): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 128);
  return cleaned && ID_REGEX.test(cleaned) ? cleaned : `${fallbackPrefix}_${Date.now()}`;
}

function clampString(val: unknown, maxLen: number, fallback = ''): string {
  const s = typeof val === 'string' ? val.trim() : fallback;
  return s.slice(0, maxLen);
}

export function isCurrentFirebaseAdmin(): boolean {
  const u = auth.currentUser;
  return Boolean(u && u.emailVerified && u.email?.toLowerCase() === 'alsherafael@gmail.com');
}

export async function signInWithGoogleFirebase(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  if (auth.currentUser) {
    await signOut(auth);
  }
}

export { onAuthStateChanged };

/**
 * Syncs the authenticated Firebase user's split-collection profile (/users/{uid} and /users/{uid}/private/info)
 */
export async function syncFirebaseUserToFirestore(params: {
  name?: string;
  phone?: string;
  notes?: string;
  preferredStylist?: string;
}): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.emailVerified) return;

  const uid = sanitizeId(current.uid, 'user');
  const userPath = `users/${uid}`;
  const privatePath = `users/${uid}/private/info`;

  const role: 'customer' | 'owner' = isCurrentFirebaseAdmin() ? 'owner' : 'customer';
  const displayName = clampString(
    params.name || current.displayName || current.email?.split('@')[0] || 'Client',
    100,
    'Client'
  );

  try {
    const existingSnap = await getDoc(doc(db, 'users', uid));
    if (!existingSnap.exists()) {
      await setDoc(doc(db, 'users', uid), {
        uid,
        name: displayName,
        role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'users', uid), {
        name: displayName,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }

  try {
    const privSnap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    const emailStr = clampString(current.email || 'client@missbeauty.atelier', 160);
    const phoneStr = clampString(params.phone ?? (privSnap.data()?.phone || ''), 40);
    const notesStr = clampString(params.notes ?? (privSnap.data()?.notes || ''), 1000);
    const stylistStr = clampString(
      params.preferredStylist ?? (privSnap.data()?.preferredStylist || ''),
      100
    );

    if (!privSnap.exists()) {
      await setDoc(doc(db, 'users', uid, 'private', 'info'), {
        uid,
        email: emailStr,
        phone: phoneStr,
        notes: notesStr,
        preferredStylist: stylistStr,
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(doc(db, 'users', uid, 'private', 'info'), {
        email: emailStr,
        phone: phoneStr,
        notes: notesStr,
        preferredStylist: stylistStr,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

/**
 * Seeds or updates a service in Firestore (/services/{serviceId}) when admin is authenticated
 */
export async function syncServiceToFirestore(service: Product): Promise<void> {
  if (!isCurrentFirebaseAdmin()) return;

  const serviceId = sanitizeId(service.id, 's');
  const slug = sanitizeId(service.slug || service.id, 'service').slice(0, 120);
  const path = `services/${serviceId}`;

  const payload = {
    id: serviceId,
    slug,
    name: clampString(service.name, 120, 'Service'),
    tagline: clampString(service.tagline || '', 200),
    description: clampString(service.description, 600, 'Salon service'),
    longDescription: clampString(service.longDescription || service.description, 2000),
    price: Math.max(0, Math.min(10000, Number(service.price) || 100)),
    duration: clampString(service.duration || '1h 00m', 40, '1h 00m'),
    durationMinutes: Math.max(15, Math.min(600, Number(service.durationMinutes) || 60)),
    category: ['Cut & Styling', 'Braids & Protective', 'Color & Extensions', 'Rituals & Bridal'].includes(
      service.category
    )
      ? service.category
      : 'Cut & Styling',
    imageUrl: clampString(service.imageUrl || '/portrait-hero.png', 500, '/portrait-hero.png'),
    active: service.active !== false,
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'services', serviceId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Syncs the full initial catalog to Firestore when an admin logs in so that booking foreign-key exists() checks pass
 */
export async function seedCatalogToFirestoreIfAdmin(services: Product[]): Promise<void> {
  if (!isCurrentFirebaseAdmin()) return;
  for (const srv of services) {
    await syncServiceToFirestore(srv);
  }
}

/**
 * Syncs a booking creation to Firestore (/bookings/{bookingId}) when the user is authenticated with Firebase
 */
export async function syncBookingCreationToFirestore(booking: Booking): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.emailVerified) return;

  const bookingId = sanitizeId(booking.id, 'bk');
  const serviceId = sanitizeId(booking.serviceId, 's1');
  const path = `bookings/${bookingId}`;

  // Verify the referenced service exists in Firestore first so rules exists() check passes
  try {
    const srvSnap = await getDoc(doc(db, 'services', serviceId));
    if (!srvSnap.exists()) {
      return;
    }
  } catch {
    return;
  }

  const normalizedStatus = String(booking.status || 'confirmed').toLowerCase();
  const status =
    normalizedStatus === 'pending' || normalizedStatus === 'confirmed'
      ? normalizedStatus
      : 'confirmed';

  const normalizedEmailStatus = String(booking.emailStatus || 'sent').toLowerCase();
  const emailStatus = ['sent', 'queued', 'failed'].includes(normalizedEmailStatus)
    ? normalizedEmailStatus
    : 'sent';

  const dateStr = DATE_REGEX.test(booking.appointmentDate)
    ? booking.appointmentDate
    : new Date().toISOString().slice(0, 10);

  const payload = {
    id: bookingId,
    referenceCode: sanitizeId(booking.referenceCode || `MB-${Date.now()}`, 'MB').slice(0, 40),
    customerId: sanitizeId(current.uid, 'user'),
    customerName: clampString(booking.customerName || current.displayName || 'Client', 100, 'Client'),
    customerEmail: clampString(booking.customerEmail || current.email || 'client@example.com', 160),
    customerPhone: clampString(booking.customerPhone || '+33 1 42 68 55 00', 40, '+33 1 42 68 55 00'),
    serviceId,
    serviceSlug: clampString(booking.serviceSlug || serviceId, 120, serviceId),
    serviceName: clampString(booking.serviceName || 'Signature Service', 120, 'Signature Service'),
    serviceCategory: clampString(booking.serviceCategory || 'Cut & Styling', 80, 'Cut & Styling'),
    price: Math.max(0, Math.min(10000, Number(booking.price) || 150)),
    duration: clampString(booking.duration || '1h 15m', 40, '1h 15m'),
    durationMinutes: Math.max(15, Math.min(600, Number(booking.durationMinutes) || 75)),
    date: dateStr,
    time: clampString(booking.startTime || '10:00 AM', 20, '10:00 AM'),
    notes: clampString(booking.notes || '', 1000),
    status,
    emailStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'bookings', bookingId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Syncs a booking status/reschedule update to Firestore (/bookings/{bookingId})
 */
export async function syncBookingUpdateToFirestore(
  bookingIdRaw: string,
  action: 'cancel' | 'reschedule',
  fields?: { date?: string; time?: string; notes?: string }
): Promise<void> {
  const current = auth.currentUser;
  if (!current || !current.emailVerified) return;

  const bookingId = sanitizeId(bookingIdRaw, 'bk');
  const path = `bookings/${bookingId}`;

  try {
    const snap = await getDoc(doc(db, 'bookings', bookingId));
    if (!snap.exists()) return;

    if (action === 'cancel') {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } else if (action === 'reschedule') {
      const dateStr =
        fields?.date && DATE_REGEX.test(fields.date) ? fields.date : snap.data().date;
      await updateDoc(doc(db, 'bookings', bookingId), {
        date: dateStr,
        time: clampString(fields?.time || snap.data().time, 20, '10:00 AM'),
        notes: clampString(fields?.notes ?? snap.data().notes ?? '', 1000),
        status: 'rescheduled',
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * Syncs weekly salon availability to Firestore (/availability/{dayId}) when admin is authenticated
 */
export async function syncAvailabilityToFirestore(availability: DayAvailability[]): Promise<void> {
  if (!isCurrentFirebaseAdmin()) return;

  for (const day of availability) {
    const dayId = `day_${day.dayOfWeek}`;
    const path = `availability/${dayId}`;
    try {
      await setDoc(doc(db, 'availability', dayId), {
        dayOfWeek: Math.max(0, Math.min(6, Number(day.dayOfWeek) || 0)),
        dayName: clampString(day.dayName, 20, 'Tuesday'),
        isOpen: Boolean(day.isOpen),
        openTime: clampString(day.openTime, 10, '09:30'),
        closeTime: clampString(day.closeTime, 10, '19:30'),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
}
