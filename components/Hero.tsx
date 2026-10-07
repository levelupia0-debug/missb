/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HERO_IMAGE } from '../constants';

const PORTRAIT_LOCAL_URL = '/portrait-hero.png';
const PORTRAIT_REMOTE_URL =
  'https://i.ibb.co/7dMbWtHr/Portrait-beaut-aux-tresses-magenta.png';

interface HeroProps {
  onBookAppointment?: () => void;
}

const Hero: React.FC<HeroProps> = ({ onBookAppointment }) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      try {
        window.history.pushState(null, '', `#${targetId}`);
      } catch {
        // Ignore SecurityError in restricted environments
      }
    }
  };

  return (
    <section className="relative w-full min-h-screen overflow-hidden bg-[#F5F2EB] flex flex-col items-center justify-center pt-16 md:pt-20 pb-16">
      {/* Subtle warm ambient halo behind the portrait */}
      <div
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[380px] sm:w-[520px] md:w-[680px] h-[380px] sm:h-[520px] md:h-[680px] rounded-full bg-[#EBE7DE]/80 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Full Uncropped 3D Portrait (object-contain directly on img so her entire face, braids & hand are 100% visible on PC & mobile with zero visible edges) */}
      <div className="relative z-10 w-full flex justify-center items-start px-4 select-none pointer-events-none">
        <img
          src={PORTRAIT_LOCAL_URL}
          alt="Portrait-beaut-aux-tresses-magenta"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src.endsWith(PORTRAIT_LOCAL_URL)) {
              target.src = PORTRAIT_REMOTE_URL;
            } else if (target.src !== HERO_IMAGE) {
              target.src = HERO_IMAGE;
            }
          }}
          style={{
            WebkitMaskImage:
              'radial-gradient(ellipse 90% 94% at 50% 42%, #000 72%, rgba(0,0,0,0.65) 86%, transparent 99%)',
            maskImage:
              'radial-gradient(ellipse 90% 94% at 50% 42%, #000 72%, rgba(0,0,0,0.65) 86%, transparent 99%)'
          }}
          className="block w-auto h-[52vh] sm:h-[58vh] md:h-[64vh] lg:h-[68vh] min-h-[340px] max-h-[660px] max-w-[92vw] object-contain object-top mx-auto animate-pro-reveal"
        />
      </div>

      {/* Main Editorial Text Positioned Below Her Hand (-mt-10 to -mt-16) so Her Face is 100% Unobstructed on PC & Mobile */}
      <div className="relative z-20 w-full px-6 md:px-12 -mt-10 sm:-mt-14 md:-mt-16">
        <div className="max-w-[1100px] mx-auto flex flex-col items-center text-center">
          <span className="block text-xs uppercase tracking-[0.28em] text-[#5D5A53] font-medium mb-3 md:mb-4 animate-pro-reveal animate-delay-100">
            Paris · New York · Kyoto — L’Atelier Capillaire
          </span>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-serif font-normal text-[#2C2A26] tracking-tight leading-[1.03] mb-5 md:mb-6 animate-pro-reveal animate-delay-200">
            Your hair. <span className="italic text-[#5D5A53]">Your signature.</span>
          </h1>

          <p className="max-w-xl text-sm sm:text-base md:text-lg text-[#5D5A53] font-light leading-relaxed mb-8 md:mb-10 animate-pro-reveal animate-delay-300">
            Architectural cutting, tension-free braiding, and botanical head-spa rituals. Crafted in silence, tailored to the natural rhythm of your crown.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-pro-reveal animate-delay-400">
            <button
              onClick={() => {
                if (onBookAppointment) {
                  onBookAppointment();
                }
              }}
              className="px-10 py-4 bg-[#2C2A26] text-[#F5F2EB] rounded-full text-xs md:text-sm font-semibold uppercase tracking-widest hover:bg-[#433E38] transition-all duration-500 shadow-lg hover:shadow-xl whitespace-nowrap"
            >
              Book an appointment
            </button>

            <a
              href="#products"
              onClick={(e) => handleNavClick(e, 'products')}
              className="px-10 py-4 bg-[#F5F2EB]/90 border border-[#2C2A26]/30 text-[#2C2A26] rounded-full text-xs md:text-sm font-medium uppercase tracking-widest hover:bg-[#EBE7DE] transition-all duration-500 whitespace-nowrap"
            >
              Explore services
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
