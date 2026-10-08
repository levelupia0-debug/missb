/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BRAND_NAME } from '../constants';
import { UserProfile } from '../types';

type NavRoute =
  | 'home'
  | 'services'
  | 'about'
  | 'journal'
  | 'contact'
  | 'checkout'
  | 'login'
  | 'account'
  | 'dashboard';

interface NavbarProps {
  onNavClick: (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => void;
  cartCount: number;
  onOpenCart: () => void;
  currentUser?: UserProfile | null;
  onNavigateRoute?: (route: NavRoute) => void;
  activeRoute?: string;
  forceDarkText?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  onOpenCart,
  currentUser,
  activeRoute = 'home',
  forceDarkText = false
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    onOpenCart();
  };

  const textColorClass =
    scrolled || mobileMenuOpen || forceDarkText ? 'text-[#2C2A26]' : 'text-[#F5F2EB]';

  const navItems: { label: string; route: NavRoute; href: string }[] = [
    { label: 'Services', route: 'services', href: '/services' },
    { label: 'Book', route: 'checkout', href: '/book' },
    { label: 'Atelier', route: 'about', href: '/about' },
    { label: 'Journal', route: 'journal', href: '/journal' },
    { label: 'Contact', route: 'contact', href: '/contact' }
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-700 ease-in-out print:hidden ${
          scrolled || mobileMenuOpen || forceDarkText
            ? 'bg-[#F5F2EB]/95 backdrop-blur-md py-4 shadow-sm border-b border-[#D6D1C7]/40'
            : 'bg-transparent py-8'
        }`}
      >
        <div className="max-w-[1800px] mx-auto px-8 flex items-center justify-between">
          {/* Zone 1: Brand Title */}
          <a
            href="/"
            className={`text-3xl font-serif font-medium tracking-tight z-50 relative transition-colors duration-500 whitespace-nowrap ${textColorClass}`}
          >
            {BRAND_NAME}
          </a>

          {/* Zone 2: Center Links - Desktop (Real browser page loads) */}
          <div
            className={`hidden md:flex items-center gap-10 text-sm font-medium tracking-widest uppercase transition-colors duration-500 ${textColorClass}`}
          >
            {navItems.map((item) => {
              const isActive = activeRoute === item.route;
              return (
                <a
                  key={item.route}
                  href={item.href}
                  className={`transition-opacity whitespace-nowrap pb-1 ${
                    isActive
                      ? 'border-b border-[#2C2A26] opacity-100'
                      : 'hover:opacity-60 opacity-85'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </div>

          {/* Zone 3: Right Actions */}
          <div
            className={`flex items-center gap-6 z-50 relative transition-colors duration-500 ${textColorClass}`}
          >
            {currentUser ? (
              <a
                href={currentUser.role === 'owner' ? '/dashboard' : '/account'}
                className="text-xs font-medium uppercase tracking-widest hover:opacity-60 transition-opacity hidden sm:inline-block whitespace-nowrap"
              >
                {currentUser.role === 'owner' ? 'Salon Dashboard' : 'My Account'}
              </a>
            ) : (
              <a
                href="/login"
                className="text-xs font-medium uppercase tracking-widest hover:opacity-60 transition-opacity hidden sm:inline-block whitespace-nowrap"
              >
                Sign In
              </a>
            )}

            <button
              onClick={handleCartClick}
              className="text-xs font-medium uppercase tracking-widest hover:opacity-60 transition-opacity hidden sm:block whitespace-nowrap"
            >
              Selection ({cartCount})
            </button>

            {/* Mobile Menu Toggle */}
            <button
              aria-label="Toggle Menu"
              className={`block md:hidden focus:outline-none transition-colors duration-500 ${textColorClass}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-[#F5F2EB] z-40 flex flex-col justify-center items-center transition-all duration-500 ease-in-out print:hidden ${
          mobileMenuOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-10 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center space-y-8 text-xl font-serif font-medium text-[#2C2A26]">
          {navItems.map((item) => (
            <a
              key={item.route}
              href={item.href}
              className="hover:opacity-60 transition-opacity"
            >
              {item.label}
            </a>
          ))}

          <a
            href={
              currentUser
                ? currentUser.role === 'owner'
                  ? '/dashboard'
                  : '/account'
                : '/login'
            }
            className="hover:opacity-60 transition-opacity text-sm uppercase tracking-widest font-sans pt-4 border-t border-[#D6D1C7] w-48 text-center"
          >
            {currentUser
              ? currentUser.role === 'owner'
                ? 'Salon Dashboard'
                : 'My Account'
              : 'Sign In / Register'}
          </a>
          <button
            onClick={handleCartClick}
            className="hover:opacity-60 transition-opacity text-sm uppercase tracking-widest font-sans"
          >
            Selection ({cartCount})
          </button>
        </div>
      </div>
    </>
  );
};

export default Navbar;
