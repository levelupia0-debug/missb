/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, UserProfile, EmailLog, Product } from '../types';
import {
  fetchCustomerBookings,
  updateCustomerBooking,
  updateCustomerProfile
} from '../services/salonApi';
import { DEFAULT_BUSINESS_SETTINGS } from '../constants';

interface AccountViewProps {
  user: UserProfile;
  services: Product[];
  initialTab?: 'overview' | 'bookings' | 'profile';
  highlightBookingId?: string;
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
  onBookAgain: (service?: Product) => void;
  onRescheduleBooking: (booking: Booking) => void;
  onNavigateDashboard?: () => void;
}

const AccountView: React.FC<AccountViewProps> = ({
  user,
  services,
  initialTab = 'overview',
  highlightBookingId,
  onUserUpdated,
  onLogout,
  onBookAgain,
  onRescheduleBooking,
  onNavigateDashboard
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'profile'>(initialTab);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [selectedEmailPreview, setSelectedEmailPreview] = useState<EmailLog | null>(null);

  // Profile Form State
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone);
  const [profileNotes, setProfileNotes] = useState(user.hairTextureNotes || '');
  const [profileStatus, setProfileStatus] = useState<string | null>(null);

  const loadAccountData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomerBookings();
      setBookings(data.bookings);
      setEmailLogs(data.emailLogs || []);
      if (highlightBookingId) {
        const found = data.bookings.find((b) => b.id === highlightBookingId);
        if (found) setSelectedBookingDetail(found);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load your appointments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccountData();
  }, [highlightBookingId]);

  const handleCancelAppointment = async (bookingId: string) => {
    setError(null);
    try {
      const res = await updateCustomerBooking(bookingId, { action: 'cancel' });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.booking : b)));
      if (selectedBookingDetail?.id === bookingId) {
        setSelectedBookingDetail(res.booking);
      }
    } catch (err: any) {
      setError(err.message || 'Could not cancel appointment.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    try {
      const res = await updateCustomerProfile({
        name: profileName,
        phone: profilePhone,
        hairTextureNotes: profileNotes
      });
      onUserUpdated(res.user);
      setProfileStatus('Profile updated.');
    } catch (err: any) {
      setProfileStatus(err.message || 'Failed to update profile.');
    }
  };

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

  const activeUpcoming = bookings.filter(
    (b) => b.status === 'Confirmed' || b.status === 'Pending'
  );
  const nextAppointment = activeUpcoming[0] || null;

  return (
    <div className="min-h-screen pt-28 pb-24 px-6 md:px-12 bg-[#F5F2EB] animate-fade-in-up">
      <div className="max-w-[1400px] mx-auto">
        {/* Account Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between pb-10 mb-12 border-b border-[#D6D1C7] gap-6">
          <div>
            <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E] mb-3">
              Client Sanctuary · {user.email}
            </span>
            <h1 className="text-4xl md:text-6xl font-serif text-[#2C2A26]">
              Welcome, {user.name.split(' ')[0]}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {user.role === 'owner' && onNavigateDashboard && (
              <button
                onClick={onNavigateDashboard}
                className="px-6 py-3 border border-[#2C2A26] text-[#2C2A26] text-xs uppercase tracking-widest hover:bg-[#2C2A26] hover:text-[#F5F2EB] transition-colors whitespace-nowrap"
              >
                Open Salon Owner Dashboard
              </button>
            )}
            <button
              onClick={() => onBookAgain()}
              className="px-6 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#433E38] transition-colors whitespace-nowrap"
            >
              Book again
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-3 text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26] transition-colors whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-8 mb-12 border-b border-[#D6D1C7]/60">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'bookings', label: `Appointments (${bookings.length})` },
            { id: 'profile', label: 'Profile & Hair Notes' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as 'overview' | 'bookings' | 'profile')}
              className={`pb-4 text-xs uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-[#2C2A26] text-[#2C2A26] font-medium'
                  : 'border-transparent text-[#A8A29E] hover:text-[#2C2A26]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-8 p-4 border border-[#2C2A26] bg-[#EBE7DE] text-sm text-[#2C2A26] flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={loadAccountData}
              className="text-xs uppercase tracking-widest underline"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-sm text-[#5D5A53]">
            Loading your sanctuary appointments...
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Upcoming Appointment Spotlight */}
                <div className="lg:col-span-7 space-y-8">
                  <span className="block text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E]">
                    Upcoming Appointment
                  </span>

                  {nextAppointment ? (
                    <div className="bg-white/80 border border-[#D6D1C7] p-8 md:p-10 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                            Reference {nextAppointment.reference} · {nextAppointment.status}
                          </span>
                          <h2 className="text-3xl font-serif text-[#2C2A26] mt-1">
                            {nextAppointment.serviceName}
                          </h2>
                          <p className="text-sm text-[#5D5A53] mt-1">
                            {formatHumanDate(nextAppointment.appointmentDate)} ·{' '}
                            <span className="tabular-nums">{nextAppointment.startTime}</span> (
                            {nextAppointment.duration})
                          </p>
                        </div>
                        <span className="font-serif text-2xl text-[#2C2A26] tabular-nums">
                          ${nextAppointment.price}
                        </span>
                      </div>

                      <div className="pt-6 border-t border-[#D6D1C7] flex flex-wrap gap-4">
                        <button
                          onClick={() => setSelectedBookingDetail(nextAppointment)}
                          className="px-6 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#433E38] transition-colors"
                        >
                          View appointment
                        </button>
                        <button
                          onClick={() => onRescheduleBooking(nextAppointment)}
                          className="px-6 py-3 border border-[#2C2A26] text-[#2C2A26] text-xs uppercase tracking-widest hover:bg-[#EBE7DE] transition-colors"
                        >
                          Reschedule
                        </button>
                        <button
                          onClick={() => handleCancelAppointment(nextAppointment.id)}
                          className="px-6 py-3 text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26] underline underline-offset-4"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white/60 border border-[#D6D1C7] p-10 text-center space-y-4">
                      <p className="font-serif text-2xl text-[#2C2A26]">
                        No upcoming appointments.
                      </p>
                      <p className="text-sm text-[#5D5A53] font-light max-w-md mx-auto">
                        Reserve your next haircut, silk press, or braiding ritual at your convenience.
                      </p>
                      <button
                        onClick={() => onBookAgain()}
                        className="px-8 py-4 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                      >
                        Book an Appointment
                      </button>
                    </div>
                  )}

                  {/* Recent Bookings List */}
                  <div className="pt-6">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#A8A29E]">
                        Recent Bookings
                      </span>
                      <button
                        onClick={() => setActiveTab('bookings')}
                        className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4"
                      >
                        View All
                      </button>
                    </div>

                    {bookings.length === 0 ? (
                      <p className="text-sm text-[#5D5A53] font-light">
                        No past or upcoming bookings yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {bookings.slice(0, 3).map((bk) => (
                          <div
                            key={bk.id}
                            className="p-6 bg-white/60 border border-[#D6D1C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div>
                              <div className="flex items-center gap-2 text-xs text-[#A8A29E] uppercase tracking-widest mb-1">
                                <span>{bk.reference}</span>
                                <span aria-hidden="true">·</span>
                                <span>{bk.status}</span>
                              </div>
                              <h3 className="font-serif text-xl text-[#2C2A26]">
                                {bk.serviceName}
                              </h3>
                              <p className="text-xs text-[#5D5A53] mt-1 tabular-nums">
                                {formatHumanDate(bk.appointmentDate)} at {bk.startTime}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setSelectedBookingDetail(bk)}
                                className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4"
                              >
                                View appointment
                              </button>
                              <button
                                onClick={() => {
                                  const srv = services.find((s) => s.id === bk.serviceId);
                                  onBookAgain(srv);
                                }}
                                className="px-4 py-2 border border-[#D6D1C7] text-xs uppercase tracking-widest text-[#2C2A26] hover:border-[#2C2A26]"
                              >
                                Book again
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Client Profile Summary */}
                <div className="lg:col-span-5">
                  <div className="bg-[#EBE7DE] p-8 md:p-10 border border-[#D6D1C7] space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#5D5A53]">
                        Client Profile
                      </span>
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4"
                      >
                        Edit Profile
                      </button>
                    </div>
                    <div className="space-y-4 text-sm">
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                          Name
                        </span>
                        <span className="text-[#2C2A26] font-medium">{user.name}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                          Email
                        </span>
                        <span className="text-[#2C2A26]">{user.email}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                          Phone
                        </span>
                        <span className="text-[#2C2A26]">{user.phone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="block text-xs uppercase tracking-widest text-[#A8A29E]">
                          Hair Texture & Ritual Notes
                        </span>
                        <p className="text-[#5D5A53] font-light mt-1">
                          {user.hairTextureNotes ||
                            'No texture preferences saved yet. Add your curl pattern or scalp preferences in Profile settings.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* BOOKINGS TAB */}
            {activeTab === 'bookings' && (
              <div className="space-y-6">
                {bookings.length === 0 ? (
                  <div className="p-12 bg-white/60 border border-[#D6D1C7] text-center space-y-4">
                    <p className="font-serif text-2xl text-[#2C2A26]">
                      No upcoming appointments.
                    </p>
                    <button
                      onClick={() => onBookAgain()}
                      className="px-8 py-4 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                    >
                      Book an Appointment
                    </button>
                  </div>
                ) : (
                  bookings.map((bk) => {
                    const matchingEmail = emailLogs.find((e) => e.bookingId === bk.id);
                    return (
                      <div
                        key={bk.id}
                        className="p-8 bg-white/80 border border-[#D6D1C7] flex flex-col md:flex-row md:items-center justify-between gap-6"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#A8A29E]">
                            <span>Ref: {bk.reference}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#2C2A26] font-medium">{bk.status}</span>
                          </div>
                          <h3 className="text-2xl font-serif text-[#2C2A26]">
                            {bk.serviceName}
                          </h3>
                          <p className="text-sm text-[#5D5A53] tabular-nums">
                            {formatHumanDate(bk.appointmentDate)} · {bk.startTime} – {bk.endTime} (
                            {bk.duration})
                          </p>
                          {bk.notes && (
                            <p className="text-xs text-[#5D5A53] font-light italic">
                              “{bk.notes}”
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                          <button
                            onClick={() => setSelectedBookingDetail(bk)}
                            className="px-5 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#433E38] transition-colors"
                          >
                            View appointment
                          </button>
                          {matchingEmail && (
                            <button
                              onClick={() => setSelectedEmailPreview(matchingEmail)}
                              className="px-5 py-3 border border-[#D6D1C7] text-[#2C2A26] text-xs uppercase tracking-widest hover:border-[#2C2A26] transition-colors"
                            >
                              Confirmation Email
                            </button>
                          )}
                          {bk.status !== 'Cancelled' && bk.status !== 'Completed' && (
                            <>
                              <button
                                onClick={() => onRescheduleBooking(bk)}
                                className="px-5 py-3 border border-[#2C2A26] text-[#2C2A26] text-xs uppercase tracking-widest hover:bg-[#EBE7DE] transition-colors"
                              >
                                Reschedule
                              </button>
                              <button
                                onClick={() => handleCancelAppointment(bk.id)}
                                className="px-4 py-3 text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26] underline underline-offset-4"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="max-w-xl bg-white/80 border border-[#D6D1C7] p-8 md:p-12">
                <h2 className="text-2xl font-serif text-[#2C2A26] mb-6">
                  Personal Details & Hair Profile
                </h2>
                {profileStatus && (
                  <div className="mb-6 p-4 bg-[#EBE7DE] border border-[#2C2A26] text-sm text-[#2C2A26]">
                    {profileStatus}
                  </div>
                )}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full bg-transparent border-b border-[#D6D1C7] py-3 text-[#2C2A26] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                      Hair Texture & Ritual Preferences
                    </label>
                    <textarea
                      rows={4}
                      value={profileNotes}
                      onChange={(e) => setProfileNotes(e.target.value)}
                      placeholder="Share your curl pattern, scalp sensitivities, or preferred tea at the basin..."
                      className="w-full bg-[#F5F2EB] border border-[#D6D1C7] p-3 text-sm text-[#2C2A26] outline-none focus:border-[#2C2A26]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-8 py-4 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest hover:bg-[#433E38] transition-colors"
                  >
                    Save Profile
                  </button>
                </form>
              </div>
            )}
          </>
        )}

        {/* APPOINTMENT DETAIL MODAL */}
        {selectedBookingDetail && (
          <div className="fixed inset-0 z-50 bg-[#2C2A26]/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#F5F2EB] border border-[#D6D1C7] max-w-xl w-full p-8 md:p-10 shadow-2xl space-y-6">
              <div className="flex justify-between items-start border-b border-[#D6D1C7] pb-6">
                <div>
                  <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                    Appointment Dossier · {selectedBookingDetail.reference}
                  </span>
                  <h3 className="text-3xl font-serif text-[#2C2A26] mt-1">
                    {selectedBookingDetail.serviceName}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBookingDetail(null)}
                  className="text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26]"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#5D5A53]">Status</span>
                  <span className="font-medium text-[#2C2A26]">
                    {selectedBookingDetail.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D5A53]">Date</span>
                  <span className="text-[#2C2A26]">
                    {formatHumanDate(selectedBookingDetail.appointmentDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D5A53]">Time</span>
                  <span className="text-[#2C2A26] tabular-nums">
                    {selectedBookingDetail.startTime} – {selectedBookingDetail.endTime} (
                    {selectedBookingDetail.duration})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D5A53]">Location</span>
                  <span className="text-[#2C2A26]">
                    {DEFAULT_BUSINESS_SETTINGS.address}, {DEFAULT_BUSINESS_SETTINGS.city}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5D5A53]">Investment</span>
                  <span className="font-serif text-lg text-[#2C2A26] tabular-nums">
                    ${selectedBookingDetail.price}
                  </span>
                </div>
                {selectedBookingDetail.notes && (
                  <div className="pt-4 border-t border-[#D6D1C7]">
                    <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                      Notes
                    </span>
                    <p className="text-[#5D5A53] font-light">{selectedBookingDetail.notes}</p>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-[#D6D1C7] flex flex-wrap justify-between gap-4">
                {selectedBookingDetail.status !== 'Cancelled' &&
                  selectedBookingDetail.status !== 'Completed' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          const bk = selectedBookingDetail;
                          setSelectedBookingDetail(null);
                          onRescheduleBooking(bk);
                        }}
                        className="px-5 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => handleCancelAppointment(selectedBookingDetail.id)}
                        className="px-5 py-3 border border-[#D6D1C7] text-xs uppercase tracking-widest text-[#2C2A26]"
                      >
                        Cancel Appointment
                      </button>
                    </div>
                  )}
                <button
                  onClick={() => setSelectedBookingDetail(null)}
                  className="px-5 py-3 text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONFIRMATION EMAIL PREVIEW MODAL */}
        {selectedEmailPreview && (
          <div className="fixed inset-0 z-50 bg-[#2C2A26]/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#F5F2EB] border border-[#D6D1C7] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl">
              <div className="flex justify-between items-center pb-4 mb-6 border-b border-[#D6D1C7]">
                <div>
                  <span className="block text-[11px] uppercase tracking-widest text-[#A8A29E]">
                    {selectedEmailPreview.provider}
                  </span>
                  <h3 className="font-serif text-xl text-[#2C2A26]">
                    {selectedEmailPreview.subject}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedEmailPreview(null)}
                  className="text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26]"
                >
                  Close
                </button>
              </div>
              <div dangerouslySetInnerHTML={{ __html: selectedEmailPreview.htmlPreview }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountView;
