/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BRAND_NAME, DEFAULT_BUSINESS_SETTINGS } from '../constants';

interface FooterProps {
  onLinkClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  onNavigateRoute?: (route: 'home' | 'services' | 'checkout' | 'login' | 'account' | 'dashboard') => void;
}

const Footer: React.FC<FooterProps> = ({ onLinkClick, onNavigateRoute }) => {
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [email, setEmail] = useState('');

  const handleSubscribe = () => {
    if (!email) return;
    setSubscribeStatus('loading');
    setTimeout(() => {
      setSubscribeStatus('success');
      setEmail('');
    }, 1000);
  };

  return (
    <footer className="bg-[#EBE7DE] pt-24 pb-12 px-6 text-[#5D5A53]">
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-4">
          <h4 className="text-2xl font-serif text-[#2C2A26] mb-6">{BRAND_NAME}</h4>
          <p className="max-w-xs font-light leading-relaxed mb-4">
            Architectural hair care, tension-free braiding, and botanical head-spa rituals.
            Born from stillness, sculpted for your crown.
          </p>
          <p className="text-xs text-[#A8A29E] uppercase tracking-widest">
            {DEFAULT_BUSINESS_SETTINGS.address} · {DEFAULT_BUSINESS_SETTINGS.city}
          </p>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-medium text-[#2C2A26] mb-6 tracking-wide text-sm uppercase">
            Services
          </h4>
          <ul className="space-y-4 font-light">
            <li>
              <a
                href="#products"
                onClick={(e) => onLinkClick(e, 'products')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                All Services
              </a>
            </li>
            <li>
              <a
                href="#products"
                onClick={(e) => onLinkClick(e, 'products')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                Braids & Protective
              </a>
            </li>
            <li>
              <a
                href="#products"
                onClick={(e) => onLinkClick(e, 'products')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                Silk Press & Cut
              </a>
            </li>
            <li>
              <a
                href="#products"
                onClick={(e) => onLinkClick(e, 'products')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                Botanical Color
              </a>
            </li>
          </ul>
        </div>

        <div className="md:col-span-2">
          <h4 className="font-medium text-[#2C2A26] mb-6 tracking-wide text-sm uppercase">
            Atelier & Portal
          </h4>
          <ul className="space-y-4 font-light">
            <li>
              <a
                href="#about"
                onClick={(e) => onLinkClick(e, 'about')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                Our Philosophy
              </a>
            </li>
            <li>
              <a
                href="#journal"
                onClick={(e) => onLinkClick(e, 'journal')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline"
              >
                The Journal
              </a>
            </li>
            <li>
              <button
                onClick={() => onNavigateRoute && onNavigateRoute('account')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline text-left"
              >
                Client Account
              </button>
            </li>
            <li>
              <button
                onClick={() => onNavigateRoute && onNavigateRoute('dashboard')}
                className="hover:text-[#2C2A26] transition-colors underline-offset-4 hover:underline text-left"
              >
                Salon Owner Portal
              </button>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="font-medium text-[#2C2A26] mb-6 tracking-wide text-sm uppercase">
            Atelier Letters
          </h4>
          <div className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="email@address.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subscribeStatus === 'loading' || subscribeStatus === 'success'}
              className="bg-transparent border-b border-[#A8A29E] py-2 text-lg outline-none focus:border-[#2C2A26] transition-colors placeholder-[#A8A29E]/70 text-[#2C2A26] disabled:opacity-50"
            />
            <button
              onClick={handleSubscribe}
              disabled={subscribeStatus !== 'idle' || !email}
              className="self-start text-sm font-medium uppercase tracking-widest mt-2 hover:text-[#2C2A26] disabled:cursor-default disabled:hover:text-[#5D5A53] disabled:opacity-50 transition-opacity"
            >
              {subscribeStatus === 'idle' && 'Subscribe'}
              {subscribeStatus === 'loading' && 'Subscribing...'}
              {subscribeStatus === 'success' && 'Subscribed'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1800px] mx-auto mt-20 pt-8 border-t border-[#D6D1C7] flex flex-col md:flex-row justify-between items-center text-xs uppercase tracking-widest opacity-60 gap-4">
        <p>© 2026 {BRAND_NAME} Atelier. All rights reserved.</p>
        <p>{DEFAULT_BUSINESS_SETTINGS.hoursSummary}</p>
      </div>
    </footer>
  );
};

export default Footer;
