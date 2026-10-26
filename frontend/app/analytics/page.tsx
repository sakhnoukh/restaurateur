"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Users,
  Star,
  Award,
  Clock,
  Globe,
  Loader2,
} from "lucide-react";
import { api, type AnalyticsReport } from "@/lib/api";
import { TierBadge } from "@/components/Badges";

export default function AnalyticsPage() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAnalytics()
      .then(setReport)
      .catch((err) => console.error("Failed to load analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!report) {
    return <p className="text-center text-gray-400 py-12">Unable to load analytics</p>;
  }

  const maxSectionRev = Math.max(1, ...Object.values(report.revenue_by_section));
  const maxPeakCovers = Math.max(1, ...report.peak_hours.map((h) => h.covers));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Revenue performance, section utilization, channel attribution, and staff & VIP leaderboards
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total POS Revenue</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {report.total_revenue.toLocaleString()} EGP
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Avg Spend / Cover</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {report.avg_spend_per_cover.toLocaleString()} EGP
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total Covers</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {report.total_covers} ({report.total_reservations} bookings)
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{report.completion_rate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">No-Show Rate</p>
          <p className="text-xl font-bold text-red-600 mt-1">{report.no_show_rate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Avg Guest Rating</p>
          <p className="text-xl font-bold text-amber-600 mt-1 flex items-center gap-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            {report.avg_guest_rating ? `${report.avg_guest_rating} / 5` : "N/A"}
          </p>
        </div>
      </div>

      {/* Section Revenue & Booking Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-brand-500" />
            Revenue by Dining Section
          </h2>
          <div className="space-y-3">
            {Object.entries(report.revenue_by_section).map(([sec, rev]) => (
              <div key={sec}>
                <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                  <span>{sec}</span>
                  <span>{rev.toLocaleString()} EGP</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${Math.max(4, (rev / maxSectionRev) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Bookings by Acquisition Channel (Phone / Online / WhatsApp / OTA)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(report.bookings_by_source).map(([src, count]) => (
              <div key={src} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs uppercase font-semibold text-gray-500">{src}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                <p className="text-[11px] text-gray-400">
                  {report.total_reservations > 0
                    ? `${Math.round((count / report.total_reservations) * 100)}% share`
                    : "0%"}
                </p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Peak Dining Hours (Covers)
            </h3>
            <div className="space-y-2">
              {report.peak_hours.map((h) => (
                <div key={h.hour} className="flex items-center gap-3 text-xs">
                  <span className="w-12 font-medium text-gray-700">{h.hour}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${Math.max(6, (h.covers / maxPeakCovers) * 100)}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-gray-600">
                    {h.covers} pax ({h.reservations} res)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Staff Leaderboard & Top Spenders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Staff Sales & Service Leaderboard
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {report.staff_leaderboard.map((s) => (
              <div key={s.id} className="p-4 flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-gray-900">{s.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {s.role} · {s.assigned_section || "General"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-700">
                    {(s.revenue_generated ?? 0).toLocaleString()} EGP
                  </p>
                  <p className="text-xs text-gray-500">
                    {s.covers_served ?? 0} covers · Tips: {(s.tips_earned ?? 0).toLocaleString()} EGP
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-5 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              Top VIP & High-Value Guests
            </h2>
          </div>
          <div className="divide-y divide-gray-100">
            {report.top_customers.map((c) => (
              <Link
                key={c.id}
                href={`/customers/${c.id}`}
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{c.name}</span>
                    <TierBadge tier={c.loyalty_tier} />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.total_visits} visits · {c.phone_number}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">
                    {c.lifetime_spend.toLocaleString()} EGP
                  </p>
                  <p className="text-xs text-gray-400">Lifetime Spend</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
