/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Self-contained Vercel Serverless Function for Miss beauty Atelier (/api/*)
 * Pure ES Module with zero relative file imports so Node.js ESM on Vercel
 * never fails with ERR_MODULE_NOT_FOUND.
 */

import fs from 'node:fs';
import crypto from 'node:crypto';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'miss-beauty-stateless-hmac-key-v1';
const LEVELUP_API_URL =
  process.env.LEVELUP_API_URL || 'https://api.levelup-ecosystem.com';
const DEFAULT_SENDER_EMAIL =
  'Miss beauty Atelier <studio@levelup-ecosystem.com>';

function getResendApiKey() {
  return (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    process.env.RESEND_KEY ||
    ''
  ).trim();
}

function getSenderEmail() {
  const raw = (
    process.env.RESEND_FROM_EMAIL ||
    process.env.VITE_RESEND_FROM_EMAIL ||
    DEFAULT_SENDER_EMAIL
  ).trim();
  const cleaned = raw.replace(/\.+@/g, '@');
  if (cleaned.includes('<') && cleaned.includes('>')) {
    return cleaned;
  }
  if (cleaned.includes('@')) {
    return `Miss beauty Atelier <${cleaned}>`;
  }
  return DEFAULT_SENDER_EMAIL;
}

const DEFAULT_BUSINESS_SETTINGS = {
  salonName: 'Miss beauty',
  tagline: 'Architectural Hair Salon & Bespoke Texture Sanctuary.',
  address: '24 Rue du Faubourg Saint-Honoré',
  city: '75008 Paris, France',
  phone: '+33 1 42 68 55 00',
  email: 'studio@levelup-ecosystem.com',
  hoursSummary: 'Tuesday – Saturday, 9:30 AM – 7:30 PM',
  cancellationPolicy:
    'We kindly request 24 hours notice for any rescheduling or cancellation so we may offer your reserved sanctuary window to our waitlist.'
};

const DEFAULT_AVAILABILITY = [
  { dayOfWeek: 0, dayName: 'Sunday', isOpen: false, openTime: '10:00 AM', closeTime: '5:00 PM', slots: [] },
  { dayOfWeek: 1, dayName: 'Monday', isOpen: false, openTime: '9:30 AM', closeTime: '7:00 PM', slots: [] },
  {
    dayOfWeek: 2,
    dayName: 'Tuesday',
    isOpen: true,
    openTime: '9:30 AM',
    closeTime: '7:30 PM',
    slots: ['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM']
  },
  {
    dayOfWeek: 3,
    dayName: 'Wednesday',
    isOpen: true,
    openTime: '9:30 AM',
    closeTime: '7:30 PM',
    slots: ['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM']
  },
  {
    dayOfWeek: 4,
    dayName: 'Thursday',
    isOpen: true,
    openTime: '9:30 AM',
    closeTime: '8:00 PM',
    slots: ['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM']
  },
  {
    dayOfWeek: 5,
    dayName: 'Friday',
    isOpen: true,
    openTime: '9:30 AM',
    closeTime: '8:00 PM',
    slots: ['09:30 AM', '11:30 AM', '02:00 PM', '04:30 PM', '06:00 PM']
  },
  {
    dayOfWeek: 6,
    dayName: 'Saturday',
    isOpen: true,
    openTime: '9:00 AM',
    closeTime: '7:30 PM',
    slots: ['09:00 AM', '11:00 AM', '01:30 PM', '04:00 PM', '05:30 PM']
  }
];

const DEFAULT_PRODUCTS = [
  {
    id: 's1',
    slug: 'boho-knotless-braids',
    name: 'Signature Boho Knotless',
    tagline: 'Weightless tension-free parting with cascading human hair curls.',
    description:
      'Our signature knotless protective ritual. Engineered with micro-parting geometry that respects your hairline and scalp tension, finished with hand-selected bohemian curls.',
    longDescription:
      'Every Signature Boho Knotless session begins with a scalp hydration steam mist and custom parting map tailored to your bone structure. Using our zero-tension feed-in technique, strands lie completely flat from day one, allowing immediate high-bun styling without pulling on delicate edges.',
    price: 340,
    duration: '4h 30m',
    durationMinutes: 270,
    category: 'Braids',
    imageUrl: 'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp',
    gallery: [
      'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp',
      'https://i.ibb.co/2VPYx4p/Do-Knotless-Braids-Damage-Natural-Hair.png',
      'https://i.ibb.co/1YdwDDg8/images.jpg'
    ],
    features: [
      'Tension-Free Micro Parting',
      '100% Virgin Bohemian Curls Included',
      'Pre-Braiding Scalp Steam & Oil Infusion'
    ],
    active: true
  },
  {
    id: 's2',
    slug: 'silk-press-botanical',
    name: 'Botanical Silk Press & Trim',
    tagline: 'Mirror-shine thermal smoothing without compromising curl memory.',
    description:
      'A restorative amino-acid steam infusion followed by precision ceramic silk pressing and a structural micro-trim.',
    longDescription:
      'Designed specifically for natural coils and curls seeking temporary fluid movement with zero heat damage. We layer cold-pressed camellia and baobab proteins under ultrasonic steam before executing a single-pass controlled ceramic press.',
    price: 165,
    duration: '2h 00m',
    durationMinutes: 120,
    category: 'Silk Press',
    imageUrl: 'https://i.ibb.co/1YdwDDg8/images.jpg',
    gallery: [
      'https://i.ibb.co/1YdwDDg8/images.jpg',
      'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp'
    ],
    features: [
      'Ultrasonic Hydration Steam Bath',
      'Heat-Shield Amino Acid Bonding',
      'Architectural Split-End Dusting'
    ],
    active: true
  },
  {
    id: 's3',
    slug: 'sculpted-stitch-cornrows',
    name: 'Architectural Stitch Cornrows',
    tagline: 'Graphic, clean-lined feed-in geometry crafted for longevity.',
    description:
      'Precision stitch-line braiding with custom geometric parting, scalp soothing elixir, and satin mousse setting.',
    longDescription:
      'Inspired by West African sculptural heritage and contemporary Parisian minimalism, our Architectural Stitch Cornrows celebrate clean negative space and symmetrical precision.',
    price: 220,
    duration: '2h 45m',
    durationMinutes: 165,
    category: 'Braids',
    imageUrl: 'https://i.ibb.co/2VPYx4p/Do-Knotless-Braids-Damage-Natural-Hair.png',
    gallery: [
      'https://i.ibb.co/2VPYx4p/Do-Knotless-Braids-Damage-Natural-Hair.png',
      'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp'
    ],
    features: [
      'Bespoke Geometric Parting Design',
      'Soothing Peppermint & Rosemary Scalp Elixir',
      'Hot Towel & Satin Foam Finish'
    ],
    active: true
  },
  {
    id: 's4',
    slug: 'crown-detox-scalp-ritual',
    name: 'Crown Detox & Moisture Ritual',
    tagline: 'Deep follicular purification and warm botanical clay mask.',
    description:
      'Micro-mist oxygenation, gentle exfoliation, and a 30-minute acupressure cranial massage for post-protective style recovery.',
    longDescription:
      'The essential reset between protective styles. We dissolve product build-up with warm rhassoul clay and willow bark, followed by an extended lymphatic scalp massage and deep moisture therapy.',
    price: 145,
    duration: '1h 30m',
    durationMinutes: 90,
    category: 'Scalp & Care',
    imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200',
    gallery: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&q=80&w=1200'
    ],
    features: [
      'Rhassoul Clay Follicular Detox',
      '30-Minute Cranial Acupressure',
      'Ozone Micro-Mist Steam Therapy'
    ],
    active: true
  },
  {
    id: 's5',
    slug: 'bespoke-curl-sculpture-cut',
    name: 'Dry Curl Sculpture & Cut',
    tagline: 'Coil-by-coil dry shaping tailored to your natural shrinkage and fall.',
    description:
      'Custom dry cutting in your natural curl state, followed by a botanical wash-and-go definition session.',
    longDescription:
      'Curly and coily hair lives in three dimensions. We sculpt each curl family dry in its natural resting state before cleansing with sulfate-free botanicals and diffusing to perfection.',
    price: 190,
    duration: '2h 00m',
    durationMinutes: 120,
    category: 'Natural Styling',
    imageUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=1200',
    gallery: [
      'https://images.unsplash.com/photo-1519699047748-de8e457a634e?auto=format&fit=crop&q=80&w=1200'
    ],
    features: [
      'Dry Coil-by-Coil Architectural Cut',
      'Botanical Hydration Wash & Define',
      'Personalized At-Home Regimen Blueprint'
    ],
    active: true
  },
  {
    id: 's6',
    slug: 'fulani-tribal-fusion',
    name: 'Half-Stitch Bohemian Fusion',
    tagline: 'Intricate crown stitch work seamlessly transitioning into waist-length boho braids.',
    description:
      'The ultimate editorial statement combining geometric front feed-in cornrows with airy knotless bohemian lengths in the back.',
    longDescription:
      'Crafted for versatility and facial framing, this hybrid service pairs our signature stitch work along the crown with weightless bohemian knotless braids through the back.',
    price: 380,
    duration: '5h 00m',
    durationMinutes: 300,
    category: 'Braids',
    imageUrl: 'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp',
    gallery: [
      'https://i.ibb.co/xttGNmmV/Half-stitch-cornrows-half-bohemian-box-braids-480x480.webp',
      'https://i.ibb.co/2VPYx4p/Do-Knotless-Braids-Damage-Natural-Hair.png'
    ],
    features: [
      'Custom Facial-Framing Stitch Pattern',
      'Human Hair Bohemian Curl Accents',
      'Complimentary Silk Night Scarf'
    ],
    active: true
  }
];

function hashPassword(password) {
  const salt = 'miss_beauty_salt_v1';
  return crypto.scryptSync(String(password), salt, 64).toString('hex');
}

function createToken(user) {
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

function verifyToken(token) {
  try {
    const [base64Payload, signature] = String(token || '').split('.');
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

function createVerificationToken(email, code) {
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = JSON.stringify({
    email: String(email).trim().toLowerCase(),
    code: String(code).trim(),
    exp: expiresAt
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${sig}`;
}

function verifyStatelessCode(email, code, token) {
  if (!token) return { valid: false };
  try {
    const [base64Payload, sig] = String(token).split('.');
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
      data.email === String(email).trim().toLowerCase() &&
      String(data.code) === String(code).trim()
    ) {
      return { valid: true };
    }
    return { valid: false };
  } catch {
    return { valid: false };
  }
}

function calculateEndTime(startTime, durationMinutes) {
  const match = String(startTime || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return startTime;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  const totalMinutes = hours * 60 + minutes + Number(durationMinutes || 60);
  const endHours24 = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  const endPeriod = endHours24 >= 12 ? 'PM' : 'AM';
  const endHours12 = endHours24 % 12 === 0 ? 12 : endHours24 % 12;
  return `${endHours12}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;
}

function formatReadableDate(dateStr) {
  try {
    const [y, m, d] = String(dateStr).split('-').map(Number);
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

function buildVerificationCodeEmailHtml(params) {
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

function buildConfirmationEmailHtml(params) {
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

async function sendResendEmail(params) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return {
      sent: false,
      errorDetail:
        'RESEND_API_KEY is not configured in Vercel Environment Variables.'
    };
  }

  const candidateSenders = [
    getSenderEmail(),
    'studio@levelup-ecosystem.com',
    'Miss beauty Atelier <onboarding@resend.dev>'
  ].filter((v, idx, arr) => Boolean(v) && arr.indexOf(v) === idx);

  let lastError = '';

  for (const sender of candidateSenders) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          from: sender,
          to: [params.to],
          subject: params.subject,
          html: params.html
        })
      });

      if (response.ok) {
        return { sent: true, senderUsed: sender };
      }

      const errText = await response.text().catch(() => '');
      lastError = `Status ${response.status}: ${errText}`;
      console.warn(`Resend attempt with "${sender}" failed:`, lastError);
    } catch (err) {
      lastError = err?.message || 'Network error contacting Resend';
    }
  }

  return { sent: false, errorDetail: lastError };
}

const TMP_DB_FILE = '/tmp/miss-beauty-salon-db.json';

function getTodayIso() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadServerlessDb() {
  try {
    if (fs.existsSync(TMP_DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(TMP_DB_FILE, 'utf-8'));
      if (parsed && Array.isArray(parsed.services)) return parsed;
    }
  } catch {
    // Ignore and initialize default state
  }

  const seeded = {
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
    services: DEFAULT_PRODUCTS.map((p) => ({ ...p, active: true })),
    bookings: [],
    availability: DEFAULT_AVAILABILITY,
    settings: DEFAULT_BUSINESS_SETTINGS,
    emailLogs: []
  };

  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(seeded, null, 2), 'utf-8');
  } catch {
    // Ignore read-only fs errors
  }
  return seeded;
}

function saveServerlessDb(db) {
  try {
    fs.writeFileSync(TMP_DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch {
    // Ignore read-only fs errors
  }
}

function sanitizeUser(u) {
  if (!u) return u;
  const { passwordHash: _ph, ...safe } = u;
  return safe;
}

function resolveApiPathname(req) {
  const rawUrl = String(req.url || '/');
  const urlObj = new URL(rawUrl, 'http://localhost');
  const rewrittenPath =
    (req.query && req.query.__path) || urlObj.searchParams.get('__path');

  if (rewrittenPath) {
    const clean = Array.isArray(rewrittenPath)
      ? rewrittenPath.join('/')
      : String(rewrittenPath).replace(/^\/+/, '');
    const [withoutQuery] = clean.split('?');
    return withoutQuery.startsWith('api/')
      ? `/${withoutQuery}`
      : `/api/${withoutQuery}`;
  }

  const [pathname] = rawUrl.split('?');
  if (pathname.startsWith('/api/')) return pathname;
  return `/api/${pathname.replace(/^\/+/, '')}`;
}

async function parseRequestBody(req) {
  try {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === 'string' && req.body.trim()) {
      return JSON.parse(req.body);
    }
    if (Buffer.isBuffer(req.body)) {
      const str = req.body.toString('utf-8').trim();
      return str ? JSON.parse(str) : {};
    }
    if (req.readable) {
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf-8').trim();
      if (raw) return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to parse request body:', err);
  }
  return {};
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const db = loadServerlessDb();
    const rawUrl = String(req.url || '/');
    const urlObj = new URL(rawUrl, 'http://localhost');
    const pathname = resolveApiPathname(req);
    const method = String(req.method || 'GET').toUpperCase();
    const body =
      method === 'POST' || method === 'PATCH' || method === 'PUT'
        ? await parseRequestBody(req)
        : {};

    // Extract optional authenticated user from signed token
    let authUser = null;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.slice(7));
      if (decoded) {
        authUser =
          db.users.find(
            (u) => u.id === decoded.id || u.email === decoded.email
          ) || {
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
      const dateStr = String(
        req.query?.date || urlObj.searchParams.get('date') || getTodayIso()
      );
      const excludeBookingId = String(
        req.query?.excludeBookingId ||
          urlObj.searchParams.get('excludeBookingId') ||
          ''
      );

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res
          .status(400)
          .json({ error: 'Please select a valid appointment date.' });
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
      const availableSlots = dayConfig.slots.filter(
        (slot) => !bookedTimes.has(slot)
      );

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
        return res
          .status(400)
          .json({ error: 'Please enter your email address.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        return res
          .status(400)
          .json({ error: 'Please enter a valid email address.' });
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
        resendNotice: emailResult.sent ? undefined : emailResult.errorDetail,
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
        return res.status(400).json({
          error: 'Please fill in your full name, email address, and password.'
        });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      if (String(password).length < 6) {
        return res.status(400).json({
          error: 'Your password must contain at least 6 characters.'
        });
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

      const newUser = {
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
        return res
          .status(400)
          .json({ error: 'Please enter both your email and password.' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (!user || user.passwordHash !== hashPassword(String(password))) {
        return res.status(401).json({
          error:
            'Invalid email address or password. Please verify your credentials.'
        });
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
          error:
            'Please provide your email address and a new password (at least 6 characters).'
        });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = db.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
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

      if (
        !serviceId ||
        !appointmentDate ||
        !startTime ||
        !customerName ||
        !customerEmail
      ) {
        return res.status(400).json({
          error:
            'Please complete all required reservation fields before confirming.'
        });
      }

      const service =
        db.services.find((s) => s.id === serviceId || s.slug === serviceId) ||
        DEFAULT_PRODUCTS[0];
      const normalizedEmail = String(customerEmail).trim().toLowerCase();

      let activeUser = authUser;
      let newAuthToken;

      if (
        !activeUser &&
        createAccountPassword &&
        String(createAccountPassword).length >= 6
      ) {
        const createdUser = {
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
      const newBooking = {
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

      const emailLog = {
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
        return res
          .status(401)
          .json({ error: 'Please sign in to view your appointments.' });
      }
      const myBookings = db.bookings.filter(
        (b) =>
          b.customerId === authUser.id ||
          b.customerEmail.toLowerCase() === authUser.email.toLowerCase()
      );
      return res.status(200).json({ bookings: myBookings, emailLogs: [] });
    }

    if (pathname === '/api/account/profile' && method === 'PATCH') {
      if (!authUser) {
        return res
          .status(401)
          .json({ error: 'Please sign in to update your profile.' });
      }
      const { name, phone, hairTextureNotes } = body;
      if (typeof name === 'string' && name.trim()) {
        authUser.name = name.trim().slice(0, 100);
      }
      if (typeof phone === 'string') {
        authUser.phone = phone.trim().slice(0, 40);
      }
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
              .filter(
                (b) => b.status === 'Confirmed' || b.status === 'Completed'
              )
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

    return res
      .status(404)
      .json({ error: 'Requested salon endpoint was not found.' });
  } catch (err) {
    console.error('Unhandled API error:', err);
    return res.status(500).json({
      error:
        'A temporary server error occurred. Please check your connection and try again.'
    });
  }
}
