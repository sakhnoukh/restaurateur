"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Loader2,
  Armchair,
  Users,
  Trash2,
  Power,
  CheckCircle2,
  Clock,
  Banknote,
  X,
} from "lucide-react";
import { api, type TableAvailability, type RateRule } from "@/lib/api";

export default function TablesPage() {
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [rateRules, setRateRules] = useState<RateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkTime, setCheckTime] = useState("19:00");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [newSection, setNewSection] = useState("Main Dining");
  const [newMinSpend, setNewMinSpend] = useState("0");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Rate rule form
  const [ruleName, setRuleName] = useState("");
  const [ruleSection, setRuleSection] = useState("Terrace");
  const [ruleDays, setRuleDays] = useState("Thu,Fri,Sat");
  const [ruleMinSpend, setRuleMinSpend] = useState("500");
  const [ruleDeposit, setRuleDeposit] = useState("200");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const formattedTime = checkTime.length === 5 ? `${checkTime}:00` : checkTime;
      const [data, rules] = await Promise.all([
        api.getTablesAvailability({
          date: checkDate,
          time: formattedTime,
        }),
        api.getRateRules(),
      ]);
      setTables(data);
      setRateRules(rules);
    } catch (err) {
      console.error("Failed to load tables:", err);
    } finally {
      setLoading(false);
    }
  }, [checkDate, checkTime]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.createTable({
        table_number: parseInt(newTableNumber, 10),
        capacity: newCapacity,
        section: newSection.trim() || "Main Dining",
        min_spend_per_pax: parseFloat(newMinSpend) || 0,
        is_active: true,
      });
      setNewTableNumber("");
      setNewCapacity(4);
      setNewSection("Main Dining");
      setNewMinSpend("0");
      setShowAddModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create table");
    } finally {
      setCreating(false);
    }
  };

  const handleAddRateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim()) return;
    await api.createRateRule({
      name: ruleName.trim(),
      section: ruleSection,
      day_of_week: ruleDays,
      start_time: "19:00:00",
      min_spend_per_pax: parseFloat(ruleMinSpend) || 0,
      deposit_per_pax: parseFloat(ruleDeposit) || 0,
      min_party_size_for_deposit: 4,
    });
    setRuleName("");
    loadData();
  };

  const handleToggleActive = async (table: TableAvailability) => {
    try {
      await api.updateTable(table.id, { is_active: !table.is_active });
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update table");
    }
  };

  const handleDeleteTable = async (table: TableAvailability) => {
    if (!confirm(`Remove Table ${table.table_number} from floor inventory?`)) return;
    try {
      await api.deleteTable(table.id);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete table");
    }
  };

  const sections = Array.from(new Set(tables.map((t) => t.section)));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tables, Floor Plan & Rate Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time table availability, dynamic minimum spend per guest, and deposit rules
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600"
        >
          <Plus className="w-4 h-4" />
          Add Table
        </button>
      </div>

      {/* Availability Filter Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Date</label>
          <input
            type="date"
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 uppercase">Time Slot</label>
          <input
            type="time"
            value={checkTime}
            onChange={(e) => setCheckTime(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            Available ({tables.filter((t) => t.is_available).length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Booked ({tables.filter((t) => t.is_active && !t.is_available).length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            Inactive ({tables.filter((t) => !t.is_active).length})
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <div key={section} className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                {section}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables
                  .filter((t) => t.section === section)
                  .map((t) => {
                    const conflict = t.conflicting_reservation;
                    return (
                      <div
                        key={t.id}
                        className={`rounded-xl border p-4 transition-all ${
                          !t.is_active
                            ? "bg-gray-50 border-gray-200 opacity-70"
                            : t.is_available
                            ? "bg-white border-green-200 hover:border-green-300"
                            : "bg-amber-50/40 border-amber-200"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className="text-lg font-bold text-gray-900">
                              Table {t.table_number}
                            </span>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Users className="w-3.5 h-3.5" />
                              Up to {t.capacity} guests
                            </p>
                            {t.min_spend_per_pax > 0 && (
                              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                                Min Spend: {t.min_spend_per_pax} EGP/pax
                              </p>
                            )}
                          </div>
                          {!t.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                              Inactive
                            </span>
                          ) : t.is_available ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" />
                              Reserved
                            </span>
                          )}
                        </div>

                        {conflict && (
                          <div className="bg-white/80 rounded-lg border border-amber-200 p-2.5 text-xs mb-3">
                            <p className="font-semibold text-gray-900">
                              {conflict.customer?.name ?? "Guest"} ({conflict.pax} pax)
                            </p>
                            <p className="text-gray-500">
                              {conflict.time.slice(0, 5)} · {conflict.status}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-gray-100">
                          <button
                            onClick={() => handleToggleActive(t)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                          >
                            <Power className="w-3.5 h-3.5" />
                            {t.is_active ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleDeleteTable(t)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* Rate Management Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Banknote className="w-4 h-4 text-emerald-600" />
          Dynamic Rate Management (Minimum Spend & Deposit Rules)
        </h2>

        <form onSubmit={handleAddRateRule} className="grid grid-cols-1 sm:grid-cols-6 gap-2">
          <input
            type="text"
            placeholder="Rule Name *"
            value={ruleName}
            onChange={(e) => setRuleName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <select
            value={ruleSection}
            onChange={(e) => setRuleSection(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="All">All Sections</option>
            <option value="Terrace">Terrace</option>
            <option value="Window">Window</option>
            <option value="Private Room">Private Room</option>
          </select>
          <input
            type="text"
            placeholder="Days (e.g. Thu,Fri,Sat)"
            value={ruleDays}
            onChange={(e) => setRuleDays(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <input
            type="number"
            placeholder="Min Spend / Pax"
            value={ruleMinSpend}
            onChange={(e) => setRuleMinSpend(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600"
          >
            + Add Rate Rule
          </button>
        </form>

        <div className="divide-y divide-gray-100">
          {rateRules.map((rule) => (
            <div key={rule.id} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-gray-900">{rule.name}</p>
                <p className="text-xs text-gray-500">
                  Section: {rule.section} · Days: {rule.day_of_week} · From{" "}
                  {rule.start_time.slice(0, 5)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-xs">
                  <p className="font-bold text-gray-900">
                    Min Spend: {rule.min_spend_per_pax} EGP/pax
                  </p>
                  <p className="text-gray-500">
                    Deposit: {rule.deposit_per_pax} EGP/pax (for {rule.min_party_size_for_deposit}+ pax)
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await api.deleteRateRule(rule.id);
                    loadData();
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Armchair className="w-5 h-5 text-brand-500" />
                Add Table
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTable} className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Table Number *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 11"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity (Seats) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
                <select
                  value={newSection}
                  onChange={(e) => setNewSection(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="Main Dining">Main Dining</option>
                  <option value="Window">Window</option>
                  <option value="Terrace">Terrace</option>
                  <option value="Private Room">Private Room</option>
                  <option value="Bar">Bar</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Spend per Guest (EGP)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newMinSpend}
                  onChange={(e) => setNewMinSpend(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
