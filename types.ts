/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type ServiceCategory =
  | 'Cut & Styling'
  | 'Braids & Protective'
  | 'Color & Extensions'
  | 'Rituals & Bridal';

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription?: string;
  price: number;
  duration: string;
  durationMinutes: number;
  category: ServiceCategory;
  imageUrl: string;
  gallery?: string[];
  features: string[];
  active?: boolean;
}

export type SalonService = Product;

export type BookingStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface Booking {
  id: string;
  reference: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  serviceCategory: string;
  price: number;
  duration: string;
  durationMinutes: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string;       // e.g. "10:00 AM"
  endTime: string;         // e.g. "12:30 PM"
  status: BookingStatus;
  notes?: string;
  emailSent: boolean;
  emailLogId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'owner';
  hairTextureNotes?: string;
  emailVerified: boolean;
  createdAt: string;
}

export interface EmailLog {
  id: string;
  bookingId: string;
  reference: string;
  to: string;
  subject: string;
  template: string;
  status: 'sent' | 'failed';
  provider: string;
  htmlPreview: string;
  error?: string;
  sentAt: string;
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Sun ... 6 = Sat
  dayName: string;
  isOpen: boolean;
  openTime: string;  // "09:30"
  closeTime: string; // "19:30"
  slots: string[];   // ["10:00 AM", "11:30 AM", "2:00 PM", "4:30 PM"]
}

export interface BusinessSettings {
  salonName: string;
  tagline: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  hoursSummary: string;
  cancellationPolicy: string;
  levelUpApiUrl: string;
}

export interface JournalArticle {
  id: number;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  image: string;
  content: React.ReactNode;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS'
}

export type ViewState =
  | { type: 'home' }
  | { type: 'services' }
  | { type: 'product'; product: Product }
  | { type: 'journal'; article: JournalArticle }
  | { type: 'checkout'; initialService?: Product; rescheduleBooking?: Booking }
  | { type: 'login'; redirectTo?: 'checkout' | 'account' | 'dashboard' }
  | { type: 'register'; redirectTo?: 'checkout' | 'account' }
  | { type: 'account'; tab?: 'overview' | 'bookings' | 'profile'; highlightBookingId?: string }
  | { type: 'dashboard'; section?: 'overview' | 'bookings' | 'customers' | 'services' | 'availability' | 'emails' | 'settings' };
