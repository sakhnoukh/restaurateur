"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Armchair,
  Loader2,
  Banknote,
  Receipt,
  Pencil,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  api,
  type DashboardStats,
  type TimelineSlot,
  type Reservation,
  type ReservationStatus,
} from "@/lib/api";
import { StatusBadge, TierBadge } from "@/components/Badges";
import { CreateReservationModal } from "@/components/CreateReservationModal";
import { EditReservationModal } from "@/components/EditReservationModal";
import { RecordBillModal } from "@/components/RecordBillModal";

function shiftDate(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export default function DashboardPage() {
  const todayStr = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [billingReservation, setBillingReservation] = useState<Reservation | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        api.getStats(selectedDate),
        api.getTimeline(selectedDate),
      ]);
      setStats(s);
      setTimeline(t);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (id: string, status: ReservationStatus) => {
    try {
      await api.updateReservation(id, { status });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  const statCards = [
    { label: "Reservations", value: stats?.total_reservations ?? 0, icon: CalendarPlus, color: "text-brand-500", bg: "bg-brand-50" },
    { label: "Expected", value: stats?.expected ?? 0, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Seated", value: stats?.seated ?? 0, icon: Armchair, color: "text-green-500", bg: "bg-green-50" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-gray-500", bg: "bg-gray-100" },
    { label: "No-Shows", value: stats?.no_shows ?? 0, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Total Covers", value: stats?.total_pax ?? 0, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
    {
      label: "Daily Revenue",
      value: `${(stats?.daily_revenue ?? 0).toLocaleString()} EGP`,
      icon: Banknote,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  const formattedSelectedDate = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">{formattedSelectedDate}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center bg-white border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2 py-1 text-sm text-gray-700 border-0 focus:ring-0"
            />
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              className="p-1.5 text-gray-500 hover:text-gray-900 rounded"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {selectedDate !== todayStr && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
          >
            <CalendarPlus className="w-4 h-4" />
            New Reservation
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Service Timeline</h2>
          <span className="text-xs text-gray-500">
            {stats?.total_reservations ?? 0} bookings · {stats?.total_pax ?? 0} covers
          </span>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No reservations for this date</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((slot) => (
                <div key={slot.time}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-12 text-sm font-semibold text-gray-700">{slot.time}</div>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="ml-14 space-y-2">
                    {slot.reservations.map((r) => {
                      const billSum =
                        r.transactions?.reduce((acc, tx) => acc + tx.amount, 0) ?? 0;
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                {r.customer ? (
                                  <Link
                                    href={`/customers/${r.customer.id}`}
                                    className="font-medium text-gray-900 text-sm hover:text-brand-600"
                                  >
                                    {r.customer.name}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-gray-900 text-sm">Unknown</span>
                                )}
                                {r.customer && r.customer.loyalty_tier !== "none" && (
                                  <TierBadge tier={r.customer.loyalty_tier} />
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {r.pax} pax
                                {r.table_number ? ` · Table ${r.table_number}` : " · Unassigned"}
                                {r.server ? ` · Server: ${r.server.name}` : ""}
                                {r.occasion ? ` · ${r.occasion}` : ""}
                                {r.source ? ` · [${r.source.toUpperCase()}]` : ""}
                                {r.min_spend_required > 0 ? ` · Min: ${r.min_spend_required} EGP` : ""}
                                {r.notes ? ` · "${r.notes}"` : ""}
                                {billSum > 0 ? ` · Bill: ${billSum.toLocaleString()} EGP` : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={r.status} />

                            {r.status === "expected" && (
                              <>
                                <button
                                  onClick={() => handleStatusChange(r.id, "seated")}
                                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-green-50 text-green-700 hover:bg-green-100"
                                >
                                  Seat Guest
                                </button>
                                <button
                                  onClick={() => handleStatusChange(r.id, "no_show")}
                                  className="px-2.5 py-1 text-xs font-medium rounded-md bg-red-50 text-red-700 hover:bg-red-100"
                                >
                                  No-Show
                                </button>
                              </>
                            )}

                            {r.status === "seated" && (
                              <button
                                onClick={() => setBillingReservation(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Close Bill
                              </button>
                            )}

                            {r.status === "completed" && billSum === 0 && (
                              <button
                                onClick={() => setBillingReservation(r)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                Add Bill
                              </button>
                            )}

                            <button
                              onClick={() => setEditingReservation(r)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                              title="Edit Reservation"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateReservationModal
          defaultDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}

      {editingReservation && (
        <EditReservationModal
          reservation={editingReservation}
          onClose={() => setEditingReservation(null)}
          onUpdated={loadData}
        />
      )}

      {billingReservation && (
        <RecordBillModal
          reservation={billingReservation}
          onClose={() => setBillingReservation(null)}
          onRecorded={loadData}
        />
      )}
    </div>
  );
}
