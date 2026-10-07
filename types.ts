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

export interface JournalArticle {
  id: number;
  slug?: string;
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

export type BookingStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled';

export interface Booking {
  id: string;
  reference: string;
  referenceCode?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  duration: string;
  durationMinutes: number;
  price: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // e.g. "10:00 AM"
  endTime: string; // e.g. "11:30 AM"
  notes?: string;
  status: BookingStatus;
  emailSent: boolean;
  emailStatus?: 'sent' | 'queued' | 'failed';
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
  bookingReference: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  status: 'sent' | 'queued_fallback' | 'failed';
  provider: string;
  endpointUrl: string;
  sentAt: string;
  htmlPreview: string;
}

export interface DayAvailability {
  dayOfWeek: number; // 0 = Sunday .. 6 = Saturday
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  slots: string[];
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

export type ViewState =
  | { type: 'home' }
  | { type: 'services' }
  | { type: 'about' }
  | { type: 'journal_list' }
  | { type: 'contact' }
  | { type: 'product'; product: Product }
  | { type: 'journal'; article: JournalArticle }
  | { type: 'checkout'; initialService?: Product; rescheduleBooking?: Booking }
  | { type: 'login'; redirectTo?: string }
  | { type: 'register'; redirectTo?: string }
  | { type: 'account'; tab?: 'overview' | 'bookings' | 'profile'; highlightBookingId?: string }
  | {
      type: 'dashboard';
      section?:
        | 'overview'
        | 'bookings'
        | 'customers'
        | 'services'
        | 'availability'
        | 'emails'
        | 'settings';
    };
