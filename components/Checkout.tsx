/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Product, Booking, UserProfile, EmailLog } from '../types';
import { PRODUCTS, DEFAULT_BUSINESS_SETTINGS } from '../constants';
import {
  fetchAvailableSlots,
  createAppointment,
  updateCustomerBooking
} from '../services/salonApi';

interface CheckoutProps {
  items: Product[];
  services?: Product[];
  initialService?: Product;
  rescheduleBooking?: Booking;
  currentUser?: UserProfile | null;
  onBack: () => void;
  onBookingConfirmed?: (
    booking: Booking,
    user?: UserProfile,
    emailLog?: EmailLog
  ) => void;
  onViewAppointment?: (bookingId: string) => void;
}

function getSuggestedDates(): { iso: string; label: string; dayName: string }[] {
  const result: { iso: string; label: string; dayName: string }[] = [
    { iso: '2026-10-15', label: 'Oct 15', dayName: 'Thursday' }
  ];
  const base = new Date();
  for (let i = 1; i <= 14 && result.length < 8; i++) {
    const dt = new Date(base);
    dt.setDate(base.getDate() + i);
    const dow = dt.getDay();
    if (dow === 0 || dow === 1) continue; // Closed Sun & Mon
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${d}`;
    if (result.some((r) => r.iso === iso)) continue;
    result.push({
      iso,
      label: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      dayName: dt.toLocaleDateString('en-US', { weekday: 'long' })
    });
  }
  return result;
}

const Checkout: React.FC<CheckoutProps> = ({
  items,
  services = PRODUCTS,
  initialService,
  rescheduleBooking,
  currentUser,
  onBack,
  onBookingConfirmed,
  onViewAppointment
}) => {
  const defaultService =
    initialService ||
    (rescheduleBooking
      ? services.find((s) => s.id === rescheduleBooking.serviceId)
      : undefined) ||
    items[0] ||
    services.find((s) => s.slug === 'braids') ||
    services[0];

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(
    initialService || rescheduleBooking ? 2 : 1
  );
  const [selectedService, setSelectedService] = useState<Product>(defaultService);
  const [selectedDate, setSelectedDate] = useState<string>(
    rescheduleBooking?.appointmentDate || '2026-10-15'
  );
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isDayOpen, setIsDayOpen] = useState<boolean>(true);
  const [slotsLoading, setSlotsLoading] = useState<boolean>(false);
  const [selectedTime, setSelectedTime] = useState<string>(
    rescheduleBooking?.startTime || '2:00 PM'
  );

  // Customer Info State
  const [customerName, setCustomerName] = useState<string>(
    currentUser?.name || rescheduleBooking?.customerName || ''
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    currentUser?.email || rescheduleBooking?.customerEmail || ''
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    currentUser?.phone || rescheduleBooking?.customerPhone || ''
  );
  const [notes, setNotes] = useState<string>(
    rescheduleBooking?.notes || currentUser?.hairTextureNotes || ''
  );
  const [createAccount, setCreateAccount] = useState<boolean>(!currentUser);
  const [accountPassword, setAccountPassword] = useState<string>('');

  // Submission & Confirmation State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [confirmedEmailLog, setConfirmedEmailLog] = useState<EmailLog | null>(null);
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);

  const suggestedDates = getSuggestedDates();

  useEffect(() => {
    if (currentUser) {
      setCustomerName((prev) => prev || currentUser.name);
      setCustomerEmail((prev) => prev || currentUser.email);
      setCustomerPhone((prev) => prev || currentUser.phone);
      setCreateAccount(false);
    }
  }, [currentUser]);

  useEffect(() => {
    let active = true;
    setSlotsLoading(true);
    setErrorMessage(null);
    fetchAvailableSlots(selectedDate, rescheduleBooking?.id)
      .then((res) => {
        if (!active) return;
        setIsDayOpen(res.isOpen);
        setAvailableSlots(res.availableSlots);
        setBookedSlots(res.bookedSlots || []);
        if (
          res.availableSlots.length > 0 &&
          !res.availableSlots.includes(selectedTime)
        ) {
          setSelectedTime(res.availableSlots[0]);
        } else if (res.availableSlots.length === 0) {
          setSelectedTime('');
        }
      })
      .catch((err) => {
        if (!active) return;
        setErrorMessage(err.message || 'Could not load time slots.');
      })
      .finally(() => {
        if (active) setSlotsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedDate, rescheduleBooking?.id]);

  const formatHumanDate = (iso: string) => {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return iso;
    }
  };

  const handleConfirmAppointment = async () => {
    setErrorMessage(null);
    setSubmitting(true);
    try {
      if (rescheduleBooking) {
        const res = await updateCustomerBooking(rescheduleBooking.id, {
          action: 'reschedule',
          appointmentDate: selectedDate,
          startTime: selectedTime,
          notes
        });
        setConfirmedBooking(res.booking);
        setStep(6);
        if (onBookingConfirmed) onBookingConfirmed(res.booking);
      } else {
        const res = await createAppointment({
          serviceId: selectedService.id,
          appointmentDate: selectedDate,
          startTime: selectedTime,
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          notes: notes.trim(),
          createAccountPassword:
            !currentUser && createAccount && accountPassword.length >= 6
              ? accountPassword
              : undefined
        });
        setConfirmedBooking(res.booking);
        if (res.emailLog) setConfirmedEmailLog(res.emailLog);
        setStep(6);
        if (onBookingConfirmed) {
          onBookingConfirmed(res.booking, res.user, res.emailLog);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Unable to confirm your appointment. Please verify your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-24 px-6 bg-[#F5F2EB] animate-fade-in-up">
      <div className="max-w-6xl mx-auto">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between mb-12">
          <button
            onClick={onBack}
            className="group flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-[#A8A29E] hover:text-[#2C2A26] transition-colors"
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

          {step < 6 && (
            <div className="hidden md:flex items-center gap-3 text-xs uppercase tracking-widest text-[#A8A29E]">
              {[
                { num: 1, label: 'Service' },
                { num: 2, label: 'Date' },
                { num: 3, label: 'Time' },
                { num: 4, label: 'Guest' },
                { num: 5, label: 'Review' }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <button
                    type="button"
                    disabled={s.num > step}
                    onClick={() => s.num < step && setStep(s.num as 1 | 2 | 3 | 4 | 5)}
                    className={`transition-colors ${
                      step === s.num
                        ? 'text-[#2C2A26] font-semibold border-b border-[#2C2A26] pb-0.5'
                        : s.num < step
                        ? 'text-[#5D5A53] hover:text-[#2C2A26]'
                        : 'text-[#A8A29E]/60 cursor-default'
                    }`}
                  >
                    0{s.num}. {s.label}
                  </button>
                  {idx < 4 && <span aria-hidden="true">·</span>}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {step === 6 && confirmedBooking ? (
          /* =================================================================
             STEP 6: OFFICIAL RESERVATION TICKET & PRINTABLE PASS
             ================================================================= */
          <div className="max-w-3xl mx-auto animate-fade-in-up">
            <div
              id="printable-reservation-ticket"
              className="bg-white border border-[#D6D1C7] shadow-xl overflow-hidden"
            >
              {/* Ticket Header Banner */}
              <div className="bg-[#2C2A26] text-[#F5F2EB] px-8 py-10 text-center">
                <span className="inline-block text-[10px] uppercase tracking-[0.3em] text-[#D6D1C7] mb-2">
                  Official Sanctuary Reservation Ticket
                </span>
                <h1 className="text-3xl md:text-5xl font-serif font-normal text-[#F5F2EB]">
                  {DEFAULT_BUSINESS_SETTINGS.salonName}
                </h1>
                <p className="text-xs uppercase tracking-[0.2em] text-[#A8A29E] mt-2">
                  {DEFAULT_BUSINESS_SETTINGS.address} · {DEFAULT_BUSINESS_SETTINGS.city}
                </p>
              </div>

              {/* Ticket Code Stub */}
              <div className="bg-[#F5F2EB] border-b border-dashed border-[#D6D1C7] px-8 py-8 text-center">
                <span className="block text-[10px] uppercase tracking-[0.28em] text-[#A8A29E] mb-2">
                  Reservation Ticket Code
                </span>
                <div className="font-serif text-3xl md:text-4xl tracking-[0.16em] text-[#2C2A26] font-medium select-all">
                  {confirmedBooking.reference}
                </div>
                <p className="text-xs text-[#5D5A53] font-light mt-3">
                  Your official ticket has been automatically sent to{' '}
                  <span className="text-[#2C2A26] font-medium">
                    {confirmedBooking.customerEmail}
                  </span>
                  . Present this code or print your pass upon arrival.
                </p>
              </div>

              {/* Ticket Details */}
              <div className="p-8 md:p-12 space-y-5 text-sm">
                <div className="flex justify-between items-center pb-4 border-b border-[#EBE7DE]">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Guest Name
                  </span>
                  <span className="font-medium text-[#2C2A26]">
                    {confirmedBooking.customerName}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#EBE7DE]">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Selected Ritual
                  </span>
                  <span className="font-serif text-lg text-[#2C2A26]">
                    {confirmedBooking.serviceName} ({confirmedBooking.duration})
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#EBE7DE]">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Date
                  </span>
                  <span className="text-[#2C2A26]">
                    {formatHumanDate(confirmedBooking.appointmentDate)}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#EBE7DE]">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Time
                  </span>
                  <span className="text-[#2C2A26] tabular-nums">
                    {confirmedBooking.startTime} – {confirmedBooking.endTime}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-4 border-b border-[#EBE7DE]">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Status
                  </span>
                  <span className="px-3 py-1 bg-[#EBE7DE] text-[#2C2A26] text-xs uppercase tracking-widest">
                    {confirmedBooking.status}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="uppercase tracking-widest text-xs text-[#A8A29E]">
                    Estimated Investment
                  </span>
                  <span className="font-serif text-2xl text-[#2C2A26] tabular-nums">
                    ${confirmedBooking.price}
                  </span>
                </div>
              </div>
            </div>

            {/* Ticket Actions (Hidden when printing) */}
            <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-8 py-4 bg-[#2C2A26] text-[#F5F2EB] text-xs font-medium uppercase tracking-widest hover:bg-[#433E38] transition-colors"
              >
                Print Reservation Ticket
              </button>

              {onViewAppointment && (
                <button
                  type="button"
                  onClick={() => onViewAppointment(confirmedBooking.id)}
                  className="px-8 py-4 border border-[#2C2A26] text-[#2C2A26] text-xs font-medium uppercase tracking-widest hover:bg-[#EBE7DE] transition-colors"
                >
                  View in My Account
                </button>
              )}

              <button
                type="button"
                onClick={onBack}
                className="px-8 py-4 text-xs font-medium uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26] transition-colors"
              >
                Return Home
              </button>
            </div>
          </div>
        ) : (
          /* =================================================================
             STEPS 1 TO 5: GUIDED BOOKING WORKFLOW
             ================================================================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
            {/* Left Column: Active Step Controls */}
            <div className="lg:col-span-7">
              <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-2">
                {rescheduleBooking
                  ? `Rescheduling Reference ${rescheduleBooking.reference}`
                  : `Step 0${step} of 05`}
              </span>
              <h1 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mb-3">
                {step === 1 && 'Choose your service'}
                {step === 2 && 'Select a date'}
                {step === 3 && 'Select an available time'}
                {step === 4 && 'Guest information'}
                {step === 5 && 'Review your reservation'}
              </h1>
              <p className="text-sm text-[#5D5A53] font-light mb-10">
                {step === 1 &&
                  'Select the hair ritual you wish to reserve. Each appointment includes our botanical steam cleanse.'}
                {step === 2 &&
                  'Our sanctuary is open Tuesday through Saturday. Choose your preferred date below.'}
                {step === 3 &&
                  `Available appointment times on ${formatHumanDate(selectedDate)} for ${selectedService.name} (${selectedService.duration}).`}
                {step === 4 &&
                  'Enter your contact details to receive your confirmation and manage your appointment.'}
                {step === 5 &&
                  'Verify your selection below before confirming your appointment.'}
              </p>

              {errorMessage && (
                <div className="mb-8 p-4 border border-[#2C2A26] bg-[#EBE7DE] text-sm text-[#2C2A26]">
                  {errorMessage}
                </div>
              )}

              {/* STEP 1: CHOOSE SERVICE */}
              {step === 1 && (
                <div className="space-y-4">
                  {services.map((srv) => {
                    const isSelected = selectedService.id === srv.id;
                    return (
                      <div
                        key={srv.id}
                        onClick={() => setSelectedService(srv)}
                        className={`p-6 border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-[#2C2A26] bg-white shadow-sm'
                            : 'border-[#D6D1C7] bg-transparent hover:border-[#2C2A26]/50'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                            <span>{srv.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{srv.duration}</span>
                          </div>
                          <h3 className="text-xl font-serif text-[#2C2A26]">
                            {srv.name}
                          </h3>
                          <p className="text-sm text-[#5D5A53] font-light mt-1">
                            {srv.description}
                          </p>
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-2">
                          <span className="text-lg font-serif text-[#2C2A26] tabular-nums">
                            ${srv.price}
                          </span>
                          <span
                            className={`text-xs uppercase tracking-widest ${
                              isSelected ? 'text-[#2C2A26] font-medium' : 'text-[#A8A29E]'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-6">
                    <button
                      onClick={() => setStep(2)}
                      className="w-full py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors"
                    >
                      Continue to Date Selection
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: CHOOSE DATE */}
              {step === 2 && (
                <div className="space-y-8">
                  <div>
                    <span className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-4">
                      Recommended Atelier Dates
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {suggestedDates.map((d) => {
                        const active = selectedDate === d.iso;
                        return (
                          <button
                            key={d.iso}
                            type="button"
                            onClick={() => setSelectedDate(d.iso)}
                            className={`p-4 border text-left transition-all ${
                              active
                                ? 'border-[#2C2A26] bg-[#2C2A26] text-[#F5F2EB]'
                                : 'border-[#D6D1C7] bg-white/50 text-[#2C2A26] hover:border-[#2C2A26]'
                            }`}
                          >
                            <span
                              className={`block text-[11px] uppercase tracking-widest mb-1 ${
                                active ? 'text-[#D6D1C7]' : 'text-[#A8A29E]'
                              }`}
                            >
                              {d.dayName}
                            </span>
                            <span className="text-lg font-serif">{d.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#D6D1C7]">
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-3">
                      Or Choose Any Calendar Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      min="2026-10-07"
                      onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                      className="w-full sm:w-72 bg-white border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none focus:border-[#2C2A26]"
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    {!rescheduleBooking && (
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-8 py-5 border border-[#D6D1C7] text-[#2C2A26] uppercase tracking-widest text-xs font-medium hover:border-[#2C2A26] transition-colors"
                      >
                        Previous
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="flex-1 py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors"
                    >
                      Continue to Available Times
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CHOOSE AVAILABLE TIME */}
              {step === 3 && (
                <div className="space-y-8">
                  {slotsLoading ? (
                    <div className="p-12 border border-[#D6D1C7] text-center text-sm text-[#5D5A53]">
                      Checking sanctuary availability for {formatHumanDate(selectedDate)}...
                    </div>
                  ) : !isDayOpen ? (
                    <div className="p-10 border border-[#D6D1C7] bg-[#EBE7DE]/50 text-center space-y-4">
                      <p className="font-serif text-xl text-[#2C2A26]">
                        The Atelier rests on Sundays and Mondays.
                      </p>
                      <p className="text-sm text-[#5D5A53] font-light">
                        Please select a Tuesday through Saturday date to view available times.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-6 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                      >
                        Choose Another Date
                      </button>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="p-10 border border-[#D6D1C7] bg-[#EBE7DE]/50 text-center space-y-4">
                      <p className="font-serif text-xl text-[#2C2A26]">
                        All appointments are reserved on this date.
                      </p>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-6 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                      >
                        Select Another Date
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-4">
                        Available Times on {formatHumanDate(selectedDate)}
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {availableSlots.map((slot) => {
                          const active = selectedTime === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTime(slot)}
                              className={`py-4 px-4 border text-center transition-all tabular-nums ${
                                active
                                  ? 'border-[#2C2A26] bg-[#2C2A26] text-[#F5F2EB]'
                                  : 'border-[#D6D1C7] bg-white/70 text-[#2C2A26] hover:border-[#2C2A26]'
                              }`}
                            >
                              <span className="text-sm font-medium">{slot}</span>
                            </button>
                          );
                        })}
                      </div>

                      {bookedSlots.length > 0 && (
                        <p className="text-xs text-[#A8A29E] mt-4">
                          Already reserved on this date: {bookedSlots.join(', ')}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-8 py-5 border border-[#D6D1C7] text-[#2C2A26] uppercase tracking-widest text-xs font-medium hover:border-[#2C2A26] transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!selectedTime}
                      onClick={() => setStep(rescheduleBooking ? 5 : 4)}
                      className="flex-1 py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors disabled:opacity-40"
                    >
                      {rescheduleBooking ? 'Review Reschedule' : 'Continue to Guest Details'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: CUSTOMER INFORMATION */}
              {step === 4 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Sarah Jenkins"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26] transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="sarah@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        Mobile Phone *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+1 (212) 555-0194"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26] transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Hair Texture & Ritual Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share your curl pattern, desired braid length, or any scalp sensitivities..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-white/60 border border-[#D6D1C7] p-3 text-sm text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26] transition-colors"
                    />
                  </div>

                  {!currentUser && (
                    <div className="p-6 border border-[#D6D1C7] bg-white/50 space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="createAccountToggle"
                          checked={createAccount}
                          onChange={(e) => setCreateAccount(e.target.checked)}
                          className="accent-[#2C2A26]"
                        />
                        <label
                          htmlFor="createAccountToggle"
                          className="text-sm font-medium text-[#2C2A26]"
                        >
                          Create a client account to manage or reschedule this appointment online
                        </label>
                      </div>
                      {createAccount && (
                        <div>
                          <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                            Choose Account Password (min. 6 characters)
                          </label>
                          <input
                            type="password"
                            placeholder="••••••••"
                            value={accountPassword}
                            onChange={(e) => setAccountPassword(e.target.value)}
                            className="w-full bg-transparent border-b border-[#D6D1C7] py-2 text-[#2C2A26] placeholder-[#A8A29E] outline-none focus:border-[#2C2A26]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-8 py-5 border border-[#D6D1C7] text-[#2C2A26] uppercase tracking-widest text-xs font-medium hover:border-[#2C2A26] transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!customerName.trim() || !customerEmail.trim()}
                      onClick={() => setStep(5)}
                      className="flex-1 py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-xs font-medium hover:bg-[#433E38] transition-colors disabled:opacity-40"
                    >
                      Review Reservation
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: REVIEW & CONFIRM */}
              {step === 5 && (
                <div className="space-y-8">
                  <div className="p-8 bg-white/70 border border-[#D6D1C7] space-y-6">
                    <div className="flex justify-between items-start pb-6 border-b border-[#D6D1C7]">
                      <div>
                        <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                          Selected Ritual
                        </span>
                        <h3 className="text-2xl font-serif text-[#2C2A26] mt-1">
                          {selectedService.name}
                        </h3>
                        <p className="text-xs text-[#5D5A53] mt-1">
                          Duration: {selectedService.duration} · {selectedService.category}
                        </p>
                      </div>
                      <span className="text-2xl font-serif text-[#2C2A26] tabular-nums">
                        ${selectedService.price}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                          Date & Time
                        </span>
                        <p className="text-[#2C2A26] font-medium">
                          {formatHumanDate(selectedDate)}
                        </p>
                        <p className="text-[#5D5A53] tabular-nums">{selectedTime}</p>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                          Guest Details
                        </span>
                        <p className="text-[#2C2A26] font-medium">{customerName}</p>
                        <p className="text-[#5D5A53]">{customerEmail}</p>
                        {customerPhone && <p className="text-[#5D5A53]">{customerPhone}</p>}
                      </div>
                    </div>

                    {notes && (
                      <div className="pt-4 border-t border-[#D6D1C7]/60 text-sm">
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                          Ritual Notes
                        </span>
                        <p className="text-[#5D5A53] font-light">{notes}</p>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-[#5D5A53] leading-relaxed">
                    {DEFAULT_BUSINESS_SETTINGS.cancellationPolicy} By confirming, your slot is reserved immediately and a confirmation email will be sent via LevelUp Email Service.
                  </p>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setStep(rescheduleBooking ? 3 : 4)}
                      className="px-8 py-5 border border-[#D6D1C7] text-[#2C2A26] uppercase tracking-widest text-xs font-medium hover:border-[#2C2A26] transition-colors"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={handleConfirmAppointment}
                      className="flex-1 py-5 bg-[#2C2A26] text-[#F5F2EB] uppercase tracking-widest text-sm font-medium hover:bg-[#433E38] transition-colors disabled:opacity-50"
                    >
                      {submitting
                        ? 'Confirming Appointment...'
                        : rescheduleBooking
                        ? 'Confirm Rescheduled Appointment'
                        : 'Confirm appointment'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Dynamic Booking Summary */}
            <div className="lg:col-span-5 lg:pl-12 lg:border-l border-[#D6D1C7]">
              <div className="sticky top-28">
                <h2 className="text-xl font-serif text-[#2C2A26] mb-8">
                  Appointment Summary
                </h2>

                <div className="flex gap-5 mb-8 pb-8 border-b border-[#D6D1C7]">
                  <div className="w-24 h-28 bg-[#EBE7DE] shrink-0 overflow-hidden">
                    <img
                      src={selectedService.imageUrl}
                      alt={selectedService.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                      {selectedService.category}
                    </span>
                    <h3 className="font-serif text-[#2C2A26] text-xl mt-1">
                      {selectedService.name}
                    </h3>
                    <p className="text-xs text-[#5D5A53] mt-2 leading-relaxed">
                      {selectedService.tagline}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm pb-8 border-b border-[#D6D1C7]">
                  <div className="flex justify-between">
                    <span className="text-[#5D5A53]">Service</span>
                    <span className="text-[#2C2A26] font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5A53]">Duration</span>
                    <span className="text-[#2C2A26] tabular-nums">
                      {selectedService.duration}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5A53]">Date</span>
                    <span className="text-[#2C2A26]">{formatHumanDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5A53]">Time</span>
                    <span className="text-[#2C2A26] tabular-nums">
                      {selectedTime || 'Select a slot'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5D5A53]">Botanical Steam Cleanse</span>
                    <span className="text-[#2C2A26]">Included</span>
                  </div>
                </div>

                <div className="pt-6 flex justify-between items-baseline">
                  <span className="font-serif text-xl text-[#2C2A26]">Total Due at Salon</span>
                  <div className="flex items-end gap-2">
                    <span className="text-xs text-[#A8A29E] mb-1">USD</span>
                    <span className="font-serif text-2xl text-[#2C2A26] tabular-nums">
                      ${selectedService.price}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Checkout;
