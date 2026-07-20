"use client";

import { useEffect, useState, useCallback } from "react";
import { CalendarPlus, Users, Clock, CheckCircle, XCircle, Armchair, Loader2 } from "lucide-react";
import { api, type DashboardStats, type TimelineSlot, type ReservationStatus } from "@/lib/api";
import { StatusBadge, TierBadge } from "@/components/Badges";
import { CreateReservationModal } from "@/components/CreateReservationModal";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([api.getStats(), api.getTimeline()]);
      setStats(s);
      setTimeline(t);
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const statCards = [
    { label: "Reservations", value: stats?.total_reservations ?? 0, icon: CalendarPlus, color: "text-brand-500", bg: "bg-brand-50" },
    { label: "Expected", value: stats?.expected ?? 0, icon: Clock, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Seated", value: stats?.seated ?? 0, icon: Armchair, color: "text-green-500", bg: "bg-green-50" },
    { label: "Completed", value: stats?.completed ?? 0, icon: CheckCircle, color: "text-gray-500", bg: "bg-gray-100" },
    { label: "No-Shows", value: stats?.no_shows ?? 0, icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Total Covers", value: stats?.total_pax ?? 0, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <CalendarPlus className="w-4 h-4" />
          New Reservation
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Today&apos;s Timeline</h2>
        </div>
        <div className="p-5">
          {timeline.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No reservations for today</p>
          ) : (
            <div className="space-y-4">
              {timeline.map((slot) => (
                <div key={slot.time}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-12 text-sm font-semibold text-gray-700">{slot.time}</div>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div className="ml-14 space-y-2">
                    {slot.reservations.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {r.customer?.name ?? "Unknown"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {r.pax} pax{r.table_number ? ` · Table ${r.table_number}` : ""}
                              {r.notes ? ` · ${r.notes}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.customer && r.customer.loyalty_tier !== "none" && (
                            <TierBadge tier={r.customer.loyalty_tier} />
                          )}
                          <StatusBadge status={r.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <CreateReservationModal onClose={() => setShowModal(false)} onCreated={loadData} />
      )}
    </div>
  );
}
