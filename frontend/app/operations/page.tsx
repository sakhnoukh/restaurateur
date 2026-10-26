"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Package,
  Wrench,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import {
  api,
  type StaffMember,
  type StaffRole,
  type InventoryItem,
  type MaintenanceTicket,
  type MaintenancePriority,
  type MaintenanceStatus,
} from "@/lib/api";

export default function OperationsPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Staff form
  const [staffName, setStaffName] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("server");
  const [staffSection, setStaffSection] = useState("Main Dining");
  const [staffShift, setStaffShift] = useState("Evening (17:00 - 01:00)");

  // Add Inventory form
  const [invName, setInvName] = useState("");
  const [invCategory, setInvCategory] = useState("Produce");
  const [invUnit, setInvUnit] = useState("kg");
  const [invStock, setInvStock] = useState("10");
  const [invPar, setInvPar] = useState("5");
  const [invCost, setInvCost] = useState("250");

  // Add Maintenance form
  const [equipName, setEquipName] = useState("");
  const [equipLocation, setEquipLocation] = useState("Kitchen");
  const [issueDesc, setIssueDesc] = useState("");
  const [priority, setPriority] = useState<MaintenancePriority>("medium");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, i, m] = await Promise.all([
        api.getStaff(),
        api.getInventory(),
        api.getMaintenanceTickets(),
      ]);
      setStaff(s);
      setInventory(i);
      setTickets(m);
    } catch (err) {
      console.error("Failed to load operations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim()) return;
    await api.createStaff({
      name: staffName.trim(),
      role: staffRole,
      assigned_section: staffSection,
      shift: staffShift,
    });
    setStaffName("");
    loadData();
  };

  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invName.trim()) return;
    await api.createInventoryItem({
      name: invName.trim(),
      category: invCategory,
      unit: invUnit,
      current_stock: parseFloat(invStock) || 0,
      par_level: parseFloat(invPar) || 5,
      cost_per_unit: parseFloat(invCost) || 0,
    });
    setInvName("");
    loadData();
  };

  const handleAdjustStock = async (item: InventoryItem, delta: number) => {
    const next = Math.max(0, item.current_stock + delta);
    await api.updateInventoryItem(item.id, { current_stock: next });
    loadData();
  };

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipName.trim() || !issueDesc.trim()) return;
    await api.createMaintenanceTicket({
      equipment_name: equipName.trim(),
      location: equipLocation,
      issue_description: issueDesc.trim(),
      priority,
    });
    setEquipName("");
    setIssueDesc("");
    loadData();
  };

  const handleTicketStatus = async (id: string, status: MaintenanceStatus) => {
    await api.updateMaintenanceTicket(id, { status });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Employee, Inventory & Maintenance Management
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage staff shifts & section assignments, back-of-house stock par levels, and facility maintenance tickets
        </p>
      </div>

      {/* 1. Employee Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users className="w-4 h-4 text-brand-500" />
          Employee & Shift Management ({staff.length} Staff)
        </h2>

        <form onSubmit={handleAddStaff} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Employee Name *"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <select
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as StaffRole)}
            className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="server">Server / Waiter</option>
            <option value="host">Host / Reception</option>
            <option value="manager">Manager</option>
            <option value="chef">Chef / Kitchen</option>
          </select>
          <select
            value={staffSection}
            onChange={(e) => setStaffSection(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="Window">Window Section</option>
            <option value="Main Dining">Main Dining</option>
            <option value="Terrace">Terrace</option>
            <option value="Private Room">Private Room</option>
            <option value="Kitchen">Kitchen</option>
          </select>
          <input
            type="text"
            placeholder="Shift"
            value={staffShift}
            onChange={(e) => setStaffShift(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-brand-500 text-white rounded-lg text-xs font-medium hover:bg-brand-600 inline-flex items-center justify-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Staff
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
              <tr>
                <th className="text-left px-4 py-2.5">Employee</th>
                <th className="text-left px-4 py-2.5">Role</th>
                <th className="text-left px-4 py-2.5">Section</th>
                <th className="text-left px-4 py-2.5">Shift</th>
                <th className="text-left px-4 py-2.5">Covers Served</th>
                <th className="text-left px-4 py-2.5">Sales / Tips</th>
                <th className="text-right px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staff.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-2.5 capitalize text-gray-600">{s.role}</td>
                  <td className="px-4 py-2.5 text-gray-600">{s.assigned_section || "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{s.shift}</td>
                  <td className="px-4 py-2.5 text-gray-700">{s.covers_served ?? 0} pax</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span className="font-semibold text-emerald-700">
                      {(s.revenue_generated ?? 0).toLocaleString()} EGP
                    </span>{" "}
                    <span className="text-gray-400">
                      (Tips: {(s.tips_earned ?? 0).toLocaleString()})
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={async () => {
                        await api.deleteStaff(s.id);
                        loadData();
                      }}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Inventory & Stock Control */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          Inventory & Par Level Management
        </h2>

        <form onSubmit={handleAddInventory} className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          <input
            type="text"
            placeholder="Ingredient / Item *"
            value={invName}
            onChange={(e) => setInvName(e.target.value)}
            className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <input
            type="text"
            placeholder="Unit (kg, pcs)"
            value={invUnit}
            onChange={(e) => setInvUnit(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <input
            type="number"
            placeholder="Current Stock"
            value={invStock}
            onChange={(e) => setInvStock(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <input
            type="number"
            placeholder="Par Level"
            value={invPar}
            onChange={(e) => setInvPar(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
          >
            + Add Stock Item
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {inventory.map((item) => {
            const low = item.current_stock <= item.par_level;
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  low ? "bg-red-50/40 border-red-200" : "bg-white border-gray-200"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">{item.name}</span>
                    {low && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3" />
                        LOW STOCK
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Stock:{" "}
                    <strong className={low ? "text-red-600" : "text-gray-900"}>
                      {item.current_stock} {item.unit}
                    </strong>{" "}
                    (Par: {item.par_level} {item.unit})
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAdjustStock(item, -1)}
                    className="w-7 h-7 rounded border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold"
                  >
                    -1
                  </button>
                  <button
                    onClick={() => handleAdjustStock(item, 5)}
                    className="px-2 h-7 rounded border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
                  >
                    +5
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Maintenance Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="w-4 h-4 text-amber-600" />
          Equipment & Facility Maintenance Tickets
        </h2>

        <form onSubmit={handleAddTicket} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            placeholder="Equipment Name *"
            value={equipName}
            onChange={(e) => setEquipName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <select
            value={equipLocation}
            onChange={(e) => setEquipLocation(e.target.value)}
            className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="Kitchen">Kitchen</option>
            <option value="Terrace">Terrace</option>
            <option value="Main Dining">Main Dining</option>
            <option value="Bar">Bar</option>
            <option value="Reception">Reception</option>
          </select>
          <input
            type="text"
            placeholder="Issue Description *"
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-xs"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as MaintenancePriority)}
            className="px-2 py-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="critical">Critical</option>
          </select>
          <button
            type="submit"
            className="px-3 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700"
          >
            + Open Ticket
          </button>
        </form>

        <div className="divide-y divide-gray-100">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 text-sm">
                    {t.equipment_name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {t.location}
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase ${
                      t.priority === "critical" || t.priority === "high"
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-0.5">{t.issue_description}</p>
              </div>

              <div className="flex items-center gap-2">
                {t.status !== "resolved" ? (
                  <button
                    onClick={() => handleTicketStatus(t.id, "resolved")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mark Resolved
                  </button>
                ) : (
                  <span className="text-xs font-medium text-green-600">Resolved</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
