/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import {
  PRODUCTS,
  DEFAULT_AVAILABILITY,
  DEFAULT_BUSINESS_SETTINGS
} from './constants.ts';
import {
  Product,
  Booking,
  BookingStatus,
  UserProfile,
  EmailLog,
  DayAvailability,
  BusinessSettings
} from './types.ts';

const PORT = 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'miss-beauty-atelier-secret-key-2026';
const LEVELUP_API_URL = process.env.LEVELUP_API_URL || 'https://api.levelup-ecosystem.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const DEFAULT_SENDER_EMAIL = 'Miss beauty Atelier <studio@levelup-ecosystem.com>';

function getSenderEmail(): string {
  const raw = (process.env.RESEND_FROM_EMAIL || DEFAULT_SENDER_EMAIL).trim();
  // Clean any accidental trailing dot before @ (e.g. studio.@levelup-ecosystem.com -> studio@levelup-ecosystem.com)
  return raw.replace(/\.@/g, '@');
}

// In-memory store for 6-digit account verification codes (10 min expiry)
const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

interface StoredUser extends UserProfile {
  passwordHash: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  services: Product[];
  bookings: Booking[];
  availability: DayAvailability[];
  settings: BusinessSettings;
  emailLogs: EmailLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'salon-db.json');

function hashPassword(password: string): string {
  const salt = 'miss_beauty_salt_v1';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createToken(user: StoredUser): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    role: user.role,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

function verifyToken(token: string): { id: string; email: string; role: 'customer' | 'owner' } | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const data = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf-8'));
    if (data.exp < Date.now()) return null;
    return { id: data.id, email: data.email, role: data.role };
  } catch {
    return null;
  }
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const match = startTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return startTime;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours24 = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  const endPeriod = endHours24 >= 12 ? 'PM' : 'AM';
  const endHours12 = endHours24 % 12 === 0 ? 12 : endHours24 % 12;
  return `${endHours12}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;
}

function formatReadableDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

function buildVerificationCodeEmailHtml(params: {
  salonName: string;
  customerName: string;
  code: string;
}): string {
  return `
    <div style="background-color:#F5F2EB;padding:48px 24px;font-family:'Inter',Helvetica,Arial,sans-serif;color:#2C2A26;">
      <div style="max-width:540px;margin:0 auto;background-color:#FFFFFF;border:1px solid #D6D1C7;padding:48px;">
        <div style="text-align:center;border-bottom:1px solid #EBE7DE;padding-bottom:24px;margin-bottom:32px;">
          <span style="font-size:10px;letter-spacing:0.25em;text-transform:uppercase;color:#A8A29E;display:block;margin-bottom:8px;">Security &amp; Private Membership</span>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:30px;font-weight:400;margin:0;color:#2C2A26;">${params.salonName}</h1>
        </div>
        <p style="font-size:15px;line-height:1.7;color:#5D5A53;margin-bottom:24px;">
          Bonjour ${params.customerName},<br/><br/>
          Use the following verification code to confirm your email address and activate your <strong>${params.salonName}</strong> client profile:
        </p>
        <div style="background-color:#2C2A26;color:#F5F2EB;padding:28px;text-align:center;margin-bottom:28px;letter-spacing:0.35em;font-family:'Playfair Display',Georgia,serif;font-size:34px;">
          ${params.code}
        </div>
        <p style="font-size:12px;line-height:1.6;color:#A8A29E;text-align:center;margin:0;">
          This code expires in 10 minutes. If you did not request this verification, you may safely disregard this message.
        </p>
      </div>
    </div>
  `;
}

function buildConfirmationEmailHtml(params: {
  salonName: string;
  customerName: string;
  serviceName: string;
  duration: string;
  price: number;
  date: string;
  time: string;
  address: string;
  reference: string;
}): string {
  return `
    <div style="background-color:#F5F2EB;padding:48px 24px;font-family:'Inter',Helvetica,Arial,sans-serif;color:#2C2A26;">
      <div style="max-width:580px;margin:0 auto;background-color:#FFFFFF;border:1px solid #D6D1C7;padding:0;overflow:hidden;">
        <div style="background-color:#2C2A26;color:#F5F2EB;padding:36px 40px;text-align:center;">
          <span style="font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#D6D1C7;display:block;margin-bottom:8px;">Official Sanctuary Boarding Pass &amp; Ticket</span>
          <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:32px;font-weight:400;margin:0;color:#F5F2EB;">${params.salonName}</h1>
        </div>
        <div style="padding:40px;">
          <p style="font-size:15px;line-height:1.7;color:#5D5A53;margin-top:0;margin-bottom:28px;">
            Dear ${params.customerName},<br/>
            Your appointment at <strong>${params.salonName}</strong> is confirmed. Present your ticket code below upon arrival at our sanctuary.
          </p>
          <div style="background-color:#F5F2EB;border:1px solid #D6D1C7;padding:24px;text-align:center;margin-bottom:28px;">
            <span style="font-size:10px;text-transform:uppercase;letter-spacing:0.25em;color:#A8A29E;display:block;margin-bottom:6px;">Reservation Ticket Code</span>
            <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;letter-spacing:0.12em;color:#2C2A26;font-weight:600;">
              ${params.reference}
            </div>
          </div>
          <div style="background-color:#FAF8F5;padding:24px;border:1px solid #EBE7DE;margin-bottom:28px;">
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EBE7DE;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Guest</span>
              <strong style="font-size:14px;color:#2C2A26;">${params.customerName}</strong>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EBE7DE;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Ritual / Service</span>
              <span style="font-size:14px;color:#2C2A26;">${params.serviceName} (${params.duration})</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EBE7DE;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Date</span>
              <span style="font-size:14px;color:#2C2A26;">${formatReadableDate(params.date)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EBE7DE;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Time</span>
              <span style="font-size:14px;color:#2C2A26;">${params.time}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #EBE7DE;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Tariff</span>
              <span style="font-size:14px;color:#2C2A26;">$${params.price}</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.15em;color:#A8A29E;">Sanctuary Address</span>
              <span style="font-size:14px;color:#2C2A26;">${params.address}</span>
            </div>
          </div>
          <p style="font-size:11px;color:#A8A29E;text-align:center;text-transform:uppercase;letter-spacing:0.18em;margin:0;">
            Powered by LevelUp Ecosystem · ${params.salonName}
          </p>
        </div>
      </div>
    </div>
  `;
}

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFutureDateIso(daysAhead: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() + daysAhead);
  if (dt.getDay() === 0) dt.setDate(dt.getDate() + 2); // move off Sunday
  if (dt.getDay() === 1) dt.setDate(dt.getDate() + 1); // move off Monday
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseSchema;
      if (parsed && Array.isArray(parsed.services) && parsed.services.length > 0) {
        parsed.services = parsed.services.map(srv => {
          const updatedDefault = PRODUCTS.find(p => p.id === srv.id || p.slug === srv.slug);
          if (updatedDefault) {
            return {
              ...srv,
              imageUrl: updatedDefault.imageUrl,
              gallery: updatedDefault.gallery,
              description: updatedDefault.description
            };
          }
          return srv;
        });
        return parsed;
      }
    } catch (e) {
      console.error('Error reading salon-db.json, re-initializing:', e);
    }
  }

  const todayStr = getTodayIso();
  const upcomingDate1 = '2026-10-15';
  const upcomingDate2 = getFutureDateIso(3);

  const initialUsers: StoredUser[] = [
    {
      id: 'u_owner_1',
      name: 'Céline Laurent (Creative Director)',
      email: 'owner@missbeauty.atelier',
      phone: '+33 1 42 68 55 00',
      role: 'owner',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword('Atelier2026!')
    },
    {
      id: 'u_cust_1',
      name: 'Sarah Jenkins',
      email: 'sarah@example.com',
      phone: '+1 (212) 555-0194',
      role: 'customer',
      hairTextureNotes: 'Fine 3C curls, prefers warm baobab steam before braiding.',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword('Sarah2026!')
    },
    {
      id: 'u_cust_2',
      name: 'Amara Okafor',
      email: 'amara@maison-studio.com',
      phone: '+33 6 18 44 92 10',
      role: 'customer',
      hairTextureNotes: 'Type 4A coil, loves tension-free knotless braids and silk press.',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword('Amara2026!')
    },
    {
      id: 'u_cust_3',
      name: 'Claire Dubois',
      email: 'claire.dubois@vogue-ed.fr',
      phone: '+33 6 72 11 08 45',
      role: 'customer',
      hairTextureNotes: 'Wavy 2B, ammonia-free botanical gloss every 8 weeks.',
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword('Claire2026!')
    }
  ];

  const initialBookings: Booking[] = [
    {
      id: 'bk_1001',
      reference: 'MB-2026-8410',
      customerId: 'u_cust_1',
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah@example.com',
      customerPhone: '+1 (212) 555-0194',
      serviceId: 's2',
      serviceSlug: 'braids',
      serviceName: 'Braids',
      serviceCategory: 'Braids & Protective',
      price: 280,
      duration: '2h 30m',
      durationMinutes: 150,
      appointmentDate: upcomingDate1,
      startTime: '2:00 PM',
      endTime: '4:30 PM',
      status: 'Confirmed',
      notes: 'Medium waist-length knotless braids with warm baobab scalp mist.',
      emailSent: true,
      emailLogId: 'em_1001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bk_1002',
      reference: 'MB-2026-8411',
      customerId: 'u_cust_2',
      customerName: 'Amara Okafor',
      customerEmail: 'amara@maison-studio.com',
      customerPhone: '+33 6 18 44 92 10',
      serviceId: 's3',
      serviceSlug: 'silk-press',
      serviceName: 'Silk Press',
      serviceCategory: 'Cut & Styling',
      price: 150,
      duration: '1h 45m',
      durationMinutes: 105,
      appointmentDate: todayStr,
      startTime: '11:30 AM',
      endTime: '1:15 PM',
      status: 'Confirmed',
      notes: 'Include micro-mist camellia hydration treatment.',
      emailSent: true,
      emailLogId: 'em_1002',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bk_1003',
      reference: 'MB-2026-8412',
      customerId: 'u_cust_3',
      customerName: 'Claire Dubois',
      customerEmail: 'claire.dubois@vogue-ed.fr',
      customerPhone: '+33 6 72 11 08 45',
      serviceId: 's1',
      serviceSlug: 'signature-haircut',
      serviceName: 'Signature Haircut',
      serviceCategory: 'Cut & Styling',
      price: 165,
      duration: '1h 15m',
      durationMinutes: 75,
      appointmentDate: todayStr,
      startTime: '4:30 PM',
      endTime: '5:45 PM',
      status: 'Pending',
      notes: 'Dry sculptural trim and face-framing layers.',
      emailSent: true,
      emailLogId: 'em_1003',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'bk_1004',
      reference: 'MB-2026-8390',
      customerId: 'u_cust_1',
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah@example.com',
      customerPhone: '+1 (212) 555-0194',
      serviceId: 's9',
      serviceSlug: 'treatment',
      serviceName: 'Treatment',
      serviceCategory: 'Rituals & Bridal',
      price: 185,
      duration: '1h 30m',
      durationMinutes: 90,
      appointmentDate: upcomingDate2,
      startTime: '10:00 AM',
      endTime: '11:30 AM',
      status: 'Confirmed',
      notes: 'Kyoto head-spa waterfall hydrotherapy.',
      emailSent: true,
      emailLogId: 'em_1004',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  const initialEmails: EmailLog[] = initialBookings.map((b, idx) => ({
    id: `em_100${idx + 1}`,
    bookingId: b.id,
    reference: b.reference,
    to: b.customerEmail,
    subject: 'Your appointment is confirmed',
    template: 'booking_confirmation',
    status: 'sent',
    provider: `LevelUp Email API (${LEVELUP_API_URL}) -> Resend`,
    htmlPreview: buildConfirmationEmailHtml({
      salonName: DEFAULT_BUSINESS_SETTINGS.salonName,
      customerName: b.customerName,
      serviceName: b.serviceName,
      duration: b.duration,
      price: b.price,
      date: b.appointmentDate,
      time: b.startTime,
      address: `${DEFAULT_BUSINESS_SETTINGS.address}, ${DEFAULT_BUSINESS_SETTINGS.city}`,
      reference: b.reference
    }),
    sentAt: new Date().toISOString()
  }));

  const seeded: DatabaseSchema = {
    users: initialUsers,
    services: PRODUCTS.map(p => ({ ...p, active: true })),
    bookings: initialBookings,
    availability: DEFAULT_AVAILABILITY,
    settings: DEFAULT_BUSINESS_SETTINGS,
    emailLogs: initialEmails
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
  return seeded;
}

let db: DatabaseSchema = loadDatabase();

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist salon database:', e);
  }
}

function sanitizeUser(u: StoredUser): UserProfile {
  const { passwordHash: _ph, ...safe } = u;
  return safe;
}

// LevelUp Email Service Abstraction Layer
async function dispatchLevelUpEmail(payload: {
  bookingId: string;
  reference: string;
  to: string;
  customerName: string;
  serviceName: string;
  duration: string;
  price: number;
  date: string;
  time: string;
}): Promise<EmailLog> {
  const htmlPreview = buildConfirmationEmailHtml({
    salonName: db.settings.salonName,
    customerName: payload.customerName,
    serviceName: payload.serviceName,
    duration: payload.duration,
    price: payload.price,
    date: payload.date,
    time: payload.time,
    address: `${db.settings.address}, ${db.settings.city}`,
    reference: payload.reference
  });

  const logEntry: EmailLog = {
    id: `em_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    bookingId: payload.bookingId,
    reference: payload.reference,
    to: payload.to,
    subject: 'Your appointment is confirmed',
    template: 'booking_confirmation',
    status: 'sent',
    provider: `LevelUp Email API (${db.settings.levelUpApiUrl || LEVELUP_API_URL}) -> Resend`,
    htmlPreview,
    sentAt: new Date().toISOString()
  };

  // 1. Primary dispatch via Resend REST API when RESEND_API_KEY is configured (e.g. on Vercel)
  const activeResendKey = process.env.RESEND_API_KEY || RESEND_API_KEY;
  if (activeResendKey) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeResendKey}`
        },
        body: JSON.stringify({
          from: getSenderEmail(),
          to: [payload.to],
          subject: `${db.settings.salonName} — Reservation Ticket #${payload.reference}`,
          html: htmlPreview
        })
      });
      if (!resendRes.ok) {
        const errBody = await resendRes.text().catch(() => '');
        console.warn('Resend API warning:', resendRes.status, errBody);
      }
    } catch (err: any) {
      console.warn('Resend API unreachable, logged locally:', err?.message);
    }
  } else if (process.env.LEVELUP_API_KEY) {
    try {
      const response = await fetch(`${LEVELUP_API_URL}/v1/email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.LEVELUP_API_KEY}`
        },
        body: JSON.stringify({
          template: 'booking_confirmation',
          to: payload.to,
          data: {
            customerName: payload.customerName,
            serviceName: payload.serviceName,
            date: formatReadableDate(payload.date),
            time: payload.time,
            reference: payload.reference
          }
        })
      });
      if (!response.ok) {
        logEntry.status = 'failed';
      }
    } catch (err: any) {
      console.warn('LevelUp Email upstream unreachable, logged locally for retry:', err?.message);
    }
  }

  db.emailLogs.unshift(logEntry);
  saveDatabase();
  return logEntry;
}

interface AuthRequest extends Request {
  user?: StoredUser;
}

function authenticateOptional(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (decoded) {
      const found = db.users.find(u => u.id === decoded.id);
      if (found) req.user = found;
    }
  }
  next();
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  authenticateOptional(req, res, () => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required. Please sign in.' });
      return;
    }
    next();
  });
}

function requireOwner(req: AuthRequest, res: Response, next: NextFunction) {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'owner') {
      res.status(403).json({ error: 'Access restricted to authorized salon management.' });
      return;
    }
    next();
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // ============================================================================
  // PORTRAIT IMAGE PROXY (FOR SAME-ORIGIN CANVAS BACKGROUND REMOVAL)
  // ============================================================================
  let cachedPortraitBuffer: Buffer | null = null;
  let cachedPortraitType = 'image/png';

  app.get('/api/portrait-image', async (_req, res) => {
    try {
      if (cachedPortraitBuffer) {
        res.setHeader('Content-Type', cachedPortraitType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.send(cachedPortraitBuffer);
        return;
      }
      const upstreamUrl = 'https://i.ibb.co/7dMbWtHr/Portrait-beaut-aux-tresses-magenta.png';
      const response = await fetch(upstreamUrl);
      if (!response.ok) {
        res.redirect(upstreamUrl);
        return;
      }
      const contentType = response.headers.get('content-type') || 'image/png';
      const arrayBuf = await response.arrayBuffer();
      cachedPortraitBuffer = Buffer.from(arrayBuf);
      cachedPortraitType = contentType;
      res.setHeader('Content-Type', cachedPortraitType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(cachedPortraitBuffer);
    } catch (err) {
      console.error('Portrait proxy error:', err);
      res.redirect('https://i.ibb.co/v6nZDGNm/Portrait-serein-aux-tresses-magenta.png');
    }
  });

  // ============================================================================
  // PUBLIC CATALOG & AVAILABILITY ROUTES
  // ============================================================================
  app.get('/api/services', (_req, res) => {
    res.json({
      services: db.services.filter(s => s.active !== false),
      settings: db.settings
    });
  });

  app.get('/api/services/:slug', (req, res) => {
    const service = db.services.find(
      s => s.slug === req.params.slug || s.id === req.params.slug
    );
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    res.json({ service });
  });

  app.get('/api/availability/slots', (req, res) => {
    const dateStr = String(req.query.date || '');
    const excludeBookingId = String(req.query.excludeBookingId || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
      return;
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    const dayConfig = db.availability.find(a => a.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.isOpen) {
      res.json({
        date: dateStr,
        isOpen: false,
        dayName: dayConfig?.dayName || 'Closed',
        availableSlots: [],
        bookedSlots: []
      });
      return;
    }

    const activeBookingsOnDate = db.bookings.filter(
      b =>
        b.appointmentDate === dateStr &&
        b.status !== 'Cancelled' &&
        b.id !== excludeBookingId
    );
    const bookedTimes = new Set(activeBookingsOnDate.map(b => b.startTime));
    const availableSlots = dayConfig.slots.filter(slot => !bookedTimes.has(slot));

    res.json({
      date: dateStr,
      isOpen: true,
      dayName: dayConfig.dayName,
      allSlots: dayConfig.slots,
      availableSlots,
      bookedSlots: Array.from(bookedTimes)
    });
  });

  // ============================================================================
  // AUTHENTICATION ROUTES (With Resend 6-Digit Email Verification Code)
  // ============================================================================
  app.post('/api/auth/send-verification-code', async (req, res) => {
    const { name, email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    verificationCodes.set(normalizedEmail, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    const html = buildVerificationCodeEmailHtml({
      salonName: db.settings.salonName,
      customerName: String(name || normalizedEmail.split('@')[0]).trim(),
      code
    });

    const activeResendKey = process.env.RESEND_API_KEY || RESEND_API_KEY;
    let sentViaResend = false;
    if (activeResendKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${activeResendKey}`
          },
          body: JSON.stringify({
            from: getSenderEmail(),
            to: [normalizedEmail],
            subject: `${code} is your ${db.settings.salonName} verification code`,
            html
          })
        });
        sentViaResend = resendRes.ok;
      } catch (e) {
        console.warn('Resend verification dispatch warning:', e);
      }
    }

    res.json({
      sent: true,
      sentViaResend,
      // When RESEND_API_KEY is not yet added in local dev, provide fallback code so registration remains testable
      fallbackCode: sentViaResend ? undefined : code,
      message: sentViaResend
        ? `A 6-digit verification code has been sent to ${normalizedEmail}.`
        : `Verification code generated for ${normalizedEmail}.`
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, phone, password, hairTextureNotes, verificationCode } = req.body || {};
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (String(password).length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    const storedVerification = verificationCodes.get(normalizedEmail);
    if (storedVerification) {
      if (Date.now() > storedVerification.expiresAt) {
        verificationCodes.delete(normalizedEmail);
        res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
        return;
      }
      if (!verificationCode || String(verificationCode).trim() !== storedVerification.code) {
        res.status(400).json({ error: 'Invalid 6-digit verification code. Please check your email.' });
        return;
      }
      verificationCodes.delete(normalizedEmail);
    }

    // Security: Never allow public registration to set 'owner' role
    const newUser: StoredUser = {
      id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: String(name).trim().slice(0, 100),
      email: normalizedEmail,
      phone: String(phone || '').trim().slice(0, 40),
      role: 'customer',
      hairTextureNotes: String(hairTextureNotes || '').trim().slice(0, 300),
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(String(password))
    };

    db.users.push(newUser);
    // Link any previous guest bookings made with the same email
    db.bookings.forEach(b => {
      if (b.customerEmail.toLowerCase() === normalizedEmail) {
        b.customerId = newUser.id;
      }
    });
    saveDatabase();

    const token = createToken(newUser);
    res.status(201).json({
      token,
      user: sanitizeUser(newUser)
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user || user.passwordHash !== hashPassword(String(password))) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = createToken(user);
    res.json({
      token,
      user: sanitizeUser(user)
    });
  });

  app.post('/api/auth/firebase-sync', (req, res) => {
    const { uid, email, name, phone } = req.body || {};
    if (!email || !uid) {
      res.status(400).json({ error: 'Firebase uid and email are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const isAdminEmail =
      normalizedEmail === 'alsherafael@gmail.com' ||
      normalizedEmail === 'owner@missbeauty.atelier';

    let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!user) {
      user = {
        id: String(uid).replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 128),
        name: String(name || normalizedEmail.split('@')[0]).trim().slice(0, 100),
        email: normalizedEmail,
        phone: String(phone || '').trim().slice(0, 40),
        role: isAdminEmail ? 'owner' : 'customer',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword(`firebase_${uid}`)
      };
      db.users.push(user);
    } else if (isAdminEmail && user.role !== 'owner') {
      user.role = 'owner';
    }

    db.bookings.forEach(b => {
      if (b.customerEmail.toLowerCase() === normalizedEmail) {
        b.customerId = user!.id;
      }
    });
    saveDatabase();

    const token = createToken(user);
    res.json({
      token,
      user: sanitizeUser(user)
    });
  });

  app.post('/api/auth/reset-password', (req, res) => {
    const { email, newPassword } = req.body || {};
    if (!email || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ error: 'Valid email and a new password (min 6 chars) are required.' });
      return;
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
    if (user && user.role !== 'owner') {
      user.passwordHash = hashPassword(String(newPassword));
      saveDatabase();
    }
    res.json({ message: 'Password updated. You may now sign in with your new credentials.' });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  app.patch('/api/account/profile', requireAuth, (req: AuthRequest, res) => {
    const { name, phone, hairTextureNotes } = req.body || {};
    const user = req.user!;
    if (typeof name === 'string' && name.trim()) {
      user.name = name.trim().slice(0, 100);
    }
    if (typeof phone === 'string') {
      user.phone = phone.trim().slice(0, 40);
    }
    if (typeof hairTextureNotes === 'string') {
      user.hairTextureNotes = hairTextureNotes.trim().slice(0, 400);
    }
    saveDatabase();
    res.json({ user: sanitizeUser(user) });
  });

  // ============================================================================
  // BOOKING ENGINE ROUTES (Server-Side Validated & Double-Booking Protected)
  // ============================================================================
  app.post('/api/bookings', authenticateOptional, async (req: AuthRequest, res) => {
    const {
      serviceId,
      appointmentDate,
      startTime,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      createAccountPassword
    } = req.body || {};

    if (!serviceId || !appointmentDate || !startTime || !customerName || !customerEmail) {
      res.status(400).json({
        error: 'Service, date, time, customer name, and email are required.'
      });
      return;
    }

    const service = db.services.find(s => s.id === serviceId || s.slug === serviceId);
    if (!service || service.active === false) {
      res.status(404).json({ error: 'Selected service does not exist or is unavailable.' });
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(appointmentDate))) {
      res.status(400).json({ error: 'Invalid appointment date format.' });
      return;
    }

    // Server-side availability & double-booking verification
    const [y, m, d] = String(appointmentDate).split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayConfig = db.availability.find(a => a.dayOfWeek === dateObj.getDay());
    if (!dayConfig || !dayConfig.isOpen || !dayConfig.slots.includes(String(startTime))) {
      res.status(400).json({
        error: 'The requested time slot is outside salon operating hours.'
      });
      return;
    }

    const conflictingBooking = db.bookings.find(
      b =>
        b.appointmentDate === String(appointmentDate) &&
        b.startTime === String(startTime) &&
        b.status !== 'Cancelled'
    );
    if (conflictingBooking) {
      res.status(409).json({
        error: 'This time slot has just been reserved. Please select another available time.'
      });
      return;
    }

    let activeUser = req.user;
    let newAuthToken: string | undefined;
    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    // Support seamless account creation during booking flow (Demo Step: Creates an account -> Confirms booking)
    if (!activeUser && createAccountPassword && String(createAccountPassword).length >= 6) {
      let existingUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (!existingUser) {
        existingUser = {
          id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          name: String(customerName).trim().slice(0, 100),
          email: normalizedEmail,
          phone: String(customerPhone || '').trim().slice(0, 40),
          role: 'customer',
          hairTextureNotes: String(notes || '').trim().slice(0, 300),
          emailVerified: true,
          createdAt: new Date().toISOString(),
          passwordHash: hashPassword(String(createAccountPassword))
        };
        db.users.push(existingUser);
      }
      activeUser = existingUser;
      newAuthToken = createToken(existingUser);
    } else if (!activeUser) {
      // Link to existing user by email if found, or create a guest customer ID
      const matchedUser = db.users.find(u => u.email.toLowerCase() === normalizedEmail);
      if (matchedUser) {
        activeUser = matchedUser;
      }
    }

    const reference = `MB-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const bookingId = `bk_${Date.now()}`;
    const newBooking: Booking = {
      id: bookingId,
      reference,
      customerId: activeUser ? activeUser.id : `guest_${Date.now()}`,
      customerName: String(customerName).trim().slice(0, 100),
      customerEmail: normalizedEmail,
      customerPhone: String(customerPhone || '').trim().slice(0, 40),
      serviceId: service.id,
      serviceSlug: service.slug,
      serviceName: service.name,
      serviceCategory: service.category,
      price: service.price, // Server-authoritative price
      duration: service.duration,
      durationMinutes: service.durationMinutes,
      appointmentDate: String(appointmentDate),
      startTime: String(startTime),
      endTime: calculateEndTime(String(startTime), service.durationMinutes),
      status: 'Confirmed',
      notes: String(notes || '').trim().slice(0, 500),
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    db.bookings.unshift(newBooking);
    saveDatabase();

    // Trigger LevelUp Email Service without failing booking if email errors
    let emailLog: EmailLog | undefined;
    try {
      emailLog = await dispatchLevelUpEmail({
        bookingId: newBooking.id,
        reference: newBooking.reference,
        to: newBooking.customerEmail,
        customerName: newBooking.customerName,
        serviceName: newBooking.serviceName,
        duration: newBooking.duration,
        price: newBooking.price,
        date: newBooking.appointmentDate,
        time: newBooking.startTime
      });
      newBooking.emailSent = emailLog.status === 'sent';
      newBooking.emailLogId = emailLog.id;
      saveDatabase();
    } catch (emailErr) {
      console.error('LevelUp Email dispatch error (booking preserved):', emailErr);
    }

    res.status(201).json({
      booking: newBooking,
      emailLog,
      token: newAuthToken,
      user: activeUser ? sanitizeUser(activeUser) : undefined
    });
  });

  // LevelUp Conceptual Email API Endpoint (POST /api/v1/email/send)
  app.post('/api/v1/email/send', requireAuth, async (req: AuthRequest, res) => {
    const { template, to, data } = req.body || {};
    if (template !== 'booking_confirmation' || !to || !data) {
      res.status(400).json({ error: 'Invalid LevelUp Email payload.' });
      return;
    }
    const emailLog = await dispatchLevelUpEmail({
      bookingId: data.bookingId || `manual_${Date.now()}`,
      reference: data.reference || 'MB-2026-CONF',
      to,
      customerName: data.customerName || 'Valued Guest',
      serviceName: data.serviceName || 'Signature Service',
      duration: data.duration || '1h 30m',
      price: Number(data.price || 150),
      date: data.date || getTodayIso(),
      time: data.time || '2:00 PM'
    });
    res.json({ status: 'dispatched', emailLog });
  });

  // ============================================================================
  // CUSTOMER ACCOUNT BOOKING ROUTES (IDOR Protected)
  // ============================================================================
  app.get('/api/account/bookings', requireAuth, (req: AuthRequest, res) => {
    const user = req.user!;
    const myBookings = db.bookings.filter(
      b =>
        b.customerId === user.id ||
        b.customerEmail.toLowerCase() === user.email.toLowerCase()
    );
    const myEmails = db.emailLogs.filter(e =>
      myBookings.some(b => b.id === e.bookingId)
    );
    res.json({ bookings: myBookings, emailLogs: myEmails });
  });

  app.patch('/api/account/bookings/:id', requireAuth, (req: AuthRequest, res) => {
    const user = req.user!;
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Appointment not found.' });
      return;
    }
    // IDOR Protection: Customer can only modify their own booking (unless owner)
    const isOwnerOfBooking =
      booking.customerId === user.id ||
      booking.customerEmail.toLowerCase() === user.email.toLowerCase() ||
      user.role === 'owner';

    if (!isOwnerOfBooking) {
      res.status(403).json({ error: 'You are not authorized to modify this appointment.' });
      return;
    }

    const { action, appointmentDate, startTime, notes } = req.body || {};

    if (action === 'cancel') {
      booking.status = 'Cancelled';
      booking.updatedAt = new Date().toISOString();
      saveDatabase();
      res.json({ booking });
      return;
    }

    if (action === 'reschedule') {
      if (!appointmentDate || !startTime) {
        res.status(400).json({ error: 'New date and time are required to reschedule.' });
        return;
      }
      const conflict = db.bookings.find(
        b =>
          b.id !== booking.id &&
          b.appointmentDate === String(appointmentDate) &&
          b.startTime === String(startTime) &&
          b.status !== 'Cancelled'
      );
      if (conflict) {
        res.status(409).json({ error: 'That time slot is already reserved. Please pick another time.' });
        return;
      }
      booking.appointmentDate = String(appointmentDate);
      booking.startTime = String(startTime);
      booking.endTime = calculateEndTime(String(startTime), booking.durationMinutes);
      if (typeof notes === 'string') booking.notes = notes.trim().slice(0, 500);
      booking.status = 'Confirmed';
      booking.updatedAt = new Date().toISOString();
      saveDatabase();
      res.json({ booking });
      return;
    }

    res.status(400).json({ error: 'Unsupported booking action.' });
  });

  // ============================================================================
  // SALON OWNER PROTECTED DASHBOARD ROUTES
  // ============================================================================
  app.get('/api/dashboard/overview', requireOwner, (_req, res) => {
    const todayStr = getTodayIso();
    const todaysAppointments = db.bookings.filter(
      b => b.appointmentDate === todayStr && b.status !== 'Cancelled'
    );
    const upcomingBookings = db.bookings.filter(
      b => b.appointmentDate >= todayStr && (b.status === 'Confirmed' || b.status === 'Pending')
    );
    const customers = db.users.filter(u => u.role === 'customer').map(sanitizeUser);

    // Calculate today's remaining available slots
    const [y, m, d] = todayStr.split('-').map(Number);
    const todayDow = new Date(y, m - 1, d).getDay();
    const todayAvail = db.availability.find(a => a.dayOfWeek === todayDow);
    const totalTodaySlots = todayAvail && todayAvail.isOpen ? todayAvail.slots.length : 4;
    const availableSlotsToday = Math.max(0, totalTodaySlots - todaysAppointments.length);

    res.json({
      metrics: {
        todaysAppointmentsCount: todaysAppointments.length,
        upcomingBookingsCount: upcomingBookings.length,
        totalCustomersCount: customers.length,
        availableSlotsCount: availableSlotsToday,
        totalRevenueConfirmed: db.bookings
          .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
          .reduce((sum, b) => sum + b.price, 0)
      },
      bookings: db.bookings,
      customers,
      services: db.services,
      availability: db.availability,
      settings: db.settings,
      emailLogs: db.emailLogs
    });
  });

  app.patch('/api/dashboard/bookings/:id/status', requireOwner, (req, res) => {
    const { status, notes } = req.body || {};
    const validStatuses: BookingStatus[] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid booking status.' });
      return;
    }
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    booking.status = status;
    if (typeof notes === 'string') booking.notes = notes.trim().slice(0, 500);
    booking.updatedAt = new Date().toISOString();
    saveDatabase();
    res.json({ booking });
  });

  app.post('/api/dashboard/bookings/:id/retry-email', requireOwner, async (req, res) => {
    const booking = db.bookings.find(b => b.id === req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found.' });
      return;
    }
    const emailLog = await dispatchLevelUpEmail({
      bookingId: booking.id,
      reference: booking.reference,
      to: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      duration: booking.duration,
      price: booking.price,
      date: booking.appointmentDate,
      time: booking.startTime
    });
    booking.emailSent = emailLog.status === 'sent';
    booking.emailLogId = emailLog.id;
    saveDatabase();
    res.json({ booking, emailLog });
  });

  app.post('/api/dashboard/services', requireOwner, (req, res) => {
    const { name, tagline, description, longDescription, price, duration, durationMinutes, category, imageUrl, features } = req.body || {};
    if (!name || !price || !category) {
      res.status(400).json({ error: 'Name, price, and category are required.' });
      return;
    }
    const slug = String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newService: Product = {
      id: `s_${Date.now()}`,
      slug: slug || `service-${Date.now()}`,
      name: String(name).trim(),
      tagline: String(tagline || 'Bespoke atelier service.').trim(),
      description: String(description || '').trim(),
      longDescription: String(longDescription || description || '').trim(),
      price: Number(price),
      duration: String(duration || '1h 30m'),
      durationMinutes: Number(durationMinutes || 90),
      category,
      imageUrl: String(imageUrl || PRODUCTS[0].imageUrl),
      features: Array.isArray(features) ? features : ['Diagnostic Consultation', 'Botanical Steam Cleanse'],
      active: true
    };
    db.services.push(newService);
    saveDatabase();
    res.status(201).json({ service: newService });
  });

  app.patch('/api/dashboard/services/:id', requireOwner, (req, res) => {
    const service = db.services.find(s => s.id === req.params.id);
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    const { name, tagline, description, longDescription, price, duration, durationMinutes, category, active } = req.body || {};
    if (typeof name === 'string' && name.trim()) service.name = name.trim();
    if (typeof tagline === 'string') service.tagline = tagline.trim();
    if (typeof description === 'string') service.description = description.trim();
    if (typeof longDescription === 'string') service.longDescription = longDescription.trim();
    if (price !== undefined) service.price = Number(price);
    if (typeof duration === 'string') service.duration = duration.trim();
    if (durationMinutes !== undefined) service.durationMinutes = Number(durationMinutes);
    if (category) service.category = category;
    if (typeof active === 'boolean') service.active = active;
    saveDatabase();
    res.json({ service });
  });

  app.put('/api/dashboard/availability', requireOwner, (req, res) => {
    const { availability } = req.body || {};
    if (!Array.isArray(availability)) {
      res.status(400).json({ error: 'Invalid availability payload.' });
      return;
    }
    db.availability = availability;
    saveDatabase();
    res.json({ availability: db.availability });
  });

  app.put('/api/dashboard/settings', requireOwner, (req, res) => {
    const { settings } = req.body || {};
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Invalid settings payload.' });
      return;
    }
    db.settings = { ...db.settings, ...settings };
    saveDatabase();
    res.json({ settings: db.settings });
  });

  // ============================================================================
  // SERVER-SIDE GEMINI CONCIERGE ROUTE
  // ============================================================================
  app.post('/api/concierge/chat', async (req, res) => {
    try {
      const { history, message } = req.body || {};
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.json({
          text: 'Welcome to Miss beauty Atelier. For personalized styling recommendations—from tension-free Knotless Braids to our Kyoto Botanical Steam Silk Press—feel free to explore The Collection or reserve your preferred time directly in our booking suite.'
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const serviceContext = db.services
        .filter(s => s.active !== false)
        .map(s => `- ${s.name} (${s.duration}, $${s.price}): ${s.description}`)
        .join('\n');

      const systemInstruction = `You are the private Atelier Concierge for "${db.settings.salonName}", an ultra-luxury architectural hair salon located at ${db.settings.address} (${db.settings.city}).
Your tone is serene, warm, editorial, and refined.
Here is our current service collection:
${serviceContext}

Opening hours: ${db.settings.hoursSummary}.
Answer guest questions about hair textures, braids, silk press, botanical coloring, treatments, pricing, and booking. Keep responses concise (2 to 3 graceful sentences).`;

      const chat = ai.chats.create({
        model: 'gemini-3.8-flash',
        config: {
          systemInstruction
        },
        history: Array.isArray(history)
          ? history.map((h: { role: string; text: string }) => ({
              role: h.role,
              parts: [{ text: h.text }]
            }))
          : []
      });

      const result = await chat.sendMessage({ message: String(message || '') });
      res.json({ text: result.text || 'How may I assist with your hair ritual today?' });
    } catch (error) {
      console.error('Server-side Gemini Concierge error:', error);
      res.json({
        text: 'Our Atelier Concierge recommends starting with our Signature Haircut, tension-free Knotless Braids, or Silk Press ritual. You may select any service to view real-time availability.'
      });
    }
  });

  // Mount Vite in development or serve static build in production
  const distPath = path.resolve(process.cwd(), 'dist');
  if (process.env.NODE_ENV === 'production' && fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Miss beauty Atelier server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
