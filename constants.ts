/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Product, JournalArticle, DayAvailability, BusinessSettings } from './types';

export const HERO_IMAGE = '/src/assets/images/hero_salon_sanctuary_1791410222468.jpg';
export const IMG_SIGNATURE_CUT = '/src/assets/images/service_signature_cut_1791410232344.jpg';
export const IMG_BRAIDS = '/src/assets/images/service_braids_protective_1791410243702.jpg';
export const IMG_SILK_COLOR = '/src/assets/images/service_silk_press_color_1791410252978.jpg';
export const IMG_TREATMENT = '/src/assets/images/service_treatment_bridal_1791410261649.jpg';

export const PRODUCTS: Product[] = [
  {
    id: 's1',
    slug: 'signature-haircut',
    name: 'Signature Haircut',
    tagline: 'Architecture in motion.',
    description: 'Bespoke dry and wet sculptural cutting tailored to your bone structure, natural fall, and daily ritual.',
    longDescription: 'A haircut should grow out as gracefully as the day it was shaped. Our Signature Haircut begins with a quiet consultation and microscopic scalp analysis, followed by a detoxifying botanical steam cleanse. Using both Japanese dry-carving and precision wet-line techniques, we sculpt a silhouette that moves effortlessly with your natural texture—requiring minimal heat or intervention at home.',
    price: 165,
    duration: '1h 15m',
    durationMinutes: 75,
    category: 'Cut & Styling',
    imageUrl: IMG_SIGNATURE_CUT,
    gallery: [IMG_SIGNATURE_CUT, HERO_IMAGE],
    features: ['Diagnostic Texture Mapping', 'Botanical Steam Cleanse', 'Custom Dry & Wet Sculpting']
  },
  {
    id: 's2',
    slug: 'braids',
    name: 'Braids',
    tagline: 'Weightless geometric artistry.',
    description: 'Tension-free knotless braids crafted with organic pre-cleansed fibers and a soothing scalp elixir ritual.',
    longDescription: 'Our artisanal Knotless Braids honor the heritage of braiding while prioritizing follicular serenity. Every parting is mapped with mathematical precision to distribute weight evenly and eliminate hairline tension. Prior to braiding, your natural hair is infused with warm baobab and rosemary hydro-mist, ensuring your strands remain deeply hydrated throughout your protective wear.',
    price: 280,
    duration: '2h 30m',
    durationMinutes: 150,
    category: 'Braids & Protective',
    imageUrl: IMG_BRAIDS,
    gallery: [IMG_BRAIDS, IMG_TREATMENT],
    features: ['Zero-Tension Knotless Method', 'Pre-Soaked Hypoallergenic Fiber', 'Warm Baobab Scalp Infusion']
  },
  {
    id: 's3',
    slug: 'silk-press',
    name: 'Silk Press',
    tagline: 'Luminous fluidity without compromise.',
    description: 'A restorative thermal smoothing ritual that imparts mirror-like reflection while preserving every curl bond.',
    longDescription: 'True silkiness is born in the hydration phase, never from excessive heat. Our Silk Press ritual layers amino-acid silk proteins and cold-pressed camellia oil under a gentle micro-mist steamer before a single pass of calibrated ionic titanium. Your curls are left weightless, swingy, and luminous—returning 100% to their natural coil pattern upon your next wash.',
    price: 150,
    duration: '1h 45m',
    durationMinutes: 105,
    category: 'Cut & Styling',
    imageUrl: IMG_SILK_COLOR,
    gallery: [IMG_SILK_COLOR, IMG_SIGNATURE_CUT],
    features: ['Micro-Mist Hydration Steam', 'Bond-Shield Thermal Protection', 'Humidity-Resistant Silk Finish']
  },
  {
    id: 's4',
    slug: 'protective-styles',
    name: 'Protective Styles',
    tagline: 'Sanctuary for natural growth.',
    description: 'Sculptural twists, fulani patterns, and architectural updos designed to rest and nurture your natural crown.',
    longDescription: 'Give your strands a season of stillness. Our Protective Styles blend editorial form with deep trichological care. Following a clarifying clay mask and moisture-sealing butter bath, our master stylists craft custom two-strand twists, flat-twist crowns, or stitch patterns tailored to your facial proportions and lifestyle.',
    price: 240,
    duration: '2h 15m',
    durationMinutes: 135,
    category: 'Braids & Protective',
    imageUrl: IMG_BRAIDS,
    gallery: [IMG_BRAIDS, HERO_IMAGE],
    features: ['Follicle-First Parting Grid', 'Shea & Ceramide Moisture Lock', '4 to 6 Weeks Longevity']
  },
  {
    id: 's5',
    slug: 'hair-coloring',
    name: 'Hair Coloring',
    tagline: 'Sunlit dimensional warmth.',
    description: 'Ammonia-free botanical balayage, glossing, and dimensional color formulated to enhance hair integrity.',
    longDescription: 'Color should look as though it was painted by afternoon light, never harsh chemicals. We formulate custom pigments using 92% naturally derived botanical carriers, French clay lighteners, and integrated disulphide bond builders. Whether you desire rich espresso glaze, warm honey ribbons, or luminous copper dimension, your hair leaves softer than it arrived.',
    price: 310,
    duration: '2h 45m',
    durationMinutes: 165,
    category: 'Color & Extensions',
    imageUrl: IMG_SILK_COLOR,
    gallery: [IMG_SILK_COLOR, IMG_TREATMENT],
    features: ['Ammonia-Free Botanical Pigment', 'Integrated Bond Reconstruction', 'Custom Acidic Gloss Seal']
  },
  {
    id: 's6',
    slug: 'extensions',
    name: 'Extensions',
    tagline: 'Seamless volume and length.',
    description: 'Ethically sourced, raw single-donor hair integrated via invisible micro-wefts or keratin bonds.',
    longDescription: 'Invisible to the eye and imperceptible to the touch. Our Extensions service custom-matches your exact curl pattern, density, and undertone using ethically sourced, cuticle-intact hair. Installed without glue or harsh braiding tension, each row moves harmoniously with your natural hair and allows full scalp breathability.',
    price: 490,
    duration: '3h 00m',
    durationMinutes: 180,
    category: 'Color & Extensions',
    imageUrl: IMG_SIGNATURE_CUT,
    gallery: [IMG_SIGNATURE_CUT, IMG_SILK_COLOR],
    features: ['Custom Texture & Shade Matching', 'Invisible Micro-Point Attachment', 'Precision Blending Cut Included']
  },
  {
    id: 's7',
    slug: 'blowout',
    name: 'Blowout',
    tagline: 'Effortless movement, lasting polish.',
    description: 'A relaxing aromatic wash and round-brush sculpting for airy volume, soft waves, or sleek glass polish.',
    longDescription: 'More than a styling appointment, our Signature Blowout is a forty-five-minute pause from the noise of the city. Enjoy a slow acupressure scalp massage at our reclined stone basins, followed by a weightless botanical blowout using boar-bristle brushes that seal the cuticle for days of touchable movement.',
    price: 95,
    duration: '1h 00m',
    durationMinutes: 60,
    category: 'Cut & Styling',
    imageUrl: IMG_SIGNATURE_CUT,
    gallery: [IMG_SIGNATURE_CUT, HERO_IMAGE],
    features: ['Acupressure Scalp Cleanse', 'Boar-Bristle Cuticle Polish', 'Weightless Botanical Finishing Mist']
  },
  {
    id: 's8',
    slug: 'styling',
    name: 'Styling',
    tagline: 'Editorial form for red-carpet moments.',
    description: 'Architectural chignons, finger waves, and modern sculptural silhouettes crafted for evenings and press.',
    longDescription: 'Drawing from our team’s background at Paris and Milan fashion weeks, our Editorial Styling service approaches hair as living sculpture. We work with pins, silk threads, and weightless memory elixirs—never stiff, crunchy lacquers—so your silhouette photographs impeccably from every angle while remaining comfortable all evening.',
    price: 140,
    duration: '1h 15m',
    durationMinutes: 75,
    category: 'Cut & Styling',
    imageUrl: IMG_BRAIDS,
    gallery: [IMG_BRAIDS, IMG_SIGNATURE_CUT],
    features: ['Runway-Grade Structural Pinning', 'Brushable Memory Hold', 'Bespoke Silhouette Consultation']
  },
  {
    id: 's9',
    slug: 'treatment',
    name: 'Treatment',
    tagline: 'Return to follicular balance.',
    description: 'Japanese head-spa hydrotherapy, warm herbal oil infusion, and ultrasonic bond restoration.',
    longDescription: 'Healthy hair begins beneath the surface. Inspired by Kyoto head-spa sanctuaries, our Deep Botanical Treatment combines a warm waterfall halo rinse, lymphatic cranial massage, exfoliating sea-silt scalp masque, and ultrasonic infrared cold-iron therapy that drives pure ceramides and silk peptides deep into the cortex.',
    price: 185,
    duration: '1h 30m',
    durationMinutes: 90,
    category: 'Rituals & Bridal',
    imageUrl: IMG_TREATMENT,
    gallery: [IMG_TREATMENT, HERO_IMAGE],
    features: ['Kyoto Waterfall Halo Hydrotherapy', 'Ultrasonic Infrared Bond Infusion', '25-Minute Cranial Lymphatic Massage']
  },
  {
    id: 's10',
    slug: 'bridal-hair',
    name: 'Bridal Hair',
    tagline: 'Timeless grace for your ceremony.',
    description: 'Private atelier consultation, full preparatory hair spa, and bespoke bridal styling created for your gown.',
    longDescription: 'Your wedding hair should feel unmistakably like you—elevated to its purest expression. Conducted in our private sunlit suite, our Bridal Couture experience includes an in-depth veil and neckline study, a luminizing botanical gloss treatment, and architectural styling engineered to endure from morning vows to midnight dancing.',
    price: 380,
    duration: '2h 30m',
    durationMinutes: 150,
    category: 'Rituals & Bridal',
    imageUrl: IMG_TREATMENT,
    gallery: [IMG_TREATMENT, IMG_SILK_COLOR],
    features: ['Private Sanctuary Suite', 'Veil & Headpiece Integration', 'Silk-Peptide Luminosity Prep']
  }
];

export const DEFAULT_AVAILABILITY: DayAvailability[] = [
  { dayOfWeek: 0, dayName: 'Sunday', isOpen: false, openTime: '10:00', closeTime: '17:00', slots: [] },
  { dayOfWeek: 1, dayName: 'Monday', isOpen: false, openTime: '10:00', closeTime: '18:00', slots: [] },
  { dayOfWeek: 2, dayName: 'Tuesday', isOpen: true, openTime: '09:30', closeTime: '19:30', slots: ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'] },
  { dayOfWeek: 3, dayName: 'Wednesday', isOpen: true, openTime: '09:30', closeTime: '19:30', slots: ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM'] },
  { dayOfWeek: 4, dayName: 'Thursday', isOpen: true, openTime: '09:30', closeTime: '20:00', slots: ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM', '6:00 PM'] },
  { dayOfWeek: 5, dayName: 'Friday', isOpen: true, openTime: '09:30', closeTime: '20:00', slots: ['10:00 AM', '11:30 AM', '2:00 PM', '4:30 PM', '6:00 PM'] },
  { dayOfWeek: 6, dayName: 'Saturday', isOpen: true, openTime: '09:00', closeTime: '19:00', slots: ['9:30 AM', '11:30 AM', '2:00 PM', '4:30 PM'] },
];

export const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  salonName: 'Miss beauty',
  tagline: 'Your Hair. Your Signature.',
  address: '24 Rue Saint-Honoré',
  city: 'Paris / New York / Kyoto',
  phone: '+33 1 42 68 55 00',
  email: 'concierge@missbeauty.atelier',
  hoursSummary: 'Tuesday – Saturday, 9:30 AM – 7:30 PM',
  cancellationPolicy: 'Complimentary rescheduling or cancellation up to 24 hours prior to your appointment.',
  levelUpApiUrl: 'https://api.levelup-ecosystem.com'
};

export const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    id: 1,
    slug: 'the-architecture-of-texture',
    title: 'The Architecture of Texture',
    date: 'October 2, 2026',
    excerpt: 'Why working with your hair’s natural coil, wave, and grain creates effortless longevity.',
    image: IMG_BRAIDS,
    content: React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'p',
        { className: 'mb-6 first-letter:text-5xl first-letter:font-serif first-letter:mr-3 first-letter:float-left text-[#5D5A53]' },
        'For decades, conventional salons approached hair through force—stretching, chemical altering, or masking the natural blueprint of the strand. Yet every curl pattern and follicular angle possesses its own internal architecture.'
      ),
      React.createElement(
        'p',
        { className: 'mb-8 text-[#5D5A53]' },
        'When a cut or braid pattern respects the natural tension and fall of your crown, styling ceases to be a daily battle. The silhouette settles into place on its own, aging gracefully over weeks rather than hours.'
      ),
      React.createElement(
        'blockquote',
        { className: 'border-l-2 border-[#2C2A26] pl-6 italic text-xl text-[#2C2A26] my-10 font-serif' },
        '"To honor texture is to listen before sculpting. Beauty is the absence of strain."'
      ),
      React.createElement(
        'p',
        { className: 'mb-6 text-[#5D5A53]' },
        'At Miss beauty, every appointment begins in stillness. We examine porosity, elasticity, and scalp vitality in natural daylight before a single comb or scissor touches your hair.'
      )
    )
  },
  {
    id: 2,
    slug: 'the-ritual-of-stillness',
    title: 'The Ritual of Stillness',
    date: 'September 18, 2026',
    excerpt: 'Inside our Kyoto-inspired head spa: why scalp hydrotherapy is the true foundation of luminous hair.',
    image: IMG_TREATMENT,
    content: React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'p',
        { className: 'mb-6 text-[#5D5A53]' },
        'In Japanese aesthetics, the concept of ',
        React.createElement('em', null, 'Ma'),
        ' refers to the restorative pause between moments. Most salons are loud—filled with roaring dryers, harsh overhead glare, and rushed schedules.'
      ),
      React.createElement(
        'p',
        { className: 'mb-8 text-[#5D5A53]' },
        '"When the nervous system is tense, micro-circulation to the scalp constricts," explains our lead trichologist. "By transforming the wash basin into a quiet sanctuary of warm botanical steam and slow cranial massage, we restore vitality at the root."'
      ),
      React.createElement(
        'div',
        { className: 'my-12 p-8 bg-[#EBE7DE] font-serif text-[#2C2A26] italic text-center' },
        React.createElement('p', null, 'Warm water over stone,'),
        React.createElement('p', null, 'Camellia and cedar mist,'),
        React.createElement('p', null, 'The crown rests in quiet,'),
        React.createElement('p', null, 'And radiance returns.')
      ),
      React.createElement(
        'p',
        { className: 'mb-6 text-[#5D5A53]' },
        'Every service in our collection—from a Signature Haircut to Knotless Braids—includes our complimentary botanical steam cleanse.'
      )
    )
  },
  {
    id: 3,
    slug: 'autumn-atelier-notes',
    title: 'Autumn Atelier Notes',
    date: 'September 4, 2026',
    excerpt: 'Notes from the color studio: roasted chestnut glosses, raw silk press, and tension-free protective forms.',
    image: IMG_SILK_COLOR,
    content: React.createElement(
      React.Fragment,
      null,
      React.createElement(
        'p',
        { className: 'mb-6 text-[#5D5A53]' },
        'As the light shifts toward the amber tones of autumn, our colorists turn away from high-contrast bleaching in favor of translucent, light-reflecting botanical glazes.'
      ),
      React.createElement(
        'p',
        { className: 'mb-8 text-[#5D5A53]' },
        'Think warm sandalwood, smoked espresso, and sunlit bronze—applied with clay carriers that leave the cuticle sealed and mirror-smooth.'
      ),
      React.createElement(
        'div',
        { className: 'my-12 p-8 bg-[#2C2A26] text-[#F5F2EB] font-serif italic text-center' },
        React.createElement('p', null, 'Silk that moves like water,'),
        React.createElement('p', null, 'Color warmed by autumn sun,'),
        React.createElement('p', null, 'Your hair, your signature.')
      )
    )
  }
];

export const TESTIMONIALS = [
  {
    quote: 'The calmest, most intentional hair appointment of my life. My knotless braids felt completely weightless from day one, and the scalp steam ritual is unmatched.',
    author: 'Camille Laurent',
    role: 'Creative Director, Paris',
    service: 'Braids & Botanical Steam'
  },
  {
    quote: 'My silk press lasted three weeks in autumn humidity with zero heat damage—my natural curls bounced right back on wash day. It truly feels like a private sanctuary.',
    author: 'Elena Rostova',
    role: 'Architectural Editor',
    service: 'Silk Press & Treatment'
  },
  {
    quote: 'Every detail—from the travertine basins to the dry-carving haircut technique—feels like an editorial atelier rather than a traditional salon.',
    author: 'Naomi Vance',
    role: 'Founder, Maison V',
    service: 'Signature Haircut'
  }
];

export const BRAND_NAME = 'Miss beauty';
export const PRIMARY_COLOR = 'stone-900';
export const ACCENT_COLOR = 'stone-500';
