/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel Serverless API Handler for Miss beauty Atelier
 * Handles /api/* routes in production on Vercel, including Resend email dispatch.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  PRODUCTS,
  DEFAULT_AVAILABILITY,
  DEFAULT_BUSINESS_SETTINGS
} from '../constants';
import {
  Product,
  Booking,
  BookingStatus,
  UserProfile,
  EmailLog,
  DayAvailability,
  BusinessSettings
} from '../types';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'miss-beauty-stateless-hmac-key-v1';
const LEVELUP_API_URL =
  process.env.LEVELUP_API_URL || 'https://api.levelup-ecosystem.com';
const DEFAULT_SENDER_EMAIL =
  'Miss beauty Atelier <studio@levelup-ecosystem.com>';

function getSenderEmail(): string {
  const raw = (process.env.RESEND_FROM_EMAIL || DEFAULT_SENDER_EMAIL).trim();
  return raw.replace(/\.@/g, '@');
}

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

function hashPassword(password: string): string {
  const salt = 'miss_beauty_salt_v1';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createToken(user: StoredUser): string {
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
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

function verifyToken(token: string): {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'customer' | 'owner';
} | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');
    if (signature !== expectedSig) return null;
    const data = JSON.parse(
      Buffer.from(base64Payload, 'base64url').toString('utf-8')
    );
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function createVerificationToken(email: string, code: string): string {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = JSON.stringify({
    email: email.trim().toLowerCase(),
    code: code.trim(),
    exp: expiresAt
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${sig}`;
}

export function verifyStatelessCode(
  email: string,
  code: string,
  token?: string
): { valid: boolean; expired?: boolean } {
  if (!token) return { valid: false };
  try {
    const [base64Payload, sig] = token.split('.');
    if (!base64Payload || !sig) return { valid: false };
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SECRET)
      .update(base64Payload)
      .digest('base64url');
    if (sig !== expectedSig) return { valid: false };
    const data = JSON.parse(
      Buffer.from(base64Payload, 'base64url').toString('utf-8')
    );
    if (Date.now() > data.exp) return { valid: false, expired: true };
    if (
      data.email === email.trim().toLowerCase() &&
      String(data.code) === String(code).trim()
    ) {
      return { valid: true };
    }
    return { valid: false };
  } catch {
    return { valid: false };
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

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; errorDetail?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return { sent: false, errorDetail: 'RESEND_API_KEY not configured' };
  }

  const primaryFrom = getSenderEmail();
  try {
    const res1 = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: primaryFrom,
        to: [params.to],
        subject: params.subject,
        html: params.html
      })
    });

    if (res1.ok) {
      return { sent: true };
    }

    const errText1 = await res1.text().catch(() => '');
    console.warn('Resend primary sender response:', res1.status, errText1);

    // If domain studio@levelup-ecosystem.com is still pending DNS verification in Resend, retry with onboarding@resend.dev
    if (primaryFrom.indexOf('onboarding@resend.dev') === -1) {
      const res2 = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: 'Miss beauty Atelier <onboarding@resend.dev>',
          to: [params.to],
          subject: params.subject,
          html: params.html
        })
      });
      if (res2.ok) {
        return { sent: true };
      }
      const errText2 = await res2.text().catch(() => '');
      return { sent: false, errorDetail: errText2 || errText1 };
    }

    return { sent: false, errorDetail: errText1 };
  } catch (err: any) {
    return { sent: false, errorDetail: err?.message || 'Network error' };
  }
}

const TMP_DB_FILE = '/tmp/miss-beauty-salon-db.json';

function getTodayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadServerlessDb(): DatabaseSchema {
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_DB_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.services)) return parsed;
    }
  } catch {
    // Ignore and initialize
  }

  const seeded: DatabaseSchema = {
    users: [
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
        id: 'u_owner_2',
        name: 'Alshe Rafael (Owner)',
        email: 'alsherafael@gmail.com',
        phone: '+33 1 42 68 55 00',
        role: 'owner',
        emailVerified: true,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword('Atelier2026!')
      }
    ],
    services: PRODUCTS.map((p) => ({ ...p, active: true })),
    bookings: [],
    availability: DEFAULT_AVAILABILITY,
    settings: DEFAULT_BUSINESS_SETTINGS,
    emailLogs: []
  };

  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
  } catch {
    // Ignore read-only fs
  }
  return seeded;
}

function saveServerlessDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Ignore read-only fs
  }
}

function sanitizeUser(u: StoredUser): UserProfile {
  const { passwordHash: _ph, ...safe } = u;
  return safe;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  const db = loadServerlessDb();

  const rawUrl = String(req.url || '/');
  const [pathname] = rawUrl.split('?');
  const method = String(req.method || 'GET').toUpperCase();
  const body =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return {};
          }
        })()
      : req.body || {};

  // Extract optional authenticated user from signed token
  let authUser: StoredUser | null = null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const decoded = verifyToken(authHeader.slice(7));
    if (decoded) {
      authUser =
        db.users.find((u) => u.id === decoded.id || u.email === decoded.email) || {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          phone: decoded.phone || '',
          role: decoded.role,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          passwordHash: ''
        };
    }
  }

  // 1. GET /api/services
  if (method === 'GET' && pathname === '/api/services') {
    return res.status(200).json({
      services: db.services.filter((s) => s.active !== false),
      settings: db.settings
    });
  }

  // 2. GET /api/availability/slots
  if (method === 'GET' && pathname === '/api/availability/slots') {
    const urlObj = new URL(rawUrl, 'http://localhost');
    const dateStr = String(
      req.query?.date || urlObj.searchParams.get('date') || getTodayIso()
    );
    const excludeBookingId = String(
      req.query?.excludeBookingId || urlObj.searchParams.get('excludeBookingId') || ''
    );

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return res.status(400).json({ error: 'Please select a valid appointment date.' });
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const dayConfig = db.availability.find((a) => a.dayOfWeek === dayOfWeek);

    if (!dayConfig || !dayConfig.isOpen) {
      return res.status(200).json({
        date: dateStr,
        isOpen: false,
        dayName: dayConfig?.dayName || 'Closed',
        availableSlots: [],
        bookedSlots: []
      });
    }

    const activeBookingsOnDate = db.bookings.filter(
      (b) =>
        b.appointmentDate === dateStr &&
        b.status !== 'Cancelled' &&
        b.id !== excludeBookingId
    );
    const bookedTimes = new Set(activeBookingsOnDate.map((b) => b.startTime));
    const availableSlots = dayConfig.slots.filter((slot) => !bookedTimes.has(slot));

    return res.status(200).json({
      date: dateStr,
      isOpen: true,
      dayName: dayConfig.dayName,
      allSlots: dayConfig.slots,
      availableSlots,
      bookedSlots: Array.from(bookedTimes)
    });
  }

  // 3. POST /api/auth/send-verification-code
  if (method === 'POST' && pathname === '/api/auth/send-verification-code') {
    const { name, email } = body;
    if (!email) {
      return res.status(400).json({ error: 'Please enter your email address.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const verificationToken = createVerificationToken(normalizedEmail, code);

    const html = buildVerificationCodeEmailHtml({
      salonName: db.settings.salonName,
      customerName: String(name || normalizedEmail.split('@')[0]).trim(),
      code
    });

    const emailResult = await sendResendEmail({
      to: normalizedEmail,
      subject: `${code} is your ${db.settings.salonName} verification code`,
      html
    });

    return res.status(200).json({
      sent: true,
      sentViaResend: emailResult.sent,
      verificationToken,
      fallbackCode: emailResult.sent ? undefined : code,
      message: emailResult.sent
        ? `A 6-digit verification code has been sent to ${normalizedEmail}.`
        : `Verification code generated for ${normalizedEmail}.`
    });
  }

  // 4. POST /api/auth/register
  if (method === 'POST' && pathname === '/api/auth/register') {
    const {
      name,
      email,
      phone,
      password,
      hairTextureNotes,
      verificationCode,
      verificationToken
    } = body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: 'Please fill in your full name, email address, and password.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({ error: 'Your password must contain at least 6 characters.' });
    }

    if (verificationToken) {
      const check = verifyStatelessCode(
        normalizedEmail,
        String(verificationCode || ''),
        String(verificationToken)
      );
      if (!check.valid) {
        return res.status(400).json({
          error: check.expired
            ? 'Your verification code has expired. Please request a new code.'
            : 'Invalid 6-digit verification code. Please check your email and try again.'
        });
      }
    }

    const isOwnerEmail =
      normalizedEmail === 'alsherafael@gmail.com' ||
      normalizedEmail === 'owner@missbeauty.atelier';

    const newUser: StoredUser = {
      id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: String(name).trim().slice(0, 100),
      email: normalizedEmail,
      phone: String(phone || '').trim().slice(0, 40),
      role: isOwnerEmail ? 'owner' : 'customer',
      hairTextureNotes: String(hairTextureNotes || '').trim().slice(0, 300),
      emailVerified: true,
      createdAt: new Date().toISOString(),
      passwordHash: hashPassword(String(password))
    };

    const existingIdx = db.users.findIndex(
      (u) => u.email.toLowerCase() === normalizedEmail
    );
    if (existingIdx >= 0) {
      db.users[existingIdx] = newUser;
    } else {
      db.users.push(newUser);
    }
    saveServerlessDb(db);

    const token = createToken(newUser);
    return res.status(201).json({
      token,
      user: sanitizeUser(newUser)
    });
  }

  // 5. POST /api/auth/login
  if (method === 'POST' && pathname === '/api/auth/login') {
    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both your email and password.' });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (!user || user.passwordHash !== hashPassword(String(password))) {
      return res
        .status(401)
        .json({ error: 'Invalid email address or password. Please verify your credentials.' });
    }
    const token = createToken(user);
    return res.status(200).json({
      token,
      user: sanitizeUser(user)
    });
  }

  // 6. POST /api/auth/reset-password
  if (method === 'POST' && pathname === '/api/auth/reset-password') {
    const { email, newPassword } = body;
    if (!email || !newPassword || String(newPassword).length < 6) {
      return res.status(400).json({
        error: 'Please provide your email address and a new password (at least 6 characters).'
      });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = db.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (user) {
      user.passwordHash = hashPassword(String(newPassword));
      saveServerlessDb(db);
    }
    return res.status(200).json({
      message: 'Your password has been updated. You may now sign in.'
    });
  }

  // 7. POST /api/bookings
  if (method === 'POST' && pathname === '/api/bookings') {
    const {
      serviceId,
      appointmentDate,
      startTime,
      customerName,
      customerEmail,
      customerPhone,
      notes,
      createAccountPassword
    } = body;

    if (!serviceId || !appointmentDate || !startTime || !customerName || !customerEmail) {
      return res.status(400).json({
        error: 'Please complete all required reservation fields before confirming.'
      });
    }

    const service =
      db.services.find((s) => s.id === serviceId || s.slug === serviceId) || PRODUCTS[0];
    const normalizedEmail = String(customerEmail).trim().toLowerCase();

    let activeUser = authUser;
    let newAuthToken: string | undefined;

    if (!activeUser && createAccountPassword && String(createAccountPassword).length >= 6) {
      const createdUser: StoredUser = {
        id: `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        name: String(customerName).trim().slice(0, 100),
        email: normalizedEmail,
        phone: String(customerPhone || '').trim().slice(0, 40),
        role:
          normalizedEmail === 'alsherafael@gmail.com' ||
          normalizedEmail === 'owner@missbeauty.atelier'
            ? 'owner'
            : 'customer',
        hairTextureNotes: String(notes || '').trim().slice(0, 300),
        emailVerified: true,
        createdAt: new Date().toISOString(),
        passwordHash: hashPassword(String(createAccountPassword))
      };
      db.users.push(createdUser);
      activeUser = createdUser;
      newAuthToken = createToken(createdUser);
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
      price: service.price,
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

    const htmlPreview = buildConfirmationEmailHtml({
      salonName: db.settings.salonName,
      customerName: newBooking.customerName,
      serviceName: newBooking.serviceName,
      duration: newBooking.duration,
      price: newBooking.price,
      date: newBooking.appointmentDate,
      time: newBooking.startTime,
      address: `${db.settings.address}, ${db.settings.city}`,
      reference: newBooking.reference
    });

    const emailSend = await sendResendEmail({
      to: newBooking.customerEmail,
      subject: `${db.settings.salonName} — Reservation Ticket #${newBooking.reference}`,
      html: htmlPreview
    });

    const emailLog: EmailLog = {
      id: `em_${Date.now()}`,
      bookingId: newBooking.id,
      reference: newBooking.reference,
      to: newBooking.customerEmail,
      subject: `${db.settings.salonName} — Reservation Ticket #${newBooking.reference}`,
      template: 'booking_confirmation',
      status: emailSend.sent ? 'sent' : 'queued',
      provider: `LevelUp Email API (${LEVELUP_API_URL}) -> Resend`,
      htmlPreview,
      sentAt: new Date().toISOString()
    };

    newBooking.emailSent = emailSend.sent;
    newBooking.emailLogId = emailLog.id;
    db.bookings.unshift(newBooking);
    db.emailLogs.unshift(emailLog);
    saveServerlessDb(db);

    return res.status(201).json({
      booking: newBooking,
      emailLog,
      token: newAuthToken,
      user: activeUser ? sanitizeUser(activeUser) : undefined
    });
  }

  // 8. Authenticated Account Routes
  if (pathname === '/api/account/bookings' && method === 'GET') {
    if (!authUser) {
      return res.status(401).json({ error: 'Please sign in to view your appointments.' });
    }
    const myBookings = db.bookings.filter(
      (b) =>
        b.customerId === authUser!.id ||
        b.customerEmail.toLowerCase() === authUser!.email.toLowerCase()
    );
    return res.status(200).json({ bookings: myBookings, emailLogs: [] });
  }

  if (pathname === '/api/account/profile' && method === 'PATCH') {
    if (!authUser) {
      return res.status(401).json({ error: 'Please sign in to update your profile.' });
    }
    const { name, phone, hairTextureNotes } = body;
    if (typeof name === 'string' && name.trim()) authUser.name = name.trim().slice(0, 100);
    if (typeof phone === 'string') authUser.phone = phone.trim().slice(0, 40);
    if (typeof hairTextureNotes === 'string') {
      authUser.hairTextureNotes = hairTextureNotes.trim().slice(0, 400);
    }
    saveServerlessDb(db);
    return res.status(200).json({ user: sanitizeUser(authUser) });
  }

  // 9. Owner Dashboard Protected Routes
  if (pathname.startsWith('/api/dashboard')) {
    if (!authUser || authUser.role !== 'owner') {
      return res.status(403).json({
        error: 'Access denied. Salon Owner authentication is required.'
      });
    }
    if (pathname === '/api/dashboard/overview' && method === 'GET') {
      const todayStr = getTodayIso();
      const customers = db.users
        .filter((u) => u.role === 'customer')
        .map(sanitizeUser);
      return res.status(200).json({
        metrics: {
          todaysAppointmentsCount: db.bookings.filter(
            (b) => b.appointmentDate === todayStr && b.status !== 'Cancelled'
          ).length,
          upcomingBookingsCount: db.bookings.filter(
            (b) => b.appointmentDate >= todayStr && b.status !== 'Cancelled'
          ).length,
          totalCustomersCount: customers.length,
          availableSlotsCount: 4,
          totalRevenueConfirmed: db.bookings
            .filter((b) => b.status === 'Confirmed' || b.status === 'Completed')
            .reduce((sum, b) => sum + b.price, 0)
        },
        bookings: db.bookings,
        customers,
        services: db.services,
        availability: db.availability,
        settings: db.settings,
        emailLogs: db.emailLogs
      });
    }
  }

  return res.status(404).json({ error: 'Requested salon endpoint was not found.' });
}
