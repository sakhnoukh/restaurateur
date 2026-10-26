"use client";

import { useState } from "react";
import { X, Receipt, Loader2 } from "lucide-react";
import { api, type Reservation } from "@/lib/api";

interface RecordBillModalProps {
  reservation: Reservation;
  onClose: () => void;
  onRecorded: () => void;
}

export function RecordBillModal({ reservation, onClose, onRecorded }: RecordBillModalProps) {
  const [amount, setAmount] = useState("");
  const [posReceiptId, setPosReceiptId] = useState("");
  const [markCompleted, setMarkCompleted] = useState(reservation.status !== "completed");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const existingTotal =
    reservation.transactions?.reduce((sum, tx) => sum + tx.amount, 0) ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid bill amount greater than 0");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.createTransaction(reservation.id, {
        amount: numericAmount,
        pos_receipt_id: posReceiptId.trim() || null,
        mark_completed: markCompleted,
      });
      onRecorded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Receipt className="w-5 h-5 text-brand-500" />
              Record Bill / POS Check
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {reservation.customer?.name ?? "Guest"} · {reservation.pax} pax
              {reservation.table_number ? ` · Table ${reservation.table_number}` : ""}
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

          {existingTotal > 0 && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 flex items-center justify-between">
              <span>Previously recorded on this reservation:</span>
              <span className="font-semibold text-gray-900">
                {existingTotal.toLocaleString()} EGP
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bill Amount (EGP) *
            </label>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 1850"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              POS Receipt ID
            </label>
            <input
              type="text"
              value={posReceiptId}
              onChange={(e) => setPosReceiptId(e.target.value)}
              placeholder="e.g. POS-1042 (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={markCompleted}
              onChange={(e) => setMarkCompleted(e.target.checked)}
              className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            Mark reservation as Completed & update customer loyalty tier
          </label>

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
              Save Bill
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
