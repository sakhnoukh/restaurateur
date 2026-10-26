"use client";

import { useState, useEffect } from "react";
import { X, Pencil, Loader2 } from "lucide-react";
import { api, type Reservation, type ReservationStatus, type TableAvailability } from "@/lib/api";

interface EditReservationModalProps {
  reservation: Reservation;
  onClose: () => void;
  onUpdated: () => void;
}

const statusOptions: { value: ReservationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "expected", label: "Expected" },
  { value: "seated", label: "Seated" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-Show" },
];

export function EditReservationModal({ reservation, onClose, onUpdated }: EditReservationModalProps) {
  const [date, setDate] = useState(reservation.date);
  const [time, setTime] = useState(reservation.time.slice(0, 5));
  const [durationMinutes, setDurationMinutes] = useState(reservation.duration_minutes || 90);
  const [pax, setPax] = useState(reservation.pax);
  const [status, setStatus] = useState<ReservationStatus>(reservation.status);
  const [tableNumber, setTableNumber] = useState(
    reservation.table_number !== null ? String(reservation.table_number) : ""
  );
  const [notes, setNotes] = useState(reservation.notes || "");
  const [availableTables, setAvailableTables] = useState<TableAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!date || !time) return;
    const formattedTime = time.length === 5 ? `${time}:00` : time;
    api
      .getTablesAvailability({
        date,
        time: formattedTime,
        pax,
        exclude_reservation_id: reservation.id,
      })
      .then((tables) => setAvailableTables(tables))
      .catch(() => setAvailableTables([]));
  }, [date, time, pax, reservation.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.updateReservation(reservation.id, {
        date,
        time: time.length === 5 ? `${time}:00` : time,
        duration_minutes: durationMinutes,
        pax,
        status,
        table_number: tableNumber ? parseInt(tableNumber, 10) : null,
        notes: notes.trim() || null,
      });
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update reservation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Pencil className="w-4 h-4 text-brand-500" />
              Edit Reservation
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {reservation.customer?.name ?? "Guest"} · {reservation.customer?.phone_number}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
          )}

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ReservationStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
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
                    disabled={!t.is_available && t.table_number !== reservation.table_number}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Special requests..."
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
