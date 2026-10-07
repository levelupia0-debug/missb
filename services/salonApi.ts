/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Product,
  Booking,
  BookingStatus,
  UserProfile,
  EmailLog,
  DayAvailability,
  BusinessSettings
} from '../types';
import {
  signInWithGoogleFirebase,
  signOutFirebase,
  syncFirebaseUserToFirestore,
  syncBookingCreationToFirestore,
  syncBookingUpdateToFirestore,
  syncServiceToFirestore,
  syncAvailabilityToFirestore,
  seedCatalogToFirestoreIfAdmin
} from '../firebase';
import { PRODUCTS } from '../constants';

let authTokenInMemory: string | null = null;

export function setAuthToken(token: string | null) {
  authTokenInMemory = token;
  if (!token) {
    signOutFirebase().catch(() => {});
  }
}

export function getAuthToken(): string | null {
  return authTokenInMemory;
}

function getHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (authTokenInMemory) {
    headers['Authorization'] = `Bearer ${authTokenInMemory}`;
  }
  return headers;
}

export async function loginWithGoogleFirebase(): Promise<{
  token: string;
  user: UserProfile;
}> {
  const fbUser = await signInWithGoogleFirebase();
  await syncFirebaseUserToFirestore({
    name: fbUser.displayName || undefined
  });
  await seedCatalogToFirestoreIfAdmin(PRODUCTS);

  const res = await fetch('/api/auth/firebase-sync', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      uid: fbUser.uid,
      email: fbUser.email,
      name: fbUser.displayName,
      phone: fbUser.phoneNumber || ''
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Firebase sign-in sync failed.');
  setAuthToken(data.token);
  return data;
}

export async function fetchServicesCatalog(): Promise<{
  services: Product[];
  settings: BusinessSettings;
}> {
  const res = await fetch('/api/services', { headers: getHeaders() });
  if (!res.ok) throw new Error('Unable to load salon services.');
  return res.json();
}

export async function fetchAvailableSlots(
  date: string,
  excludeBookingId?: string
): Promise<{
  date: string;
  isOpen: boolean;
  dayName: string;
  allSlots?: string[];
  availableSlots: string[];
  bookedSlots: string[];
}> {
  const q = new URLSearchParams({ date });
  if (excludeBookingId) q.set('excludeBookingId', excludeBookingId);
  const res = await fetch(`/api/availability/slots?${q.toString()}`, {
    headers: getHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Unable to check availability for this date.');
  }
  return res.json();
}

export async function createAppointment(payload: {
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  createAccountPassword?: string;
}): Promise<{
  booking: Booking;
  emailLog?: EmailLog;
  token?: string;
  user?: UserProfile;
}> {
  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unable to confirm appointment.');
  }
  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.booking) {
    await syncBookingCreationToFirestore(data.booking).catch(() => {});
  }
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{
  token: string;
  user: UserProfile;
}> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Sign in failed.');
  setAuthToken(data.token);
  return data;
}

export async function sendVerificationCode(payload: {
  name: string;
  email: string;
}): Promise<{
  sent: boolean;
  sentViaResend: boolean;
  fallbackCode?: string;
  message: string;
}> {
  const res = await fetch('/api/auth/send-verification-code', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to send verification code.');
  return data;
}

export async function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  hairTextureNotes?: string;
  verificationCode?: string;
}): Promise<{
  token: string;
  user: UserProfile;
}> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed.');
  setAuthToken(data.token);
  return data;
}

export async function resetUserPassword(
  email: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to reset password.');
  return data;
}

export async function fetchCustomerBookings(): Promise<{
  bookings: Booking[];
  emailLogs: EmailLog[];
}> {
  const res = await fetch('/api/account/bookings', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load your appointments.');
  return data;
}

export async function updateCustomerProfile(payload: {
  name: string;
  phone: string;
  hairTextureNotes?: string;
}): Promise<{ user: UserProfile }> {
  const res = await fetch('/api/account/profile', {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update profile.');
  await syncFirebaseUserToFirestore({
    name: payload.name,
    phone: payload.phone,
    notes: payload.hairTextureNotes
  }).catch(() => {});
  return data;
}

export async function updateCustomerBooking(
  bookingId: string,
  payload: {
    action: 'cancel' | 'reschedule';
    appointmentDate?: string;
    startTime?: string;
    notes?: string;
  }
): Promise<{ booking: Booking }> {
  const res = await fetch(`/api/account/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update appointment.');
  await syncBookingUpdateToFirestore(bookingId, payload.action, {
    date: payload.appointmentDate,
    time: payload.startTime,
    notes: payload.notes
  }).catch(() => {});
  return data;
}

export async function fetchDashboardOverview(): Promise<{
  metrics: {
    todaysAppointmentsCount: number;
    upcomingBookingsCount: number;
    totalCustomersCount: number;
    availableSlotsCount: number;
    totalRevenueConfirmed: number;
  };
  bookings: Booking[];
  customers: UserProfile[];
  services: Product[];
  availability: DayAvailability[];
  settings: BusinessSettings;
  emailLogs: EmailLog[];
}> {
  const res = await fetch('/api/dashboard/overview', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to load salon dashboard.');
  return data;
}

export async function updateDashboardBookingStatus(
  bookingId: string,
  status: BookingStatus,
  notes?: string
): Promise<{ booking: Booking }> {
  const res = await fetch(`/api/dashboard/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status, notes })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update booking status.');
  return data;
}

export async function retryBookingConfirmationEmail(bookingId: string): Promise<{
  booking: Booking;
  emailLog: EmailLog;
}> {
  const res = await fetch(`/api/dashboard/bookings/${bookingId}/retry-email`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to resend confirmation email.');
  return data;
}

export async function createSalonService(
  payload: Partial<Product>
): Promise<{ service: Product }> {
  const res = await fetch('/api/dashboard/services', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to create service.');
  if (data.service) {
    await syncServiceToFirestore(data.service).catch(() => {});
  }
  return data;
}

export async function updateSalonService(
  id: string,
  payload: Partial<Product>
): Promise<{ service: Product }> {
  const res = await fetch(`/api/dashboard/services/${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update service.');
  if (data.service) {
    await syncServiceToFirestore(data.service).catch(() => {});
  }
  return data;
}

export async function updateSalonAvailability(
  availability: DayAvailability[]
): Promise<{ availability: DayAvailability[] }> {
  const res = await fetch('/api/dashboard/availability', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ availability })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to update availability.');
  if (data.availability) {
    await syncAvailabilityToFirestore(data.availability).catch(() => {});
  }
  return data;
}

export async function updateSalonSettings(
  settings: Partial<BusinessSettings>
): Promise<{ settings: BusinessSettings }> {
  const res = await fetch('/api/dashboard/settings', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ settings })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unable to save settings.');
  return data;
}
