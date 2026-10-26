"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Loader2, Phone, UserPlus } from "lucide-react";
import Link from "next/link";
import { api, type Customer } from "@/lib/api";
import { TierBadge } from "@/components/Badges";
import { CreateCustomerModal } from "@/components/CreateCustomerModal";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getCustomers(search || undefined);
      setCustomers(data);
    } catch (err) {
      console.error("Failed to load customers:", err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <UserPlus className="w-4 h-4" />
          New Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by name or phone number..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Customer Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : customers.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No customers found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((c) => (
            <Link
              key={c.id}
              href={`/customers/${c.id}`}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {c.phone_number}
                  </p>
                </div>
                <TierBadge tier={c.loyalty_tier} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">{c.total_visits}</p>
                  <p className="text-xs text-gray-500">Visits</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className="text-lg font-bold text-gray-900">
                    {(c.lifetime_spend / 1000).toFixed(1)}k
                  </p>
                  <p className="text-xs text-gray-500">Spend</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <p className={`text-lg font-bold ${c.no_show_count > 1 ? "text-red-500" : "text-gray-900"}`}>
                    {c.no_show_count}
                  </p>
                  <p className="text-xs text-gray-500">No-Shows</p>
                </div>
              </div>

              {c.tags && c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateCustomerModal
          onClose={() => setShowCreateModal(false)}
          onCreated={loadData}
        />
      )}
    </div>
  );
}
