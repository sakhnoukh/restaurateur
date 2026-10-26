"use client";

import { useState, useEffect } from "react";
import { X, UserPlus, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { api, type Customer, type TableAvailability } from "@/lib/api";
import { TierBadge } from "@/components/Badges";

interface CreateReservationModalProps {
  onClose: () => void;
  onCreated: () => void;
  defaultDate?: string;
  defaultTime?: string;
  defaultTableNumber?: number | null;
}

export function CreateReservationModal({
  onClose,
  onCreated,
  defaultDate,
  defaultTime,
  defaultTableNumber,
}: CreateReservationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const [date, setDate] = useState(defaultDate || new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState(defaultTime || "19:00");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [pax, setPax] = useState(2);
  const [tableNumber, setTableNumber] = useState(
    defaultTableNumber ? String(defaultTableNumber) : ""
  );
  const [notes, setNotes] = useState("");
  const [availableTables, setAvailableTables] = useState<TableAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const trimmed = phoneNumber.trim();
    if (trimmed.length < 6) {
      setMatchedCustomer(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLookingUp(true);
      try {
        const customer = await api.lookupCustomerByPhone(trimmed);
        setMatchedCustomer(customer);
        if (customer) {
          if (customer.name && customer.name !== "Unknown") {
            setName(customer.name);
          }
          if (customer.preferred_pax) {
            setPax(customer.preferred_pax);
          }
        }
      } catch {
        setMatchedCustomer(null);
      } finally {
        setLookingUp(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [phoneNumber]);

  useEffect(() => {
    if (!date || !time) return;
    const formattedTime = time.length === 5 ? `${time}:00` : time;
    api
      .getTablesAvailability({ date, time: formattedTime, pax })
      .then((tables) => setAvailableTables(tables))
      .catch(() => setAvailableTables([]));
  }, [date, time, pax]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createReservation({
        phone_number: phoneNumber.trim(),
        name: name.trim() || "Unknown",
        date,
        time: time.length === 5 ? `${time}:00` : time,
        duration_minutes: durationMinutes,
        pax,
        table_number: tableNumber ? parseInt(tableNumber, 10) : null,
        notes: notes.trim() || null,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-500" />
            New Reservation
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
              {lookingUp && <span className="text-xs text-gray-400">Checking CRM...</span>}
            </div>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+201001234567"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>

          {matchedCustomer && (
            <div className="rounded-lg border border-brand-200 bg-brand-50/50 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  Returning Guest: {matchedCustomer.name}
                </span>
                <TierBadge tier={matchedCustomer.loyalty_tier} />
              </div>
              <div className="text-gray-600 flex items-center gap-3">
                <span>{matchedCustomer.total_visits} visits</span>
                <span>·</span>
                <span>{matchedCustomer.lifetime_spend.toLocaleString()} EGP spend</span>
                {matchedCustomer.no_show_count > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 font-medium inline-flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {matchedCustomer.no_show_count} no-shows
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Auto-filled if existing customer"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              >
                <option value={60}>1h 00m</option>
                <option value={90}>1h 30m</option>
                <option value={120}>2h 00m</option>
                <option value={150}>2h 30m</option>
                <option value={180}>3h 00m</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Party Size *</label>
              <input
                type="number"
                required
                min={1}
                value={pax}
                onChange={(e) => setPax(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
              {availableTables.length > 0 ? (
                <select
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                >
                  <option value="">Unassigned</option>
                  {availableTables.map((t) => (
                    <option
                      key={t.id}
                      value={String(t.table_number)}
                      disabled={!t.is_available}
                    >
                      Table {t.table_number} ({t.capacity}p · {t.section})
                      {!t.is_available
                        ? t.capacity < pax
                          ? " [Too small]"
                          : " [Booked]"
                        : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special requests, seating preference, allergies..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
