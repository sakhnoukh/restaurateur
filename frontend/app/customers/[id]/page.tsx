"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Phone, TrendingUp, Users, AlertTriangle, Loader2, Save } from "lucide-react";
import { api, type CustomerDetail, type LoyaltyTier } from "@/lib/api";
import { TierBadge, StatusBadge } from "@/components/Badges";

const tierOptions: LoyaltyTier[] = ["none", "silver", "gold", "vip"];

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTier, setEditTier] = useState<LoyaltyTier>("none");
  const [editTags, setEditTags] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomer(id);
      setCustomer(data);
      setEditName(data.name);
      setEditTier(data.loyalty_tier);
      setEditTags(data.tags?.join(", ") ?? "");
    } catch (err) {
      console.error("Failed to load customer:", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const tags = editTags.split(",").map((t) => t.trim()).filter(Boolean);
      await api.updateCustomer(id, {
        name: editName,
        loyalty_tier: editTier,
        tags,
      });
      await loadData();
      setEditing(false);
    } catch (err) {
      console.error("Failed to update customer:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (!customer) {
    return <p className="text-center text-gray-400 py-12">Customer not found</p>;
  }

  const avgSpend = customer.total_visits > 0 ? customer.lifetime_spend / customer.total_visits : 0;

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push("/customers")}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </button>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-brand-600">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              {editing ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold border border-gray-300 rounded-lg px-2 py-1"
                />
              ) : (
                <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              )}
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-3 h-3" />
                {customer.phone_number}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <select
                  value={editTier}
                  onChange={(e) => setEditTier(e.target.value as LoyaltyTier)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                >
                  {tierOptions.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <TierBadge tier={customer.loyalty_tier} />
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tags */}
        {editing ? (
          <input
            type="text"
            value={editTags}
            onChange={(e) => setEditTags(e.target.value)}
            placeholder="Tags (comma-separated)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-4"
          />
        ) : (
          customer.tags && customer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Total Visits</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{customer.total_visits}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Lifetime Spend</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {customer.lifetime_spend.toLocaleString()} EGP
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Avg Spend</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {avgSpend.toFixed(0)} EGP
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">No-Shows</span>
            </div>
            <p className={`text-2xl font-bold ${customer.no_show_count > 1 ? "text-red-500" : "text-gray-900"}`}>
              {customer.no_show_count}
            </p>
          </div>
        </div>
      </div>

      {/* Reservation History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Reservation History</h2>
        </div>
        {customer.reservations.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No reservations yet</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {customer.reservations.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-gray-900 text-sm">
                    {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    {" · "}
                    {r.time.slice(0, 5)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.pax} pax{r.table_number ? ` · Table ${r.table_number}` : ""}
                    {r.notes ? ` · ${r.notes}` : ""}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
