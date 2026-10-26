"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Megaphone,
  Send,
  Users,
  Sparkles,
  Cake,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { api, type Campaign, type Customer } from "@/lib/api";
import { TierBadge } from "@/components/Badges";

const segments = [
  { key: "all", label: "All CRM Guests" },
  { key: "vip", label: "VIP Tier Only" },
  { key: "gold_vip", label: "Gold & VIP Guests" },
  { key: "high_spenders", label: "High Spenders (15k+ EGP)" },
  { key: "regulars", label: "Regulars (5+ Visits)" },
  { key: "celebrations", label: "Upcoming Birthdays & Anniversaries" },
  { key: "at_risk_no_show", label: "Frequent No-Show Guests" },
];

export default function MarketingPage() {
  const [selectedSegment, setSelectedSegment] = useState("gold_vip");
  const [audience, setAudience] = useState<Customer[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignName, setCampaignName] = useState("");
  const [channel, setChannel] = useState("whatsapp");
  const [template, setTemplate] = useState(
    "Hello {{name}}, we would love to host you this weekend at Restaurateur! Reply to book your preferred table."
  );
  const [sending, setSending] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [aud, camps] = await Promise.all([
        api.getSegmentCustomers(selectedSegment),
        api.getCampaigns(),
      ]);
      setAudience(aud);
      setCampaigns(camps);
    } catch (err) {
      console.error("Failed to load marketing data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedSegment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim() || !template.trim()) return;
    setSending(true);
    try {
      await api.launchCampaign({
        name: campaignName.trim(),
        channel,
        target_segment: selectedSegment,
        message_template: template.trim(),
      });
      setCampaignName("");
      await loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to launch campaign");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Marketing Automation & Guest Experience Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Build targeted CRM segments, send automated WhatsApp/SMS campaigns, and track guest dietary & celebration preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Builder */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 h-fit">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-brand-500" />
            Create Targeted Campaign
          </h2>

          <form onSubmit={handleLaunchCampaign} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Campaign Name *
              </label>
              <input
                type="text"
                required
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Friday Chef's Tasting Invite"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Segment
                </label>
                <select
                  value={selectedSegment}
                  onChange={(e) => setSelectedSegment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {segments.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="whatsapp">WhatsApp Business</option>
                  <option value="sms">SMS Broadcast</option>
                  <option value="email">Email Newsletter</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Message Template (supports {"{{name}}"})
              </label>
              <textarea
                rows={4}
                required
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div className="bg-brand-50 rounded-lg p-3 text-xs text-brand-800 flex items-center justify-between">
              <span>Matched Segment Audience:</span>
              <span className="font-bold">{audience.length} Guests</span>
            </div>

            <button
              type="submit"
              disabled={sending || audience.length === 0}
              className="w-full py-2.5 bg-brand-500 text-white rounded-lg text-sm font-semibold hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending..." : `Send to ${audience.length} Guests`}
            </button>
          </form>
        </div>

        {/* Segment Preview & Guest Experience Intelligence */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-500" />
                Segment Audience & Guest Experience Profiles ({audience.length})
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
              </div>
            ) : audience.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">
                No guests match this segment
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {audience.map((c) => (
                  <div key={c.id} className="p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {c.name}
                        </span>
                        <TierBadge tier={c.loyalty_tier} />
                        <span className="text-xs text-gray-400">{c.phone_number}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {c.dietary_notes && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Dietary: {c.dietary_notes}
                          </span>
                        )}
                        {c.birthday && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium">
                            <Cake className="w-3 h-3" />
                            Birthday: {c.birthday}
                          </span>
                        )}
                        {c.anniversary && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-pink-50 text-pink-700 font-medium">
                            <Sparkles className="w-3 h-3" />
                            Anniversary: {c.anniversary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-gray-500 shrink-0">
                      <p className="font-bold text-gray-900">
                        {c.lifetime_spend.toLocaleString()} EGP
                      </p>
                      <p>{c.total_visits} visits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sent Campaigns Log */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Campaign History</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-900">
                      {camp.name}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      {camp.status.toUpperCase()} ({camp.recipients_count} guests via{" "}
                      {camp.channel})
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    {camp.message_template}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
