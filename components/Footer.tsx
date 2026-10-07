/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BRAND_NAME, DEFAULT_BUSINESS_SETTINGS } from '../constants';

interface FooterProps {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  onNavigateRoute?: (
    route:
      | 'home'
      | 'services'
      | 'about'
      | 'journal'
      | 'contact'
      | 'checkout'
      | 'login'
      | 'account'
      | 'dashboard'
  ) => void;
}

const Footer: React.FC<FooterProps> = ({ onLinkClick, onNavigateRoute }) => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [email, setEmail] = useState('');

  const toggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? null : id));
  };

  const handleSubscribe = () => {
    if (!email) return;
    setSubscribeStatus('loading');
    setTimeout(() => {
      setSubscribeStatus('success');
      setEmail('');
    }, 900);
  };

  const goRoute = (
    e: React.MouseEvent,
    route:
      | 'home'
      | 'services'
      | 'about'
      | 'journal'
      | 'contact'
      | 'checkout'
      | 'login'
      | 'account'
      | 'dashboard'
  ) => {
    e.preventDefault();
    if (onNavigateRoute) {
      onNavigateRoute(route);
    } else {
      onLinkClick(e as any, route === 'services' ? 'products' : route);
    }
  };

  return (
    <footer className="bg-[#EBE7DE] pt-16 pb-12 px-6 md:px-12 text-[#5D5A53] border-t border-[#D6D1C7] print:hidden">
      <div className="max-w-[1400px] mx-auto">
        {/* Top Brand Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-10 border-b border-[#D6D1C7] gap-6">
          <div>
            <h4 className="text-2xl md:text-3xl font-serif text-[#2C2A26] tracking-tight">
              {BRAND_NAME}
            </h4>
            <p className="text-xs uppercase tracking-[0.22em] text-[#A8A29E] mt-1">
              {DEFAULT_BUSINESS_SETTINGS.address} · {DEFAULT_BUSINESS_SETTINGS.city}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => goRoute(e, 'checkout')}
            className="self-start md:self-auto px-8 py-3.5 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#433E38] transition-colors"
          >
            Book an Appointment
          </button>
        </div>

        {/* Enterprise-Style Expandable Accordion Sections */}
        <div className="divide-y divide-[#D6D1C7]">
          {/* Section 1: Services */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('services')}
              aria-expanded={openSection === 'services'}
              className="w-full py-5 flex items-center justify-between text-left group"
            >
              <span className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-[#2C2A26] group-hover:opacity-75 transition-opacity">
                Services & Hair Rituals
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 text-[#2C2A26] transition-transform duration-300 ${
                  openSection === 'services' ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                openSection === 'services' ? 'max-h-72 pb-6 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-light pt-2">
                <li>
                  <a
                    href="/services"
                    onClick={(e) => goRoute(e, 'services')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    All Salon Services
                  </a>
                </li>
                <li>
                  <a
                    href="/services"
                    onClick={(e) => goRoute(e, 'services')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Knotless & Stitch Braids
                  </a>
                </li>
                <li>
                  <a
                    href="/services"
                    onClick={(e) => goRoute(e, 'services')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Silk Press & Sculptural Cut
                  </a>
                </li>
                <li>
                  <a
                    href="/services"
                    onClick={(e) => goRoute(e, 'services')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Botanical Color & Head Spa
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 2: Maison & Editorial Pages */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('atelier')}
              aria-expanded={openSection === 'atelier'}
              className="w-full py-5 flex items-center justify-between text-left group"
            >
              <span className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-[#2C2A26] group-hover:opacity-75 transition-opacity">
                The Atelier & Editorial Dossiers
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 text-[#2C2A26] transition-transform duration-300 ${
                  openSection === 'atelier' ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                openSection === 'atelier' ? 'max-h-72 pb-6 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-light pt-2">
                <li>
                  <a
                    href="/about"
                    onClick={(e) => goRoute(e, 'about')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Our Philosophy & Craft
                  </a>
                </li>
                <li>
                  <a
                    href="/journal"
                    onClick={(e) => goRoute(e, 'journal')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    The Editorial Journal
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    onClick={(e) => goRoute(e, 'contact')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Location & Concierge
                  </a>
                </li>
                <li>
                  <a
                    href="/book"
                    onClick={(e) => goRoute(e, 'checkout')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
                  >
                    Reserve Online
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 3: Client Account & Management Suite */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('portal')}
              aria-expanded={openSection === 'portal'}
              className="w-full py-5 flex items-center justify-between text-left group"
            >
              <span className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-[#2C2A26] group-hover:opacity-75 transition-opacity">
                Client Portal & Management
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 text-[#2C2A26] transition-transform duration-300 ${
                  openSection === 'portal' ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                openSection === 'portal' ? 'max-h-72 pb-6 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm font-light pt-2">
                <li>
                  <button
                    type="button"
                    onClick={(e) => goRoute(e, 'account')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline text-left"
                  >
                    My Client Account
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => goRoute(e, 'login')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline text-left"
                  >
                    Sign In / Register
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={(e) => goRoute(e, 'dashboard')}
                    className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline text-left"
                  >
                    Salon Owner Portal
                  </button>
                </li>
              </ul>
            </div>
          </div>

          {/* Section 4: Hours, Policies & Newsletter */}
          <div>
            <button
              type="button"
              onClick={() => toggleSection('info')}
              aria-expanded={openSection === 'info'}
              className="w-full py-5 flex items-center justify-between text-left group"
            >
              <span className="text-xs md:text-sm font-medium uppercase tracking-[0.2em] text-[#2C2A26] group-hover:opacity-75 transition-opacity">
                Sanctuary Hours, Policy & Private Letters
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 text-[#2C2A26] transition-transform duration-300 ${
                  openSection === 'info' ? 'rotate-180' : 'rotate-0'
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out ${
                openSection === 'info' ? 'max-h-96 pb-8 opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2 text-sm font-light">
                <div className="space-y-2">
                  <p className="text-[#2C2A26] font-medium">
                    {DEFAULT_BUSINESS_SETTINGS.hoursSummary}
                  </p>
                  <p>{DEFAULT_BUSINESS_SETTINGS.cancellationPolicy}</p>
                  <p className="text-xs text-[#A8A29E] pt-1">
                    Direct Concierge: {DEFAULT_BUSINESS_SETTINGS.phone} ·{' '}
                    {DEFAULT_BUSINESS_SETTINGS.email}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                  <div className="w-full sm:flex-1">
                    <label className="block text-[11px] uppercase tracking-widest text-[#A8A29E] mb-2">
                      Atelier Letters
                    </label>
                    <input
                      type="email"
                      placeholder="email@address.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
                      className="w-full bg-transparent border-b border-[#A8A29E] py-2 text-sm outline-none focus:border-[#2C2A26] transition-colors placeholder-[#A8A29E]/70 text-[#2C2A26]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={subscribeStatus !== 'idle' || !email}
                    className="px-6 py-2.5 border border-[#2C2A26] text-[#2C2A26] text-xs uppercase tracking-widest hover:bg-[#2C2A26] hover:text-[#F5F2EB] transition-colors disabled:opacity-50"
                  >
                    {subscribeStatus === 'idle' && 'Subscribe'}
                    {subscribeStatus === 'loading' && '...'}
                    {subscribeStatus === 'success' && 'Subscribed'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Discreet "Powered by LevelUp Ecosystem" SVG Button */}
        <div className="mt-10 pt-8 border-t border-[#D6D1C7] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#5D5A53]">
          <p className="uppercase tracking-widest text-[11px] opacity-75">
            © 2026 {BRAND_NAME} Atelier. All rights reserved.
          </p>

          <a
            href="https://levelup-ecosystem.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Powered by LevelUp Ecosystem"
            className="group inline-flex items-center gap-2.5 py-1.5 px-3 rounded-full hover:bg-[#D6D1C7]/40 transition-all duration-300 text-[#2C2A26]"
          >
            <span className="text-[10px] uppercase tracking-[0.22em] text-[#5D5A53] group-hover:text-[#2C2A26] transition-colors">
              Powered by
            </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1000 220"
              fill="none"
              className="h-5 w-auto text-[#2C2A26] opacity-85 group-hover:opacity-100 transition-opacity"
            >
              <defs>
                <linearGradient
                  id="paint_levelup"
                  x1="500"
                  y1="10"
                  x2="500"
                  y2="90"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="currentColor" stopOpacity="0.95" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0.80" />
                </linearGradient>

                <linearGradient
                  id="paint_ecosystem"
                  x1="500"
                  y1="95"
                  x2="500"
                  y2="205"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="currentColor" stopOpacity="0.75" />
                  <stop offset="1" stopColor="currentColor" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              <text
                x="50%"
                y="85"
                textAnchor="middle"
                fill="url(#paint_levelup)"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'DM Sans', sans-serif"
                fontSize="100px"
                fontWeight="900"
                letterSpacing="-0.01em"
              >
                LevelUp
              </text>

              <text
                x="50%"
                y="198"
                textAnchor="middle"
                fill="url(#paint_ecosystem)"
                fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, 'DM Sans', sans-serif"
                fontSize="135px"
                fontWeight="900"
                letterSpacing="0.01em"
              >
                Ecosystem
              </text>
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
