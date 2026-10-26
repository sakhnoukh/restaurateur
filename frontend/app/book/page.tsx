"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Globe,
  Calendar,
  Users,
  Clock,
  CheckCircle2,
  Sparkles,
  Webhook,
  Loader2,
} from "lucide-react";
import { api, type TimeSlotAvailability, type Reservation } from "@/lib/api";

export default function OnlineBookingPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(todayStr);
  const [pax, setPax] = useState(2);
  const [section, setSection] = useState("Any");
  const [slots, setSlots] = useState<TimeSlotAvailability[]>([]);
  const [selectedTime, setSelectedTime] = useState("19:00");
  const [loadingSlots, setLoadingSlots] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [occasion, setOccasion] = useState("");
  const [dietary, setDietary] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState("");

  // OTA / GDS Simulator state
  const [otaProvider, setOtaProvider] = useState("OpenTable");
  const [otaRef, setOtaRef] = useState("89402");
  const [otaGuestName, setOtaGuestName] = useState("Sherif Zaki");
  const [otaGuestPhone, setOtaGuestPhone] = useState("+201009998877");
  const [otaTime, setOtaTime] = useState("20:00");
  const [otaPax, setOtaPax] = useState(4);
  const [otaSending, setOtaSending] = useState(false);
  const [otaResult, setOtaResult] = useState<Reservation | null>(null);

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const data = await api.getBookingSlots({
        date,
        pax,
        section: section !== "Any" ? section : undefined,
      });
      setSlots(data);
    } catch (err) {
      console.error("Failed to load slots:", err);
    } finally {
      setLoadingSlots(false);
    }
  }, [date, pax, section]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleBookOnline = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await api.createPublicBooking({
        name: name.trim(),
        phone_number: phone.trim(),
        email: email.trim() || null,
        date,
        time: `${selectedTime}:00`,
        pax,
        section_preference: section !== "Any" ? section : null,
        occasion: occasion || null,
        dietary_notes: dietary.trim() || null,
        notes: notes.trim() || null,
      });
      setConfirmedReservation(res);
      loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateOTA = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtaSending(true);
    try {
      const res = await api.simulateOTAWebhook({
        provider: otaProvider,
        external_ref: otaRef,
        guest_name: otaGuestName,
        guest_phone: otaGuestPhone,
        date,
        time: `${otaTime}:00`,
        party_size: otaPax,
        occasion: "VIP Channel Booking",
      });
      setOtaResult(res);
      setOtaRef(String(Math.floor(10000 + Math.random() * 90000)));
      loadSlots();
    } catch (err) {
      alert(err instanceof Error ? err.message : "OTA Webhook failed");
    } finally {
      setOtaSending(false);
    }
  };

  const activeSlot = slots.find((s) => s.time === selectedTime);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Online Booking Widget & GDS/OTA Channel Sync
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Guest self-service reservation portal with automatic table assignment, dynamic rate rules, and external OTA webhook ingestion
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Guest Self-Service Widget */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full font-medium">
                  <Globe className="w-3.5 h-3.5" />
                  Live Guest Booking Widget
                </span>
                <h2 className="text-xl font-bold mt-2">Reserve Your Table at Restaurateur</h2>
                <p className="text-xs text-white/80 mt-0.5">
                  Instant confirmation · Real-time table availability · Personalized hospitality
                </p>
              </div>
            </div>
          </div>

          {confirmedReservation ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reservation Confirmed!</h3>
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                Thank you, <span className="font-semibold">{confirmedReservation.customer?.name}</span>.
                Your table for <span className="font-semibold">{confirmedReservation.pax} guests</span> is
                booked on <span className="font-semibold">{confirmedReservation.date}</span> at{" "}
                <span className="font-semibold">{confirmedReservation.time.slice(0, 5)}</span>
                {confirmedReservation.table_number
                  ? ` (Table ${confirmedReservation.table_number})`
                  : ""}.
              </p>
              {confirmedReservation.min_spend_required > 0 && (
                <div className="inline-block bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2 rounded-lg">
                  Minimum spend policy: {confirmedReservation.min_spend_required.toLocaleString()} EGP total
                  {confirmedReservation.deposit_amount > 0
                    ? ` · Deposit required: ${confirmedReservation.deposit_amount.toLocaleString()} EGP`
                    : ""}
                </div>
              )}
              <div>
                <button
                  onClick={() => {
                    setConfirmedReservation(null);
                    setName("");
                    setPhone("");
                  }}
                  className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
                >
                  Make Another Booking
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBookOnline} className="p-6 space-y-6">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
              )}

              {/* Step 1: Search Criteria */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    <Calendar className="w-3.5 h-3.5 inline mr-1" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    <Users className="w-3.5 h-3.5 inline mr-1" />
                    Party Size
                  </label>
                  <select
                    value={pax}
                    onChange={(e) => setPax(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? "Guest" : "Guests"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                    <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                    Seating Area
                  </label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="Any">Any Available Section</option>
                    <option value="Window">Window</option>
                    <option value="Main Dining">Main Dining</option>
                    <option value="Terrace">Terrace</option>
                    <option value="Private Room">Private Room</option>
                  </select>
                </div>
              </div>

              {/* Step 2: Live Time Slots */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">
                  <Clock className="w-3.5 h-3.5 inline mr-1" />
                  Select Available Time Slot
                </label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking live table inventory...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {slots.map((slot) => {
                      const disabled = slot.available_tables === 0;
                      const selected = selectedTime === slot.time;
                      return (
                        <button
                          type="button"
                          key={slot.time}
                          disabled={disabled}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            disabled
                              ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                              : selected
                              ? "bg-brand-500 border-brand-600 text-white shadow-sm"
                              : "bg-white border-gray-200 hover:border-brand-400 text-gray-900"
                          }`}
                        >
                          <div className="font-bold text-sm">{slot.time}</div>
                          <div
                            className={`text-[11px] ${
                              selected ? "text-white/90" : "text-gray-500"
                            }`}
                          >
                            {disabled
                              ? "Sold Out"
                              : `${slot.available_tables} tables left`}
                          </div>
                          {slot.min_spend_per_pax > 0 && !disabled && (
                            <div
                              className={`text-[10px] mt-0.5 font-medium ${
                                selected ? "text-amber-100" : "text-amber-700"
                              }`}
                            >
                              Min {slot.min_spend_per_pax} EGP/pax
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeSlot && activeSlot.min_spend_per_pax > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                  <strong>Rate Rule Notice:</strong> This time/section carries a minimum charge of{" "}
                  <strong>{activeSlot.min_spend_per_pax} EGP per guest</strong> (Total:{" "}
                  {(activeSlot.min_spend_per_pax * pax).toLocaleString()} EGP).
                </div>
              )}

              {/* Step 3: Guest Details & Experience */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Nour El-Din"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+201001234567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guest@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Special Occasion
                  </label>
                  <select
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">None</option>
                    <option value="Birthday">Birthday Celebration</option>
                    <option value="Anniversary">Anniversary</option>
                    <option value="Business Dinner">Business Dinner</option>
                    <option value="Date Night">Date Night</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Dietary Restrictions / Allergies
                  </label>
                  <input
                    type="text"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="e.g. Nut allergy, Gluten-free, Vegan"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Additional Requests
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="High chair, quiet table, cake service..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold text-sm hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Instant Reservation
              </button>
            </form>
          )}
        </div>

        {/* GDS / OTA Channel Webhook Simulator */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 h-fit">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Webhook className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">GDS / OTA Channel Webhook</h3>
              <p className="text-xs text-gray-500">
                Simulate incoming reservations from OpenTable, SevenRooms, Google Reserve, or Hotel Concierge GDS
              </p>
            </div>
          </div>

          <form onSubmit={handleSimulateOTA} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Channel Provider
              </label>
              <select
                value={otaProvider}
                onChange={(e) => setOtaProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="OpenTable">OpenTable</option>
                <option value="SevenRooms">SevenRooms</option>
                <option value="GoogleReserve">Google Reserve</option>
                <option value="HotelGDS">Hotel Concierge GDS</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  External Ref #
                </label>
                <input
                  type="text"
                  required
                  value={otaRef}
                  onChange={(e) => setOtaRef(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Time & Pax
                </label>
                <div className="flex gap-1">
                  <input
                    type="time"
                    value={otaTime}
                    onChange={(e) => setOtaTime(e.target.value)}
                    className="w-full px-2 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={otaPax}
                    onChange={(e) => setOtaPax(parseInt(e.target.value, 10) || 2)}
                    className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Guest Name
              </label>
              <input
                type="text"
                required
                value={otaGuestName}
                onChange={(e) => setOtaGuestName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Guest Phone
              </label>
              <input
                type="tel"
                required
                value={otaGuestPhone}
                onChange={(e) => setOtaGuestPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={otaSending}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {otaSending && <Loader2 className="w-4 h-4 animate-spin" />}
              Push OTA Webhook Booking
            </button>
          </form>

          {otaResult && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs space-y-1 text-indigo-900">
              <div className="font-semibold">
                Ingested: {otaResult.external_booking_ref}
              </div>
              <div>
                Assigned Table: {otaResult.table_number ?? "Waitlist"} ·{" "}
                {otaResult.time.slice(0, 5)} ({otaResult.pax} pax)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
