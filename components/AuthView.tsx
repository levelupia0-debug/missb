/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile } from '../types';
import {
  loginUser,
  registerUser,
  resetUserPassword,
  loginWithGoogleFirebase,
  sendVerificationCode
} from '../services/salonApi';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  onSuccess: (user: UserProfile) => void;
  onBack: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onBack
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>(initialMode);
  const [registerStep, setRegisterStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [hairTextureNotes, setHairTextureNotes] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatusMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser(email, password);
        onSuccess(res.user);
      } else if (mode === 'register') {
        if (registerStep === 'form') {
          const codeRes = await sendVerificationCode({ name, email });
          setRegisterStep('verify');
          if (codeRes.fallbackCode) {
            setVerificationCode(codeRes.fallbackCode);
            setStatusMessage(
              `Verification code sent to ${email}. (Preview mode auto-filled: ${codeRes.fallbackCode} — add RESEND_API_KEY on Vercel for live Gmail delivery)`
            );
          } else {
            setStatusMessage(
              `A 6-digit verification code has been sent via Resend to ${email}. Please enter it below to continue.`
            );
          }
        } else {
          const res = await registerUser({
            name,
            email,
            phone,
            password,
            hairTextureNotes,
            verificationCode
          });
          onSuccess(res.user);
        }
      } else if (mode === 'reset') {
        const res = await resetUserPassword(email, password);
        setStatusMessage(res.message);
        setMode('login');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setStatusMessage(null);
    setLoading(true);
    try {
      const res = await loginWithGoogleFirebase();
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginUser(demoEmail, demoPass);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 bg-[#F5F2EB] animate-fade-in-up">
      <div className="max-w-xl mx-auto">
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#2C2A26] transition-colors mb-12"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
          Back to Atelier
        </button>

        <div className="bg-white/75 border border-[#D6D1C7] p-8 md:p-14">
          <span className="block text-xs uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
            {mode === 'login' && 'Private Access'}
            {mode === 'register' &&
              (registerStep === 'verify' ? 'Email Verification' : 'Guest Membership')}
            {mode === 'reset' && 'Credential Recovery'}
          </span>
          <h1 className="text-3xl md:text-4xl font-serif text-[#2C2A26] mb-3">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' &&
              (registerStep === 'verify'
                ? 'Enter your 6-digit code'
                : 'Create your client profile')}
            {mode === 'reset' && 'Reset your password'}
          </h1>
          <p className="text-sm text-[#5D5A53] font-light mb-8">
            {mode === 'login' &&
              'Access your upcoming reservations, ritual history, or salon management suite.'}
            {mode === 'register' &&
              (registerStep === 'verify'
                ? `We dispatched a 6-digit verification code to ${email}. Enter it below to activate your account.`
                : 'Join Miss beauty to book appointments, store texture preferences, and manage reservations.')}
            {mode === 'reset' &&
              'Enter your registered email address and choose a new password.'}
          </p>

          {error && (
            <div className="mb-6 p-4 border border-[#2C2A26] bg-[#EBE7DE] text-sm text-[#2C2A26]">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="mb-6 p-4 border border-[#2C2A26] bg-[#EBE7DE]/60 text-sm text-[#2C2A26]">
              {statusMessage}
            </div>
          )}

          {/* Google Firebase Sign-In Button */}
          {mode !== 'reset' && registerStep === 'form' && (
            <div className="mb-8">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 px-6 border border-[#2C2A26] bg-[#F5F2EB] text-[#2C2A26] hover:bg-[#2C2A26] hover:text-[#F5F2EB] transition-colors flex items-center justify-center gap-3 text-xs uppercase tracking-widest font-medium disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 15.65 5 12c0-3.65 3.36-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-[#D6D1C7]"></div>
                <span className="flex-shrink mx-4 text-[11px] uppercase tracking-widest text-[#A8A29E]">
                  Or with email
                </span>
                <div className="flex-grow border-t border-[#D6D1C7]"></div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === 'register' && registerStep === 'verify' ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-3">
                    6-Digit Verification Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-[#F5F2EB] border border-[#2C2A26] py-4 px-6 text-center font-serif text-3xl tracking-[0.4em] text-[#2C2A26] outline-none"
                  />
                </div>
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[#5D5A53]">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep('form');
                      setStatusMessage(null);
                      setError(null);
                    }}
                    className="underline underline-offset-4 hover:text-[#2C2A26]"
                  >
                    ← Edit email address
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setError(null);
                      try {
                        const codeRes = await sendVerificationCode({ name, email });
                        if (codeRes.fallbackCode) {
                          setVerificationCode(codeRes.fallbackCode);
                        }
                        setStatusMessage(`A new verification code was sent to ${email}.`);
                      } catch (err: any) {
                        setError(err.message);
                      }
                    }}
                    className="underline underline-offset-4 hover:text-[#2C2A26]"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            ) : (
              <>
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={100}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Sarah Jenkins"
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={160}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      maxLength={40}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (212) 555-0194"
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                    {mode === 'reset' ? 'New Password (min. 6 characters) *' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                  />
                </div>

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Hair Texture & Ritual Notes (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={1000}
                      value={hairTextureNotes}
                      onChange={(e) => setHairTextureNotes(e.target.value)}
                      placeholder="e.g. 3C curls, prefers tension-free knotless braids"
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors disabled:opacity-50"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? registerStep === 'verify'
                  ? 'Verify Code & Create Account'
                  : 'Send Verification Code →'
                : 'Update Password'}
            </button>
          </form>

          {/* Mode Switchers */}
          <div className="mt-8 pt-6 border-t border-[#D6D1C7] flex flex-wrap justify-between gap-4 text-xs uppercase tracking-widest text-[#5D5A53]">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStatusMessage(null);
                    setRegisterStep('form');
                    setMode('register');
                  }}
                  className="hover:text-[#2C2A26] underline underline-offset-4"
                >
                  Create an account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStatusMessage(null);
                    setMode('reset');
                  }}
                  className="hover:text-[#2C2A26] underline underline-offset-4"
                >
                  Reset password
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setStatusMessage(null);
                  setRegisterStep('form');
                  setMode('login');
                }}
                className="hover:text-[#2C2A26] underline underline-offset-4"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>

          {/* Instant Demo Access Section */}
          <div className="mt-8 pt-6 border-t border-[#D6D1C7]/70">
            <span className="block text-[11px] uppercase tracking-widest text-[#A8A29E] mb-3">
              One-Click Demo Access
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('sarah@example.com', 'Sarah2026!')}
                className="py-3 px-4 border border-[#D6D1C7] text-xs uppercase tracking-widest text-[#2C2A26] hover:border-[#2C2A26] bg-[#F5F2EB]/60 transition-colors"
              >
                Client Demo (Sarah)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleQuickDemoLogin('owner@missbeauty.atelier', 'Atelier2026!')
                }
                className="py-3 px-4 border border-[#2C2A26] text-xs uppercase tracking-widest text-[#2C2A26] hover:bg-[#2C2A26] hover:text-[#F5F2EB] transition-colors"
              >
                Salon Owner Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
