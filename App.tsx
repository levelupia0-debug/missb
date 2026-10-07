/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductGrid from './components/ProductGrid';
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
import { PRODUCTS, JOURNAL_ARTICLES } from './constants';
import { Product, ViewState, UserProfile } from './types';
import { fetchServicesCatalog, setAuthToken } from './services/salonApi';

function App() {
  const [services, setServices] = useState<Product[]>(PRODUCTS);
  const [view, setView] = useState<ViewState>({ type: 'home' });
  const [cartItems, setCartItems] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  const pushPath = (path: string) => {
    try {
      window.history.pushState(null, '', path);
    } catch {
      // Ignore in restricted iframe contexts
    }
  };

  // Sync URL path on initial load & popstate
  const resolveRouteFromPath = useCallback(
    (pathname: string) => {
      const clean = pathname.replace(/\/+$/, '') || '/';
      if (clean === '/' || clean === '/about' || clean === '/contact') {
        setView({ type: 'home' });
        if (clean === '/about') setTimeout(() => scrollToSection('about'), 80);
        if (clean === '/contact') setTimeout(() => scrollToSection('contact'), 80);
        return;
      }
      if (clean === '/services') {
        setView({ type: 'home' });
        setTimeout(() => scrollToSection('products'), 80);
        return;
      }
      if (clean.startsWith('/services/')) {
        const slug = clean.replace('/services/', '');
        const found =
          services.find((s) => s.slug === slug || s.id === slug) ||
          PRODUCTS.find((s) => s.slug === slug || s.id === slug);
        if (found) {
          setView({ type: 'product', product: found });
          return;
        }
      }
      if (clean === '/book') {
        setView({ type: 'checkout' });
        return;
      }
      if (clean === '/login') {
        setView({ type: 'login' });
        return;
      }
      if (clean === '/register') {
        setView({ type: 'register' });
        return;
      }
      if (clean === '/account' || clean === '/account/bookings' || clean === '/account/profile') {
        const tab =
          clean === '/account/bookings'
            ? 'bookings'
            : clean === '/account/profile'
            ? 'profile'
            : 'overview';
        setView({ type: 'account', tab });
        return;
      }
      if (clean.startsWith('/dashboard')) {
        const sub = clean.replace('/dashboard/', '').replace('/dashboard', '');
        const section = (
          ['overview', 'bookings', 'customers', 'services', 'availability', 'emails', 'settings'].includes(sub)
            ? sub
            : 'overview'
        ) as any;
        setView({ type: 'dashboard', section });
        return;
      }
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
    resolveRouteFromPath(window.location.pathname);
    const onPopState = () => resolveRouteFromPath(window.location.pathname);
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

  const scrollToSection = (targetId: string) => {
    if (!targetId) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const element = document.getElementById(targetId);
    if (element) {
      const headerOffset = 85;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const routeMap: Record<string, string> = {
      '': '/',
      products: '/services',
      about: '/about',
      journal: '/#journal',
      contact: '/contact'
    };
    pushPath(routeMap[targetId] || '/');

    if (view.type !== 'home') {
      setView({ type: 'home' });
      setTimeout(() => scrollToSection(targetId), 50);
    } else {
      scrollToSection(targetId);
    }
  };

  const handleNavigateRoute = (
    route: 'home' | 'services' | 'checkout' | 'login' | 'account' | 'dashboard'
  ) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (route === 'home') {
      pushPath('/');
      setView({ type: 'home' });
    } else if (route === 'services') {
      pushPath('/services');
      setView({ type: 'home' });
      setTimeout(() => scrollToSection('products'), 50);
    } else if (route === 'checkout') {
      pushPath('/book');
      setView({ type: 'checkout' });
    } else if (route === 'login') {
      pushPath('/login');
      setView({ type: 'login' });
    } else if (route === 'account') {
      if (!currentUser) {
        pushPath('/login');
        setView({ type: 'login', redirectTo: 'account' });
      } else {
        pushPath('/account');
        setView({ type: 'account', tab: 'overview' });
      }
    } else if (route === 'dashboard') {
      if (!currentUser || currentUser.role !== 'owner') {
        pushPath('/login');
        setView({ type: 'login', redirectTo: 'dashboard' });
      } else {
        pushPath('/dashboard');
        setView({ type: 'dashboard', section: 'overview' });
      }
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
    pushPath('/book');
    setView({ type: 'checkout', initialService: service });
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    pushPath('/');
    setView({ type: 'home' });
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
          forceDarkText={isTopBarDarkText}
        />
      )}

      <main>
        {view.type === 'home' && (
          <>
            <Hero onBookAppointment={() => handleBookService()} />
            <ProductGrid
              services={services}
              onProductClick={(p) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                pushPath(`/services/${p.slug}`);
                setView({ type: 'product', product: p });
              }}
              onBookService={(p) => handleBookService(p)}
            />
            <About onBookClick={() => handleBookService()} />
            <Journal
              onArticleClick={(a) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setView({ type: 'journal', article: a });
              }}
            />
          </>
        )}

        {view.type === 'product' && (
          <ProductDetail
            product={view.product}
            onBack={() => {
              pushPath('/services');
              setView({ type: 'home' });
              setTimeout(() => scrollToSection('products'), 50);
            }}
            onAddToCart={addToCart}
            onBookNow={(p) => handleBookService(p)}
          />
        )}

        {view.type === 'journal' && (
          <JournalDetail
            article={view.article || JOURNAL_ARTICLES[0]}
            onBack={() => {
              pushPath('/');
              setView({ type: 'home' });
            }}
          />
        )}

        {view.type === 'checkout' && (
          <Checkout
            items={cartItems}
            services={services}
            initialService={view.initialService}
            rescheduleBooking={view.rescheduleBooking}
            currentUser={currentUser}
            onBack={() => {
              pushPath('/');
              setView({ type: 'home' });
            }}
            onBookingConfirmed={(_booking, createdOrLoggedUser) => {
              if (createdOrLoggedUser) {
                setCurrentUser(createdOrLoggedUser);
              }
            }}
            onViewAppointment={(bookingId) => {
              if (currentUser) {
                pushPath('/account/bookings');
                setView({
                  type: 'account',
                  tab: 'bookings',
                  highlightBookingId: bookingId
                });
              } else {
                pushPath('/login');
                setView({ type: 'login', redirectTo: 'account' });
              }
            }}
          />
        )}

        {(view.type === 'login' || view.type === 'register') && (
          <AuthView
            initialMode={view.type}
            onBack={() => {
              pushPath('/');
              setView({ type: 'home' });
            }}
            onSuccess={(user) => {
              setCurrentUser(user);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (user.role === 'owner' || view.redirectTo === 'dashboard') {
                pushPath('/dashboard');
                setView({ type: 'dashboard', section: 'overview' });
              } else if (view.redirectTo === 'checkout') {
                pushPath('/book');
                setView({ type: 'checkout' });
              } else {
                pushPath('/account');
                setView({ type: 'account', tab: 'overview' });
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
              onUserUpdated={(u) => setCurrentUser(u)}
              onLogout={handleLogout}
              onBookAgain={(srv) => handleBookService(srv)}
              onRescheduleBooking={(bk) => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                pushPath('/book');
                setView({ type: 'checkout', rescheduleBooking: bk });
              }}
              onNavigateDashboard={() => {
                pushPath('/dashboard');
                setView({ type: 'dashboard', section: 'overview' });
              }}
            />
          ) : (
            <AuthView
              initialMode="login"
              onBack={() => {
                pushPath('/');
                setView({ type: 'home' });
              }}
              onSuccess={(user) => {
                setCurrentUser(user);
                pushPath('/account');
                setView({ type: 'account', tab: 'overview' });
              }}
            />
          ))}

        {view.type === 'dashboard' &&
          (currentUser && currentUser.role === 'owner' ? (
            <DashboardView
              user={currentUser}
              initialSection={view.section}
              onBackToSite={() => {
                pushPath('/');
                setView({ type: 'home' });
              }}
              onLogout={handleLogout}
              onServicesChanged={(updated) => setServices(updated)}
            />
          ) : (
            <AuthView
              initialMode="login"
              onBack={() => {
                pushPath('/');
                setView({ type: 'home' });
              }}
              onSuccess={(user) => {
                setCurrentUser(user);
                if (user.role === 'owner') {
                  pushPath('/dashboard');
                  setView({ type: 'dashboard', section: 'overview' });
                } else {
                  pushPath('/account');
                  setView({ type: 'account', tab: 'overview' });
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
          pushPath('/book');
          setView({ type: 'checkout', initialService: cartItems[0] });
        }}
      />
    </div>
  );
}

export default App;
