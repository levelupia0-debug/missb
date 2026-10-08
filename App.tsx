/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
import ProductCard from './components/ProductCard';
import About from './components/About';
import Journal from './components/Journal';
import Footer from './components/Footer';
import ProductDetail from './components/ProductDetail';
import JournalDetail from './components/JournalDetail';
import CartDrawer from './components/CartDrawer';
import Checkout from './components/Checkout';
import AuthView from './components/AuthView';
import AccountView from './components/AccountView';
import DashboardView from './components/DashboardView';
import {
  PRODUCTS,
  JOURNAL_ARTICLES,
  HERO_IMAGE,
  IMG_BRAIDS_STITCH,
  DEFAULT_BUSINESS_SETTINGS
} from './constants';
import { Product, ViewState, UserProfile } from './types';
import {
  fetchServicesCatalog,
  setAuthToken,
  getStoredUser,
  setStoredUser
} from './services/salonApi';

function resolveInitialView(
  pathname: string,
  search: string,
  servicesList: Product[]
): ViewState {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(search || '');

  if (clean === '/') {
    return { type: 'home' };
  }
  if (clean === '/services') {
    return { type: 'services' };
  }
  if (clean.startsWith('/services/')) {
    const slug = clean.replace('/services/', '');
    const found =
      servicesList.find((s) => s.slug === slug || s.id === slug) ||
      PRODUCTS.find((s) => s.slug === slug || s.id === slug);
    if (found) {
      return { type: 'product', product: found };
    }
    return { type: 'services' };
  }
  if (clean === '/about') {
    return { type: 'about' };
  }
  if (clean === '/journal') {
    return { type: 'journal_list' };
  }
  if (clean.startsWith('/journal/')) {
    const slug = clean.replace('/journal/', '');
    const foundArt =
      JOURNAL_ARTICLES.find((a) => a.slug === slug || String(a.id) === slug) ||
      JOURNAL_ARTICLES[0];
    return { type: 'journal', article: foundArt };
  }
  if (clean === '/contact') {
    return { type: 'contact' };
  }
  if (clean === '/book') {
    const srvSlug = params.get('service');
    const initialService = srvSlug
      ? servicesList.find((s) => s.slug === srvSlug || s.id === srvSlug) ||
        PRODUCTS.find((s) => s.slug === srvSlug || s.id === srvSlug)
      : undefined;
    return { type: 'checkout', initialService };
  }
  if (clean === '/login') {
    return { type: 'login' };
  }
  if (clean === '/register') {
    return { type: 'register' };
  }
  if (
    clean === '/account' ||
    clean === '/account/bookings' ||
    clean === '/account/profile'
  ) {
    const tab =
      clean === '/account/bookings'
        ? 'bookings'
        : clean === '/account/profile'
        ? 'profile'
        : 'overview';
    return { type: 'account', tab };
  }
  if (clean.startsWith('/dashboard')) {
    const sub = clean.replace('/dashboard/', '').replace('/dashboard', '');
    const section = (
      [
        'overview',
        'bookings',
        'customers',
        'services',
        'availability',
        'emails',
        'settings'
      ].includes(sub)
        ? sub
        : 'overview'
    ) as any;
    return { type: 'dashboard', section };
  }
  return { type: 'home' };
}

function App() {
  const [services, setServices] = useState<Product[]>(PRODUCTS);
  const [view, setView] = useState<ViewState>(() =>
    resolveInitialView(
      typeof window !== 'undefined' ? window.location.pathname : '/',
      typeof window !== 'undefined' ? window.location.search : '',
      PRODUCTS
    )
  );
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() =>
    getStoredUser()
  );

  // Navigate with real browser page load
  const navigateBrowser = (url: string) => {
    window.location.href = url;
  };

  const resolveRouteFromPath = useCallback(
    (pathname: string, search: string) => {
      setView(resolveInitialView(pathname, search, services));
    },
    [services]
  );

  useEffect(() => {
    fetchServicesCatalog()
      .then((data) => {
        if (data.services && data.services.length > 0) {
          setServices(data.services);
        }
      })
      .catch(() => {
        // Fallback to local constants if offline
      });
  }, []);

  useEffect(() => {
    resolveRouteFromPath(window.location.pathname, window.location.search);
    const onPopState = () =>
      resolveRouteFromPath(window.location.pathname, window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [resolveRouteFromPath]);

  // Smooth IntersectionObserver for pro scroll-reveal animations on text and images
  useEffect(() => {
    const elements = document.querySelectorAll('.reveal-on-scroll');
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [view, services]);

  const handleNavigateRoute = (
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
    if (route === 'home') navigateBrowser('/');
    else if (route === 'services') navigateBrowser('/services');
    else if (route === 'about') navigateBrowser('/about');
    else if (route === 'journal') navigateBrowser('/journal');
    else if (route === 'contact') navigateBrowser('/contact');
    else if (route === 'checkout') navigateBrowser('/book');
    else if (route === 'login') navigateBrowser('/login');
    else if (route === 'account') {
      navigateBrowser(currentUser ? '/account' : '/login');
    } else if (route === 'dashboard') {
      navigateBrowser(
        currentUser && currentUser.role === 'owner' ? '/dashboard' : '/login'
      );
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    if (targetId === 'products' || targetId === 'services') {
      navigateBrowser('/services');
    } else if (targetId === 'about') {
      navigateBrowser('/about');
    } else if (targetId === 'journal') {
      navigateBrowser('/journal');
    } else if (targetId === 'contact') {
      navigateBrowser('/contact');
    } else {
      navigateBrowser('/');
    }
  };

  const addToCart = (product: Product) => {
    setCartItems([...cartItems, product]);
    setIsCartOpen(true);
  };

  const removeFromCart = (index: number) => {
    const newItems = [...cartItems];
    newItems.splice(index, 1);
    setCartItems(newItems);
  };

  const handleBookService = (service?: Product) => {
    if (service) {
      navigateBrowser(`/book?service=${encodeURIComponent(service.slug)}`);
    } else {
      navigateBrowser('/book');
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setStoredUser(null);
    setCurrentUser(null);
    navigateBrowser('/');
  };

  const isTopBarDarkText = view.type !== 'journal';

  return (
    <div className="min-h-screen bg-[#F5F2EB] font-sans text-[#2C2A26] selection:bg-[#D6D1C7] selection:text-[#2C2A26]">
      {view.type !== 'dashboard' && (
        <Navbar
          onNavClick={handleNavClick}
          cartCount={cartItems.length}
          onOpenCart={() => setIsCartOpen(true)}
          currentUser={currentUser}
          onNavigateRoute={handleNavigateRoute}
          activeRoute={view.type === 'journal_list' ? 'journal' : view.type}
          forceDarkText={isTopBarDarkText}
        />
      )}

      <main>
        {/* ===================================================================
            HOME PAGE (/): Essential Curated Experience + Gateways to Subpages
            =================================================================== */}
        {view.type === 'home' && (
          <>
            <Hero onBookAppointment={() => handleBookService()} />

            {/* Essential Signature Rituals Preview (3 Curated Services) */}
            <section
              id="products"
              className="py-28 px-6 md:px-12 bg-[#F5F2EB] border-t border-[#D6D1C7]/60"
            >
              <div className="max-w-[1800px] mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6 reveal-on-scroll">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
                      Curated Selection
                    </span>
                    <h2 className="text-4xl md:text-6xl font-serif text-[#2C2A26]">
                      Signature Hair Rituals
                    </h2>
                  </div>
                  <a
                    href="/services"
                    className="self-start md:self-auto px-8 py-4 border border-[#2C2A26] text-[#2C2A26] text-xs font-medium uppercase tracking-widest hover:bg-[#2C2A26] hover:text-[#F5F2EB] transition-colors inline-block"
                  >
                    Explore All {services.length} Services →
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-16">
                  {services.slice(0, 3).map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={(p) => navigateBrowser(`/services/${p.slug}`)}
                      onBookService={(p) => handleBookService(p)}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Dedicated Dossier Gateways (Atelier Philosophy & Editorial Journal) */}
            <section className="py-24 px-6 md:px-12 bg-[#EBE7DE]">
              <div className="max-w-[1800px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Gateway 1: The Atelier (/about) */}
                <div className="bg-[#F5F2EB] border border-[#D6D1C7] overflow-hidden flex flex-col justify-between group reveal-on-scroll">
                  <div className="h-80 overflow-hidden bg-[#D6D1C7]">
                    <img
                      src={HERO_IMAGE}
                      alt="The Miss beauty Sanctuary"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                  </div>
                  <div className="p-8 md:p-12">
                    <span className="block text-xs uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
                      Dossier 01 · The Sanctuary
                    </span>
                    <h3 className="text-3xl md:text-4xl font-serif text-[#2C2A26] mb-4">
                      Born from stillness, sculpted for your crown.
                    </h3>
                    <p className="text-[#5D5A53] font-light leading-relaxed mb-8">
                      Discover our Kyoto head-spa hydrotherapy, zero-tension braiding geometry, and ammonia-free botanical formulations.
                    </p>
                    <a
                      href="/about"
                      className="text-xs font-semibold uppercase tracking-widest text-[#2C2A26] border-b border-[#2C2A26] pb-1 hover:opacity-60 transition-opacity inline-block"
                    >
                      Enter The Atelier Page →
                    </a>
                  </div>
                </div>

                {/* Gateway 2: The Editorial Journal (/journal) */}
                <div className="bg-[#F5F2EB] border border-[#D6D1C7] overflow-hidden flex flex-col justify-between group reveal-on-scroll reveal-delay-1">
                  <div className="h-80 overflow-hidden bg-[#D6D1C7]">
                    <img
                      src={IMG_BRAIDS_STITCH}
                      alt="The Editorial Journal"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                    />
                  </div>
                  <div className="p-8 md:p-12">
                    <span className="block text-xs uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
                      Dossier 02 · Editorial Notes
                    </span>
                    <h3 className="text-3xl md:text-4xl font-serif text-[#2C2A26] mb-4">
                      The Architecture of Texture & Rituals.
                    </h3>
                    <p className="text-[#5D5A53] font-light leading-relaxed mb-8">
                      Read our trichological essays on knotless braid longevity, silk press hydration, and seasonal botanical glazes.
                    </p>
                    <a
                      href="/journal"
                      className="text-xs font-semibold uppercase tracking-widest text-[#2C2A26] border-b border-[#2C2A26] pb-1 hover:opacity-60 transition-opacity inline-block"
                    >
                      Read The Journal Page →
                    </a>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===================================================================
            DEDICATED SERVICES PAGE (/services)
            =================================================================== */}
        {view.type === 'services' && (
          <div className="pt-12 animate-fade-in-up">
            <ProductGrid
              services={services}
              onProductClick={(p) => navigateBrowser(`/services/${p.slug}`)}
              onBookService={(p) => handleBookService(p)}
            />
          </div>
        )}

        {/* ===================================================================
            DEDICATED ATELIER & PHILOSOPHY PAGE (/about)
            =================================================================== */}
        {view.type === 'about' && (
          <div className="pt-16 animate-fade-in-up">
            <About onBookClick={() => handleBookService()} />
          </div>
        )}

        {/* ===================================================================
            DEDICATED JOURNAL LIST PAGE (/journal)
            =================================================================== */}
        {view.type === 'journal_list' && (
          <div className="pt-16 animate-fade-in-up">
            <Journal
              onArticleClick={(a) =>
                navigateBrowser(`/journal/${a.slug || a.id}`)
              }
            />
          </div>
        )}

        {/* ===================================================================
            DEDICATED CONTACT & SANCTUARY LOCATION PAGE (/contact)
            =================================================================== */}
        {view.type === 'contact' && (
          <section className="pt-32 pb-28 px-6 md:px-12 max-w-[1400px] mx-auto animate-fade-in-up">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
              <div className="lg:col-span-6 space-y-8">
                <div>
                  <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-4">
                    Visit The Sanctuary
                  </span>
                  <h1 className="text-4xl md:text-6xl font-serif text-[#2C2A26] leading-tight">
                    Location, Hours & Private Concierge
                  </h1>
                </div>
                <p className="text-lg text-[#5D5A53] font-light leading-relaxed">
                  Nestled in a quiet sunlit courtyard off Rue Saint-Honoré, Miss beauty welcomes guests strictly by appointment to preserve the calm of every station.
                </p>

                <div className="space-y-6 pt-6 border-t border-[#D6D1C7] text-sm">
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                      Sanctuary Address
                    </span>
                    <p className="text-base text-[#2C2A26]">
                      {DEFAULT_BUSINESS_SETTINGS.address}, {DEFAULT_BUSINESS_SETTINGS.city}
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                      Opening Hours
                    </span>
                    <p className="text-base text-[#2C2A26]">
                      {DEFAULT_BUSINESS_SETTINGS.hoursSummary}
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                      Direct Concierge
                    </span>
                    <p className="text-base text-[#2C2A26]">
                      {DEFAULT_BUSINESS_SETTINGS.phone} · {DEFAULT_BUSINESS_SETTINGS.email}
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                      Cancellation Policy
                    </span>
                    <p className="text-sm text-[#5D5A53] font-light">
                      {DEFAULT_BUSINESS_SETTINGS.cancellationPolicy}
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-6 bg-[#2C2A26] text-[#F5F2EB] p-10 md:p-16 space-y-8">
                <span className="block text-xs uppercase tracking-[0.25em] text-[#A8A29E]">
                  Instant Online Reservation
                </span>
                <h2 className="text-3xl md:text-5xl font-serif leading-tight">
                  Reserve your chair in the sanctuary.
                </h2>
                <p className="text-[#D6D1C7] font-light leading-relaxed">
                  Choose your ritual, select an available time slot, and receive your official reservation ticket automatically by email.
                </p>
                <div className="pt-4 flex flex-col sm:flex-row gap-4">
                  <a
                    href="/book"
                    className="px-8 py-4 bg-[#F5F2EB] text-[#2C2A26] text-xs font-semibold uppercase tracking-widest hover:bg-white transition-colors text-center"
                  >
                    Book an Appointment
                  </a>
                  <a
                    href="/services"
                    className="px-8 py-4 border border-[#F5F2EB]/40 text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#F5F2EB]/10 transition-colors text-center"
                  >
                    Browse Services
                  </a>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ===================================================================
            DEDICATED SERVICE DETAIL PAGE (/services/[slug])
            =================================================================== */}
        {view.type === 'product' && (
          <ProductDetail
            product={view.product}
            onBack={() => navigateBrowser('/services')}
            onAddToCart={addToCart}
            onBookNow={(p) => handleBookService(p)}
          />
        )}

        {/* ===================================================================
            DEDICATED JOURNAL ARTICLE PAGE (/journal/[slug])
            =================================================================== */}
        {view.type === 'journal' && (
          <JournalDetail
            article={view.article || JOURNAL_ARTICLES[0]}
            onBack={() => navigateBrowser('/journal')}
          />
        )}

        {/* ===================================================================
            DEDICATED BOOKING PAGE (/book)
            =================================================================== */}
        {view.type === 'checkout' && (
          <Checkout
            items={cartItems}
            services={services}
            initialService={view.initialService}
            rescheduleBooking={view.rescheduleBooking}
            currentUser={currentUser}
            onBack={() => navigateBrowser('/')}
            onBookingConfirmed={(_booking, createdOrLoggedUser) => {
              if (createdOrLoggedUser) {
                setStoredUser(createdOrLoggedUser);
                setCurrentUser(createdOrLoggedUser);
              }
            }}
            onViewAppointment={() => {
              navigateBrowser(currentUser ? '/account/bookings' : '/login');
            }}
          />
        )}

        {(view.type === 'login' || view.type === 'register') && (
          <AuthView
            initialMode={view.type}
            onBack={() => navigateBrowser('/')}
            onSuccess={(user) => {
              setStoredUser(user);
              setCurrentUser(user);
              if (user.role === 'owner' || view.redirectTo === 'dashboard') {
                navigateBrowser('/dashboard');
              } else if (view.redirectTo === 'checkout') {
                navigateBrowser('/book');
              } else {
                navigateBrowser('/account');
              }
            }}
          />
        )}

        {view.type === 'account' &&
          (currentUser ? (
            <AccountView
              user={currentUser}
              services={services}
              initialTab={view.tab}
              highlightBookingId={view.highlightBookingId}
              onUserUpdated={(u) => {
                setStoredUser(u);
                setCurrentUser(u);
              }}
              onLogout={handleLogout}
              onBookAgain={(srv) => handleBookService(srv)}
              onRescheduleBooking={(bk) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setView({ type: 'checkout', rescheduleBooking: bk });
              }}
              onNavigateDashboard={() => navigateBrowser('/dashboard')}
            />
          ) : (
            <AuthView
              initialMode="login"
              onBack={() => navigateBrowser('/')}
              onSuccess={(user) => {
                setStoredUser(user);
                setCurrentUser(user);
                navigateBrowser('/account');
              }}
            />
          ))}

        {view.type === 'dashboard' &&
          (currentUser && currentUser.role === 'owner' ? (
            <DashboardView
              user={currentUser}
              initialSection={view.section}
              onBackToSite={() => navigateBrowser('/')}
              onLogout={handleLogout}
              onServicesChanged={(updated) => setServices(updated)}
            />
          ) : (
            <AuthView
              initialMode="login"
              onBack={() => navigateBrowser('/')}
              onSuccess={(user) => {
                setStoredUser(user);
                setCurrentUser(user);
                if (user.role === 'owner') {
                  navigateBrowser('/dashboard');
                } else {
                  navigateBrowser('/account');
                }
              }}
            />
          ))}
      </main>

      {view.type !== 'checkout' && view.type !== 'dashboard' && (
        <Footer onLinkClick={handleNavClick} onNavigateRoute={handleNavigateRoute} />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onRemoveItem={removeFromCart}
        onCheckout={() => {
          setIsCartOpen(false);
          handleBookService(cartItems[0]);
        }}
      />
    </div>
  );
}

export default App;
