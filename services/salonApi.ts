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
  signOutFirebase,
  syncFirebaseUserToFirestore,
  syncBookingCreationToFirestore,
  syncBookingUpdateToFirestore,
  syncServiceToFirestore,
  syncAvailabilityToFirestore
} from '../firebase';
import {
  PRODUCTS,
  DEFAULT_AVAILABILITY,
  DEFAULT_BUSINESS_SETTINGS
} from '../constants';

const STORAGE_TOKEN_KEY = 'mb_auth_token_v1';
const STORAGE_USER_KEY = 'mb_current_user_v1';

let authTokenInMemory: string | null = (() => {
  try {
    return typeof window !== 'undefined'
      ? window.localStorage.getItem(STORAGE_TOKEN_KEY)
      : null;
  } catch {
    return null;
  }
})();

export function setAuthToken(token: string | null) {
  authTokenInMemory = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(STORAGE_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(STORAGE_TOKEN_KEY);
        window.localStorage.removeItem(STORAGE_USER_KEY);
      }
    }
  } catch {
    // Ignore storage quota errors
  }
  if (!token) {
    signOutFirebase().catch(() => {});
  }
}

export function getAuthToken(): string | null {
  return authTokenInMemory;
}

export function setStoredUser(user: UserProfile | null) {
  try {
    if (typeof window !== 'undefined') {
      if (user) {
        window.localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(STORAGE_USER_KEY);
      }
    }
  } catch {
    // Ignore storage errors
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    if (typeof window !== 'undefined') {
      const raw = window.localStorage.getItem(STORAGE_USER_KEY);
      if (raw) return JSON.parse(raw) as UserProfile;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
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

/**
 * Safely parses API responses and guarantees clean, human-readable error messages.
 * Never exposes raw JSON syntax errors like "Unexpected token 'T'..." to the user.
 */
async function parseApiResponse<T>(
  res: Response,
  fallbackErrorMessage: string
): Promise<T> {
  const text = await res.text().catch(() => '');
  let parsed: any = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    const cleanMsg =
      parsed && typeof parsed.error === 'string' && parsed.error.trim()
        ? parsed.error.trim()
        : fallbackErrorMessage;
    throw new Error(cleanMsg);
  }

  if (!parsed) {
    throw new Error(fallbackErrorMessage);
  }

  return parsed as T;
}

export async function fetchServicesCatalog(): Promise<{
  services: Product[];
  settings: BusinessSettings;
}> {
  try {
    const res = await fetch('/api/services', { headers: getHeaders() });
    return await parseApiResponse(res, 'Unable to load the salon service catalog.');
  } catch {
    return {
      services: PRODUCTS,
      settings: DEFAULT_BUSINESS_SETTINGS
    };
  }
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
  try {
    const q = new URLSearchParams({ date });
    if (excludeBookingId) q.set('excludeBookingId', excludeBookingId);
    const res = await fetch(`/api/availability/slots?${q.toString()}`, {
      headers: getHeaders()
    });
    return await parseApiResponse(
      res,
      'Unable to check availability for the selected date.'
    );
  } catch {
    // Graceful fallback to atelier schedule so booking is never blocked
    const [y, m, d] = date.split('-').map(Number);
    const dow = new Date(y, m - 1, d).getDay();
    const cfg = DEFAULT_AVAILABILITY.find((a) => a.dayOfWeek === dow);
    if (!cfg || !cfg.isOpen) {
      return {
        date,
        isOpen: false,
        dayName: cfg?.dayName || 'Closed',
        availableSlots: [],
        bookedSlots: []
      };
    }
    return {
      date,
      isOpen: true,
      dayName: cfg.dayName,
      allSlots: cfg.slots,
      availableSlots: cfg.slots,
      bookedSlots: []
    };
  }
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
  const data = await parseApiResponse<{
    booking: Booking;
    emailLog?: EmailLog;
    token?: string;
    user?: UserProfile;
  }>(
    res,
    'We could not complete your reservation right now. Please verify your details and try again.'
  );

  if (data.token) {
    setAuthToken(data.token);
  }
  if (data.user) {
    setStoredUser(data.user);
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
  const data = await parseApiResponse<{
    token: string;
    user: UserProfile;
  }>(res, 'Invalid email address or password. Please verify your credentials.');

  setAuthToken(data.token);
  setStoredUser(data.user);
  return data;
}

export async function sendVerificationCode(payload: {
  name: string;
  email: string;
}): Promise<{
  sent: boolean;
  sentViaResend: boolean;
  verificationToken?: string;
  fallbackCode?: string;
  message: string;
}> {
  const res = await fetch('/api/auth/send-verification-code', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  return parseApiResponse(
    res,
    'Unable to dispatch the verification code right now. Please check your email address and try again.'
  );
}

export async function registerUser(payload: {
  name: string;
  email: string;
  phone: string;
  password: string;
  hairTextureNotes?: string;
  verificationCode?: string;
  verificationToken?: string;
}): Promise<{
  token: string;
  user: UserProfile;
}> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await parseApiResponse<{
    token: string;
    user: UserProfile;
  }>(
    res,
    'Unable to create your account. Please verify your 6-digit code and try again.'
  );

  setAuthToken(data.token);
  setStoredUser(data.user);
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
  return parseApiResponse(
    res,
    'Unable to update your password. Please check your email address and try again.'
  );
}

export async function fetchCustomerBookings(): Promise<{
  bookings: Booking[];
  emailLogs: EmailLog[];
}> {
  const res = await fetch('/api/account/bookings', { headers: getHeaders() });
  return parseApiResponse(
    res,
    'Please sign in to view your upcoming and past reservations.'
  );
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
  const data = await parseApiResponse<{ user: UserProfile }>(
    res,
    'Unable to save your profile changes right now.'
  );
  setStoredUser(data.user);
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
  const data = await parseApiResponse<{ booking: Booking }>(
    res,
    'Unable to update your reservation right now. Please try again.'
  );
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
  return parseApiResponse(
    res,
    'Access denied. Please sign in with your Salon Owner credentials.'
  );
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
  return parseApiResponse(res, 'Unable to update reservation status.');
}

export async function retryBookingConfirmationEmail(bookingId: string): Promise<{
  booking: Booking;
  emailLog: EmailLog;
}> {
  const res = await fetch(`/api/dashboard/bookings/${bookingId}/retry-email`, {
    method: 'POST',
    headers: getHeaders()
  });
  return parseApiResponse(res, 'Unable to resend confirmation email.');
}

export async function createSalonService(
  payload: Partial<Product>
): Promise<{ service: Product }> {
  const res = await fetch('/api/dashboard/services', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await parseApiResponse<{ service: Product }>(
    res,
    'Unable to create new salon service.'
  );
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
  const data = await parseApiResponse<{ service: Product }>(
    res,
    'Unable to update salon service.'
  );
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
  const data = await parseApiResponse<{ availability: DayAvailability[] }>(
    res,
    'Unable to update salon schedule.'
  );
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
  return parseApiResponse(res, 'Unable to save salon settings.');
}
