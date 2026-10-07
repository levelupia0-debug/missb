/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HERO_IMAGE,
  IMG_TREATMENT,
  IMG_SILK_COLOR,
  TESTIMONIALS,
  DEFAULT_BUSINESS_SETTINGS
} from '../constants';

interface AboutProps {
  onBookClick?: () => void;
}

const About: React.FC<AboutProps> = ({ onBookClick }) => {
  return (
    <section id="about" className="bg-[#EBE7DE]">
      {/* Introduction / Salon Philosophy */}
      <div className="py-24 px-6 md:px-12 max-w-[1800px] mx-auto flex flex-col md:flex-row items-start gap-16 md:gap-32">
        <div className="md:w-1/3 reveal-on-scroll">
          <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-4">
            The Philosophy
          </span>
          <h2 className="text-4xl md:text-6xl font-serif text-[#2C2A26] leading-tight">
            Born from stillness, <br /> sculpted for your crown.
          </h2>
        </div>
        <div className="md:w-2/3 max-w-2xl">
          <p className="text-lg md:text-xl text-[#5D5A53] font-light leading-relaxed mb-8 reveal-on-scroll reveal-delay-1">
            Miss beauty was founded on a simple but radical premise: a hair salon should not feel rushed, loud, or clinical. It should feel like an architectural sanctuary—where every curl, coil, and strand is studied in natural daylight.
          </p>
          <p className="text-lg md:text-xl text-[#5D5A53] font-light leading-relaxed mb-8 reveal-on-scroll reveal-delay-2">
            In an age of harsh thermal styling and high-tension braiding, we honor follicular longevity. We work exclusively with cold-pressed botanical oils, Japanese micro-mist hydrotherapy, and zero-tension parting geometry so your natural hair flourishes beneath every style.
          </p>
          <div className="overflow-hidden mt-12 reveal-on-scroll reveal-scale">
            <img
              src={HERO_IMAGE}
              alt="Miss beauty Atelier Interior"
              referrerPolicy="no-referrer"
              className="w-full h-[420px] object-cover grayscale-[0.2] contrast-[0.95] hover:scale-105 transition-transform duration-[2s]"
            />
          </div>
          <p className="text-sm font-medium uppercase tracking-widest text-[#A8A29E] mt-4 reveal-on-scroll">
            The Miss beauty Sanctuary — 24 Rue Saint-Honoré
          </p>
        </div>
      </div>

      {/* Philosophy Blocks (Why Choose Us & Craftsmanship) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[75vh]">
        <div className="order-2 lg:order-1 relative h-[500px] lg:h-auto overflow-hidden group reveal-on-scroll reveal-scale">
          <img
            src={IMG_TREATMENT}
            alt="Botanical Apothecary and Scalp Rituals"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105"
          />
        </div>
        <div className="order-1 lg:order-2 flex flex-col justify-center p-12 lg:p-24 bg-[#D6D1C7]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#5D5A53] mb-6 reveal-on-scroll">
            01. Trichological Integrity
          </span>
          <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#2C2A26] leading-tight reveal-on-scroll reveal-delay-1">
            Botanical chemistry <br /> meets architecture.
          </h3>
          <p className="text-lg text-[#5D5A53] font-light leading-relaxed mb-10 max-w-md reveal-on-scroll reveal-delay-2">
            We reject harsh sulfates, ammonia, and tight mechanical pulling. Every braid fiber is pre-cleansed in organic apple cider and lavender hydrosol; every color formula is buffered with pure silk amino acids and French clay.
          </p>
          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-[#2C2A26]/15 max-w-md reveal-on-scroll reveal-delay-3">
            <div>
              <span className="block text-2xl font-serif text-[#2C2A26] tabular-nums">100%</span>
              <span className="text-xs uppercase tracking-widest text-[#5D5A53]">
                Ammonia-Free Color
              </span>
            </div>
            <div>
              <span className="block text-2xl font-serif text-[#2C2A26] tabular-nums">Zero</span>
              <span className="text-xs uppercase tracking-widest text-[#5D5A53]">
                Follicular Tension
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[75vh]">
        <div className="flex flex-col justify-center p-12 lg:p-24 bg-[#2C2A26] text-[#F5F2EB]">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-6 reveal-on-scroll">
            02. Private Appointment Rhythm
          </span>
          <h3 className="text-4xl md:text-5xl font-serif mb-8 text-[#F5F2EB] leading-tight reveal-on-scroll reveal-delay-1">
            Unrushed time, <br /> one guest per station.
          </h3>
          <p className="text-lg text-[#A8A29E] font-light leading-relaxed mb-12 max-w-md reveal-on-scroll reveal-delay-2">
            We never double-book our master stylists. When you reserve an appointment, your chair, basin, and stylist are dedicated solely to you from your opening tea ritual to the final mirror reveal.
          </p>
          {onBookClick && (
            <div className="reveal-on-scroll reveal-delay-3">
              <button
                onClick={onBookClick}
                className="px-8 py-4 bg-[#F5F2EB] text-[#2C2A26] text-xs font-semibold uppercase tracking-widest hover:bg-white transition-colors"
              >
                Reserve Your Sanctuary Time
              </button>
            </div>
          )}
        </div>
        <div className="relative h-[500px] lg:h-auto overflow-hidden group reveal-on-scroll reveal-scale">
          <img
            src={IMG_SILK_COLOR}
            alt="Luminous Silk Press and Dimensional Color"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-105 brightness-95"
          />
        </div>
      </div>

      {/* Client Voices / Testimonials */}
      <div className="py-28 px-6 md:px-12 max-w-[1800px] mx-auto border-b border-[#D6D1C7]">
        <div className="mb-16 reveal-on-scroll">
          <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-4">
            Client Reflections
          </span>
          <h3 className="text-3xl md:text-5xl font-serif text-[#2C2A26]">
            Words from the Sanctuary
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {TESTIMONIALS.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between p-8 bg-[#F5F2EB] border border-[#D6D1C7]/70 reveal-on-scroll"
            >
              <p className="font-serif italic text-lg text-[#2C2A26] leading-relaxed mb-8">
                “{item.quote}”
              </p>
              <div className="pt-4 border-t border-[#D6D1C7]/60">
                <p className="text-sm font-medium text-[#2C2A26]">{item.author}</p>
                <p className="text-xs text-[#5D5A53] mt-0.5">
                  {item.role} · {item.service}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Location & Contact Section */}
      <div id="contact" className="py-24 px-6 md:px-12 max-w-[1800px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5 reveal-on-scroll">
            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-4">
              Visit the Atelier
            </span>
            <h3 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mb-6">
              Location & Hours
            </h3>
            <p className="text-[#5D5A53] font-light leading-relaxed mb-8">
              Located in a sunlit courtyard off Rue Saint-Honoré, our salon welcomes guests by appointment Tuesday through Saturday.
            </p>
            <div className="space-y-4 text-sm text-[#2C2A26]">
              <div>
                <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                  Address
                </span>
                <span className="font-light">
                  {DEFAULT_BUSINESS_SETTINGS.address}, {DEFAULT_BUSINESS_SETTINGS.city}
                </span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                  Hours
                </span>
                <span className="font-light">{DEFAULT_BUSINESS_SETTINGS.hoursSummary}</span>
              </div>
              <div>
                <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                  Direct Concierge
                </span>
                <span className="font-light">
                  {DEFAULT_BUSINESS_SETTINGS.phone} · {DEFAULT_BUSINESS_SETTINGS.email}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-[#2C2A26] text-[#F5F2EB] p-10 md:p-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 reveal-on-scroll reveal-delay-1">
            <div className="max-w-md">
              <span className="block text-xs uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
                Ready When You Are
              </span>
              <h4 className="text-3xl font-serif mb-3">Begin your hair ritual.</h4>
              <p className="text-sm text-[#A8A29E] font-light leading-relaxed">
                Select your service, choose your preferred date and time, and receive instant confirmation via our LevelUp concierge.
              </p>
            </div>
            {onBookClick && (
              <button
                onClick={onBookClick}
                className="px-8 py-4 bg-[#F5F2EB] text-[#2C2A26] text-xs font-semibold uppercase tracking-widest hover:bg-white transition-colors whitespace-nowrap"
              >
                Book Appointment
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
