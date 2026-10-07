/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Booking,
  BookingStatus,
  UserProfile,
  Product,
  DayAvailability,
  BusinessSettings,
  EmailLog,
  ServiceCategory
} from '../types';
import {
  fetchDashboardOverview,
  updateDashboardBookingStatus,
  retryBookingConfirmationEmail,
  createSalonService,
  updateSalonService,
  updateSalonAvailability,
  updateSalonSettings
} from '../services/salonApi';
import { BRAND_NAME } from '../constants';

interface DashboardViewProps {
  user: UserProfile;
  initialSection?: 'overview' | 'bookings' | 'customers' | 'services' | 'availability' | 'emails' | 'settings';
  onBackToSite: () => void;
  onLogout: () => void;
  onServicesChanged?: (services: Product[]) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  initialSection = 'overview',
  onBackToSite,
  onLogout,
  onServicesChanged
}) => {
  const [section, setSection] = useState<
    'overview' | 'bookings' | 'customers' | 'services' | 'availability' | 'emails' | 'settings'
  >(initialSection);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [metrics, setMetrics] = useState({
    todaysAppointmentsCount: 0,
    upcomingBookingsCount: 0,
    totalCustomersCount: 0,
    availableSlotsCount: 0,
    totalRevenueConfirmed: 0
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<Product[]>([]);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);

  // Filters & Modals
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedEmailLog, setSelectedEmailLog] = useState<EmailLog | null>(null);

  // New Service Form
  const [newServiceName, setNewServiceName] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState<ServiceCategory>('Cut & Styling');
  const [newServicePrice, setNewServicePrice] = useState('180');
  const [newServiceDuration, setNewServiceDuration] = useState('1h 30m');
  const [newServiceDesc, setNewServiceDesc] = useState('');

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardOverview();
      setMetrics(data.metrics);
      setBookings(data.bookings);
      setCustomers(data.customers);
      setServices(data.services);
      setAvailability(data.availability);
      setSettings(data.settings);
      setEmailLogs(data.emailLogs || []);
      if (onServicesChanged) {
        onServicesChanged(data.services.filter((s) => s.active !== false));
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load salon management data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      const res = await updateDashboardBookingStatus(bookingId, newStatus);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.booking : b)));
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(res.booking);
      }
      showToastMsg(`Booking ${res.booking.reference} marked as ${newStatus}.`);
      loadDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to update status.');
    }
  };

  const handleRetryEmail = async (bookingId: string) => {
    try {
      const res = await retryBookingConfirmationEmail(bookingId);
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? res.booking : b)));
      setEmailLogs((prev) => [res.emailLog, ...prev]);
      if (selectedBooking?.id === bookingId) {
        setSelectedBooking(res.booking);
      }
      showToastMsg(`Confirmation email dispatched to ${res.booking.customerEmail}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    try {
      await createSalonService({
        name: newServiceName.trim(),
        category: newServiceCategory,
        price: Number(newServicePrice),
        duration: newServiceDuration,
        description:
          newServiceDesc.trim() ||
          'Bespoke hair ritual tailored to your natural texture and crown architecture.'
      });
      setNewServiceName('');
      setNewServiceDesc('');
      showToastMsg('New service added to the collection.');
      loadDashboard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleServiceActive = async (srv: Product) => {
    try {
      await updateSalonService(srv.id, { active: srv.active === false });
      showToastMsg(`Updated ${srv.name}.`);
      loadDashboard();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveAvailability = async () => {
    try {
      const res = await updateSalonAvailability(availability);
      setAvailability(res.availability);
      showToastMsg('Salon availability schedule saved.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      const res = await updateSalonSettings(settings);
      setSettings(res.settings);
      showToastMsg('Atelier settings updated.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const formatHumanDate = (iso: string) => {
    try {
      const [y, m, d] = iso.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return iso;
    }
  };

  const filteredBookings =
    statusFilter === 'All'
      ? bookings
      : bookings.filter((b) => b.status === statusFilter);

  return (
    <div className="min-h-screen bg-[#F5F2EB] text-[#2C2A26] flex flex-col lg:flex-row">
      {/* Left Sidebar Navigation */}
      <aside className="w-full lg:w-72 bg-[#2C2A26] text-[#F5F2EB] p-8 flex flex-col justify-between shrink-0">
        <div>
          <div className="pb-8 mb-8 border-b border-[#F5F2EB]/15">
            <span className="block text-[10px] uppercase tracking-[0.25em] text-[#A8A29E] mb-2">
              Owner Management Suite
            </span>
            <h1 className="text-2xl font-serif text-[#F5F2EB]">{BRAND_NAME}</h1>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'overview', label: 'Overview & Activity' },
              { id: 'bookings', label: `Reservations (${bookings.length})` },
              { id: 'customers', label: `Clients (${customers.length})` },
              { id: 'services', label: `Services (${services.length})` },
              { id: 'availability', label: 'Availability & Hours' },
              { id: 'emails', label: `LevelUp Emails (${emailLogs.length})` },
              { id: 'settings', label: 'Atelier Settings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id as any)}
                className={`w-full text-left px-4 py-3 text-xs uppercase tracking-widest transition-colors ${
                  section === item.id
                    ? 'bg-[#F5F2EB] text-[#2C2A26] font-medium'
                    : 'text-[#A8A29E] hover:text-[#F5F2EB]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="pt-8 mt-12 border-t border-[#F5F2EB]/15 space-y-4">
          <div className="text-xs text-[#A8A29E]">
            <p className="text-[#F5F2EB] font-medium">{user.name}</p>
            <p className="truncate">{user.email}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={onBackToSite}
              className="w-full py-2.5 border border-[#F5F2EB]/30 text-xs uppercase tracking-widest text-[#F5F2EB] hover:bg-[#F5F2EB]/10 transition-colors"
            >
              View Public Website
            </button>
            <button
              onClick={onLogout}
              className="w-full py-2 text-xs uppercase tracking-widest text-[#A8A29E] hover:text-[#F5F2EB] text-left"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {toast && (
            <div className="mb-6 p-4 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest flex justify-between items-center">
              <span>{toast}</span>
              <button onClick={() => setToast(null)}>Dismiss</button>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 border border-[#2C2A26] bg-[#EBE7DE] text-sm text-[#2C2A26] flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={loadDashboard}
                className="text-xs uppercase tracking-widest underline"
              >
                Reload
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-24 text-center text-sm text-[#5D5A53]">
              Loading real-time salon telemetry...
            </div>
          ) : (
            <>
              {/* ===============================================================
                 SECTION 1: OVERVIEW
                 =============================================================== */}
              {section === 'overview' && (
                <div className="space-y-12">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#D6D1C7] pb-6 gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                        Live Operations
                      </span>
                      <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                        Atelier Overview
                      </h2>
                    </div>
                    <button
                      onClick={loadDashboard}
                      className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4 self-start sm:self-auto"
                    >
                      Refresh Data
                    </button>
                  </div>

                  {/* Real Database Metric Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white/80 border border-[#D6D1C7] p-6">
                      <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-3">
                        Today’s appointments
                      </span>
                      <span className="text-4xl font-serif text-[#2C2A26] tabular-nums">
                        {metrics.todaysAppointmentsCount}
                      </span>
                    </div>

                    <div className="bg-white/80 border border-[#D6D1C7] p-6">
                      <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-3">
                        Upcoming bookings
                      </span>
                      <span className="text-4xl font-serif text-[#2C2A26] tabular-nums">
                        {metrics.upcomingBookingsCount}
                      </span>
                    </div>

                    <div className="bg-white/80 border border-[#D6D1C7] p-6">
                      <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-3">
                        Registered clients
                      </span>
                      <span className="text-4xl font-serif text-[#2C2A26] tabular-nums">
                        {metrics.totalCustomersCount}
                      </span>
                    </div>

                    <div className="bg-white/80 border border-[#D6D1C7] p-6">
                      <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-3">
                        Available slots today
                      </span>
                      <span className="text-4xl font-serif text-[#2C2A26] tabular-nums">
                        {metrics.availableSlotsCount}
                      </span>
                    </div>
                  </div>

                  {/* Recent Reservations Table */}
                  <div className="bg-white/80 border border-[#D6D1C7] p-8">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-serif text-[#2C2A26]">
                        Upcoming & Recent Reservations
                      </h3>
                      <button
                        onClick={() => setSection('bookings')}
                        className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4"
                      >
                        Manage All ({bookings.length})
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-[#D6D1C7] text-xs uppercase tracking-widest text-[#A8A29E]">
                            <th className="py-3 pr-4 font-normal">Reference</th>
                            <th className="py-3 px-4 font-normal">Client</th>
                            <th className="py-3 px-4 font-normal">Service</th>
                            <th className="py-3 px-4 font-normal">Date & Time</th>
                            <th className="py-3 px-4 font-normal">Status</th>
                            <th className="py-3 pl-4 font-normal text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EBE7DE]">
                          {bookings.slice(0, 6).map((bk) => (
                            <tr key={bk.id} className="hover:bg-[#F5F2EB]/50">
                              <td className="py-4 pr-4 font-mono text-xs text-[#5D5A53]">
                                {bk.reference}
                              </td>
                              <td className="py-4 px-4">
                                <p className="font-medium text-[#2C2A26]">{bk.customerName}</p>
                                <p className="text-xs text-[#A8A29E]">{bk.customerEmail}</p>
                              </td>
                              <td className="py-4 px-4">
                                <p className="text-[#2C2A26]">{bk.serviceName}</p>
                                <p className="text-xs text-[#A8A29E] tabular-nums">
                                  ${bk.price} · {bk.duration}
                                </p>
                              </td>
                              <td className="py-4 px-4 tabular-nums">
                                <p className="text-[#2C2A26]">
                                  {formatHumanDate(bk.appointmentDate)}
                                </p>
                                <p className="text-xs text-[#5D5A53]">{bk.startTime}</p>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-xs uppercase tracking-widest text-[#2C2A26] font-medium">
                                  {bk.status}
                                </span>
                              </td>
                              <td className="py-4 pl-4 text-right">
                                <button
                                  onClick={() => setSelectedBooking(bk)}
                                  className="text-xs uppercase tracking-widest text-[#2C2A26] underline underline-offset-4"
                                >
                                  Open Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ===============================================================
                 SECTION 2: BOOKINGS MANAGEMENT
                 =============================================================== */}
              {section === 'bookings' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#D6D1C7] pb-6 gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                        Reservation Ledger
                      </span>
                      <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                        Manage Bookings
                      </h2>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((st) => (
                        <button
                          key={st}
                          onClick={() => setStatusFilter(st)}
                          className={`px-4 py-2 text-xs uppercase tracking-widest border transition-colors ${
                            statusFilter === st
                              ? 'border-[#2C2A26] bg-[#2C2A26] text-[#F5F2EB]'
                              : 'border-[#D6D1C7] text-[#5D5A53] hover:border-[#2C2A26]'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="p-12 bg-white/70 border border-[#D6D1C7] text-center text-sm text-[#5D5A53]">
                      No bookings match the selected status filter.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredBookings.map((bk) => (
                        <div
                          key={bk.id}
                          className="p-6 bg-white/80 border border-[#D6D1C7] flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#A8A29E]">
                              <span className="font-mono">{bk.reference}</span>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#2C2A26] font-semibold">{bk.status}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                Email: {bk.emailSent ? 'Confirmed Sent' : 'Pending Retry'}
                              </span>
                            </div>
                            <h3 className="text-2xl font-serif text-[#2C2A26]">
                              {bk.serviceName} — {bk.customerName}
                            </h3>
                            <p className="text-sm text-[#5D5A53] tabular-nums">
                              {formatHumanDate(bk.appointmentDate)} · {bk.startTime} –{' '}
                              {bk.endTime} · ${bk.price}
                            </p>
                            <p className="text-xs text-[#A8A29E]">
                              {bk.customerEmail} {bk.customerPhone ? `· ${bk.customerPhone}` : ''}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <select
                              aria-label="Update Booking Status"
                              value={bk.status}
                              onChange={(e) =>
                                handleStatusChange(bk.id, e.target.value as BookingStatus)
                              }
                              className="bg-[#F5F2EB] border border-[#D6D1C7] px-3 py-2 text-xs uppercase tracking-widest text-[#2C2A26] outline-none focus:border-[#2C2A26]"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Completed">Completed</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>

                            <button
                              onClick={() => setSelectedBooking(bk)}
                              className="px-4 py-2 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                            >
                              Details
                            </button>

                            <button
                              onClick={() => handleRetryEmail(bk.id)}
                              className="px-4 py-2 border border-[#D6D1C7] text-xs uppercase tracking-widest text-[#2C2A26] hover:border-[#2C2A26]"
                            >
                              Resend Email
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ===============================================================
                 SECTION 3: CUSTOMERS
                 =============================================================== */}
              {section === 'customers' && (
                <div className="space-y-8">
                  <div className="border-b border-[#D6D1C7] pb-6">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                      Client Directory
                    </span>
                    <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                      Registered Clients
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {customers.map((c) => {
                      const clientBookings = bookings.filter(
                        (b) =>
                          b.customerId === c.id ||
                          b.customerEmail.toLowerCase() === c.email.toLowerCase()
                      );
                      return (
                        <div
                          key={c.id}
                          className="p-6 bg-white/80 border border-[#D6D1C7] space-y-4"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="text-xl font-serif text-[#2C2A26]">{c.name}</h3>
                              <p className="text-xs text-[#5D5A53]">{c.email}</p>
                              {c.phone && <p className="text-xs text-[#A8A29E]">{c.phone}</p>}
                            </div>
                            <span className="text-xs uppercase tracking-widest text-[#5D5A53] tabular-nums">
                              {clientBookings.length} Appointments
                            </span>
                          </div>
                          {c.hairTextureNotes && (
                            <div className="p-3 bg-[#F5F2EB] border border-[#EBE7DE] text-xs text-[#5D5A53]">
                              <span className=" uppercase tracking-widest text-[10px] text-[#A8A29E] block mb-1">
                                Texture & Ritual Notes
                              </span>
                              {c.hairTextureNotes}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===============================================================
                 SECTION 4: SERVICES MANAGEMENT
                 =============================================================== */}
              {section === 'services' && (
                <div className="space-y-12">
                  <div className="border-b border-[#D6D1C7] pb-6">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                      Catalog Architecture
                    </span>
                    <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                      Manage Services
                    </h2>
                  </div>

                  {/* Add Service Form */}
                  <form
                    onSubmit={handleCreateService}
                    className="p-8 bg-white/80 border border-[#D6D1C7] space-y-6"
                  >
                    <h3 className="text-xl font-serif text-[#2C2A26]">
                      Add New Atelier Service
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <input
                        type="text"
                        required
                        placeholder="Service Name (e.g. Botanical Gloss)"
                        value={newServiceName}
                        onChange={(e) => setNewServiceName(e.target.value)}
                        className="bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none"
                      />
                      <select
                        value={newServiceCategory}
                        onChange={(e) =>
                          setNewServiceCategory(e.target.value as ServiceCategory)
                        }
                        className="bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none"
                      >
                        <option value="Cut & Styling">Cut & Styling</option>
                        <option value="Braids & Protective">Braids & Protective</option>
                        <option value="Color & Extensions">Color & Extensions</option>
                        <option value="Rituals & Bridal">Rituals & Bridal</option>
                      </select>
                      <input
                        type="number"
                        required
                        placeholder="Price USD"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        className="bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Duration (e.g. 1h 30m)"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none"
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Short editorial description..."
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] outline-none"
                    />
                    <button
                      type="submit"
                      className="px-8 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                    >
                      Add Service to Collection
                    </button>
                  </form>

                  {/* Existing Services List */}
                  <div className="space-y-4">
                    {services.map((srv) => (
                      <div
                        key={srv.id}
                        className="p-6 bg-white/80 border border-[#D6D1C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A8A29E]">
                            <span>{srv.category}</span>
                            <span aria-hidden="true">·</span>
                            <span className="tabular-nums">{srv.duration}</span>
                            <span aria-hidden="true">·</span>
                            <span>{srv.active !== false ? 'Active' : 'Archived'}</span>
                          </div>
                          <h4 className="text-xl font-serif text-[#2C2A26] mt-1">{srv.name}</h4>
                          <p className="text-sm text-[#5D5A53] font-light">{srv.description}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <span className="font-serif text-xl text-[#2C2A26] tabular-nums">
                            ${srv.price}
                          </span>
                          <button
                            onClick={() => handleToggleServiceActive(srv)}
                            className="px-4 py-2 border border-[#D6D1C7] text-xs uppercase tracking-widest text-[#2C2A26] hover:border-[#2C2A26]"
                          >
                            {srv.active !== false ? 'Pause' : 'Activate'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===============================================================
                 SECTION 5: AVAILABILITY MANAGEMENT
                 =============================================================== */}
              {section === 'availability' && (
                <div className="space-y-8">
                  <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#D6D1C7] pb-6 gap-4">
                    <div>
                      <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                        Sanctuary Schedule
                      </span>
                      <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                        Manage Availability
                      </h2>
                    </div>
                    <button
                      onClick={handleSaveAvailability}
                      className="px-8 py-3 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                    >
                      Save Weekly Schedule
                    </button>
                  </div>

                  <div className="space-y-4">
                    {availability.map((day, idx) => (
                      <div
                        key={day.dayOfWeek}
                        className="p-6 bg-white/80 border border-[#D6D1C7] flex flex-col md:flex-row md:items-center justify-between gap-6"
                      >
                        <div className="flex items-center gap-4 w-48">
                          <input
                            type="checkbox"
                            checked={day.isOpen}
                            onChange={(e) => {
                              const next = [...availability];
                              next[idx] = { ...day, isOpen: e.target.checked };
                              setAvailability(next);
                            }}
                            className="accent-[#2C2A26]"
                          />
                          <span className="font-serif text-xl text-[#2C2A26]">
                            {day.dayName}
                          </span>
                        </div>

                        {day.isOpen ? (
                          <div className="flex-1">
                            <label className="block text-[11px] uppercase tracking-widest text-[#A8A29E] mb-1">
                              Bookable Slots (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={day.slots.join(', ')}
                              onChange={(e) => {
                                const slots = e.target.value
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                const next = [...availability];
                                next[idx] = { ...day, slots };
                                setAvailability(next);
                              }}
                              className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-2 text-sm text-[#2C2A26]"
                            />
                          </div>
                        ) : (
                          <span className="text-xs uppercase tracking-widest text-[#A8A29E]">
                            Sanctuary Closed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===============================================================
                 SECTION 6: LEVELUP EMAILS LOG
                 =============================================================== */}
              {section === 'emails' && (
                <div className="space-y-8">
                  <div className="border-b border-[#D6D1C7] pb-6">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                      LevelUp Email Abstraction Layer · Resend
                    </span>
                    <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                      Confirmation Emails
                    </h2>
                  </div>

                  <div className="space-y-4">
                    {emailLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-6 bg-white/80 border border-[#D6D1C7] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-[#A8A29E]">
                            <span>Ref: {log.reference}</span>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#2C2A26] font-medium">{log.status}</span>
                          </div>
                          <h3 className="text-lg font-serif text-[#2C2A26] mt-1">
                            To: {log.to} — “{log.subject}”
                          </h3>
                          <p className="text-xs text-[#5D5A53] mt-0.5">{log.provider}</p>
                        </div>
                        <button
                          onClick={() => setSelectedEmailLog(log)}
                          className="px-5 py-2.5 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest self-start sm:self-auto"
                        >
                          Preview Email
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ===============================================================
                 SECTION 7: ATELIER SETTINGS
                 =============================================================== */}
              {section === 'settings' && settings && (
                <div className="space-y-8">
                  <div className="border-b border-[#D6D1C7] pb-6">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#A8A29E]">
                      Configuration
                    </span>
                    <h2 className="text-3xl md:text-5xl font-serif text-[#2C2A26] mt-1">
                      Atelier & LevelUp API Settings
                    </h2>
                  </div>

                  <form
                    onSubmit={handleSaveSettings}
                    className="max-w-2xl bg-white/80 border border-[#D6D1C7] p-8 space-y-6"
                  >
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        Salon Name
                      </label>
                      <input
                        type="text"
                        value={settings.salonName}
                        onChange={(e) =>
                          setSettings({ ...settings, salonName: e.target.value })
                        }
                        className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        Address
                      </label>
                      <input
                        type="text"
                        value={settings.address}
                        onChange={(e) =>
                          setSettings({ ...settings, address: e.target.value })
                        }
                        className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        Hours Summary
                      </label>
                      <input
                        type="text"
                        value={settings.hoursSummary}
                        onChange={(e) =>
                          setSettings({ ...settings, hoursSummary: e.target.value })
                        }
                        className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-widest text-[#5D5A53] mb-2">
                        LevelUp Email API Endpoint
                      </label>
                      <input
                        type="text"
                        value={settings.levelUpApiUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, levelUpApiUrl: e.target.value })
                        }
                        className="w-full bg-[#F5F2EB] border border-[#D6D1C7] px-4 py-3 text-sm text-[#2C2A26] font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-8 py-4 bg-[#2C2A26] text-[#F5F2EB] text-xs uppercase tracking-widest"
                    >
                      Save Configuration
                    </button>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* BOOKING DETAIL MODAL */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-[#2C2A26]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F5F2EB] border border-[#D6D1C7] max-w-xl w-full p-8 shadow-2xl space-y-6">
            <div className="flex justify-between items-start border-b border-[#D6D1C7] pb-4">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#A8A29E] font-mono">
                  {selectedBooking.reference}
                </span>
                <h3 className="text-2xl font-serif text-[#2C2A26] mt-1">
                  {selectedBooking.serviceName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26]"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5D5A53]">Client</span>
                <span className="font-medium text-[#2C2A26]">
                  {selectedBooking.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5D5A53]">Email</span>
                <span className="text-[#2C2A26]">{selectedBooking.customerEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5D5A53]">Phone</span>
                <span className="text-[#2C2A26]">
                  {selectedBooking.customerPhone || 'Not provided'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5D5A53]">Date & Time</span>
                <span className="text-[#2C2A26] tabular-nums">
                  {formatHumanDate(selectedBooking.appointmentDate)} ·{' '}
                  {selectedBooking.startTime} – {selectedBooking.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5D5A53]">Status</span>
                <span className="font-semibold text-[#2C2A26]">
                  {selectedBooking.status}
                </span>
              </div>
              {selectedBooking.notes && (
                <div className="pt-3 border-t border-[#D6D1C7]">
                  <span className="block text-xs uppercase tracking-widest text-[#A8A29E] mb-1">
                    Client Notes
                  </span>
                  <p className="text-[#5D5A53] font-light">{selectedBooking.notes}</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-[#D6D1C7] flex flex-wrap justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {(['Pending', 'Confirmed', 'Completed', 'Cancelled'] as BookingStatus[]).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedBooking.id, st)}
                      className={`px-3 py-2 text-xs uppercase tracking-widest border ${
                        selectedBooking.status === st
                          ? 'bg-[#2C2A26] text-[#F5F2EB] border-[#2C2A26]'
                          : 'border-[#D6D1C7] text-[#2C2A26]'
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => handleRetryEmail(selectedBooking.id)}
                className="px-4 py-2 border border-[#2C2A26] text-xs uppercase tracking-widest text-[#2C2A26]"
              >
                Resend Confirmation Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL PREVIEW MODAL */}
      {selectedEmailLog && (
        <div className="fixed inset-0 z-50 bg-[#2C2A26]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#F5F2EB] border border-[#D6D1C7] max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 shadow-2xl">
            <div className="flex justify-between items-center pb-4 mb-6 border-b border-[#D6D1C7]">
              <div>
                <span className="block text-[11px] uppercase tracking-widest text-[#A8A29E]">
                  {selectedEmailLog.provider}
                </span>
                <h3 className="font-serif text-xl text-[#2C2A26]">
                  {selectedEmailLog.subject}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEmailLog(null)}
                className="text-xs uppercase tracking-widest text-[#5D5A53] hover:text-[#2C2A26]"
              >
                Close
              </button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: selectedEmailLog.htmlPreview }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardView;
