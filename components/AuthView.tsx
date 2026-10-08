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
  const [verificationToken, setVerificationToken] = useState<string | undefined>(
    undefined
  );
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
          setVerificationToken(codeRes.verificationToken);
          setRegisterStep('verify');
          if (codeRes.fallbackCode) {
            setVerificationCode(codeRes.fallbackCode);
            setStatusMessage(
              `A 6-digit verification code has been generated for ${email}. Please confirm the code below to activate your account.`
            );
          } else {
            setStatusMessage(
              `A 6-digit verification code has been sent to ${email}. Please check your inbox and enter it below to continue.`
            );
          }
        } else {
          const res = await registerUser({
            name,
            email,
            phone,
            password,
            hairTextureNotes,
            verificationCode,
            verificationToken
          });
          onSuccess(res.user);
        }
      } else if (mode === 'reset') {
        const res = await resetUserPassword(email, password);
        setStatusMessage(res.message);
        setMode('login');
      }
    } catch (err: any) {
      setError(
        err?.message ||
          'We could not complete your authentication request. Please verify your credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 bg-[#F5F2EB] animate-fade-in-up">
      <div className="max-w-xl mx-auto">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onBack();
          }}
          className="group inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#2C2A26] transition-colors mb-12"
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
        </a>

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
              'Sign in with your email address and password to access your reservations and profile.'}
            {mode === 'register' &&
              (registerStep === 'verify'
                ? `We dispatched a 6-digit verification code to ${email}. Enter it below to activate your account.`
                : 'Join Miss beauty to book appointments, store texture preferences, and manage your reservations.')}
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
                    onChange={(e) =>
                      setVerificationCode(e.target.value.replace(/\D/g, ''))
                    }
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
                        setVerificationToken(codeRes.verificationToken);
                        if (codeRes.fallbackCode) {
                          setVerificationCode(codeRes.fallbackCode);
                        }
                        setStatusMessage(`A new verification code was sent to ${email}.`);
                      } catch (err: any) {
                        setError(
                          err?.message || 'Unable to resend verification code right now.'
                        );
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
                      placeholder="Your full name"
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
                    placeholder="name@domain.com"
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
                      placeholder="+33 6 00 00 00 00"
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
        </div>
      </div>
    </div>
  );
};

export default AuthView;
