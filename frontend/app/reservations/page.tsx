"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarPlus, Loader2, Trash2, ChevronDown } from "lucide-react";
import { api, type Reservation, type ReservationStatus } from "@/lib/api";
import { StatusBadge, TierBadge } from "@/components/Badges";
import { CreateReservationModal } from "@/components/CreateReservationModal";

const statusOptions: { value: ReservationStatus | "all"; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "expected", label: "Expected" },
  { value: "seated", label: "Seated" },
  { value: "completed", label: "Completed" },
  { value: "no_show", label: "No-Show" },
];

const statusActions: { status: ReservationStatus; label: string; className: string }[] = [
  { status: "expected", label: "Expected", className: "bg-blue-50 text-blue-600 hover:bg-blue-100" },
  { status: "seated", label: "Seated", className: "bg-green-50 text-green-600 hover:bg-green-100" },
  { status: "completed", label: "Completed", className: "bg-gray-50 text-gray-600 hover:bg-gray-100" },
  { status: "no_show", label: "No-Show", className: "bg-red-50 text-red-600 hover:bg-red-100" },
];

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | "all">("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { date?: string; status?: ReservationStatus } = {};
      if (filterDate) params.date = filterDate;
      if (filterStatus !== "all") params.status = filterStatus;
      const data = await api.getReservations(params);
      setReservations(data);
    } catch (err) {
      console.error("Failed to load reservations:", err);
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await api.updateReservation(id, { status });
      loadData();
    } catch (err) {
      console.error("Failed to update reservation:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Cancel this reservation?")) return;
    try {
      await api.deleteReservation(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete reservation:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <CalendarPlus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReservationStatus | "all")}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
          </div>
        ) : reservations.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No reservations found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Pax</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Table</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tier</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{r.time.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{r.customer?.name ?? "Unknown"}</div>
                      <div className="text-xs text-gray-500">{r.customer?.phone_number}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.pax}</td>
                    <td className="px-4 py-3 text-gray-700">{r.table_number ?? "—"}</td>
                    <td className="px-4 py-3">
                      {r.customer && r.customer.loyalty_tier !== "none" && (
                        <TierBadge tier={r.customer.loyalty_tier} />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="relative group">
                          <button className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50">
                            Set Status <ChevronDown className="w-3 h-3" />
                          </button>
                          <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col gap-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-10 min-w-[120px]">
                            {statusActions.map((action) => (
                              <button
                                key={action.status}
                                onClick={() => handleStatusChange(r.id, action.status)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md ${action.className}`}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <CreateReservationModal onClose={() => setShowModal(false)} onCreated={loadData} />
      )}
    </div>
  );
}
