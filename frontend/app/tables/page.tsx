"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  Move,
  RotateCw,
  LayoutGrid,
  Map,
  CalendarPlus,
  X,
} from "lucide-react";
import {
  api,
  type TableAvailability,
  type RateRule,
  type TableShape,
} from "@/lib/api";
import { CreateReservationModal } from "@/components/CreateReservationModal";
import { EditReservationModal } from "@/components/EditReservationModal";

const SNAP_GRID = 10;

export default function TablesPage() {
  const [tables, setTables] = useState<TableAvailability[]>([]);
  const [rateRules, setRateRules] = useState<RateRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split("T")[0]);
  const [checkTime, setCheckTime] = useState("19:00");
  const [viewMode, setViewMode] = useState<"canvas" | "grid">("canvas");
  const [editLayoutMode, setEditLayoutMode] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [bookingTableNumber, setBookingTableNumber] = useState<number | null>(null);
  const [editingReservationId, setEditingReservationId] = useState<string | null>(null);

  // Drag state
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Add Table modal state
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newCapacity, setNewCapacity] = useState(4);
  const [newSection, setNewSection] = useState("Main Dining");
  const [newShape, setNewShape] = useState<TableShape>("round");
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

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;

  const handlePointerDown = (e: React.PointerEvent, table: TableAvailability) => {
    e.stopPropagation();
    setSelectedTableId(table.id);
    if (!editLayoutMode || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    dragOffset.current = {
      dx: e.clientX - rect.left - table.x_pos,
      dy: e.clientY - rect.top - table.y_pos,
    };
    setDraggingId(table.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left - dragOffset.current.dx;
    const rawY = e.clientY - rect.top - dragOffset.current.dy;

    const snappedX = Math.max(10, Math.min(820, Math.round(rawX / SNAP_GRID) * SNAP_GRID));
    const snappedY = Math.max(10, Math.min(430, Math.round(rawY / SNAP_GRID) * SNAP_GRID));

    setTables((prev) =>
      prev.map((t) => (t.id === draggingId ? { ...t, x_pos: snappedX, y_pos: snappedY } : t))
    );
  };

  const handlePointerUp = async () => {
    if (!draggingId) return;
    const moved = tables.find((t) => t.id === draggingId);
    setDraggingId(null);
    if (moved) {
      try {
        await api.updateTable(moved.id, { x_pos: moved.x_pos, y_pos: moved.y_pos });
      } catch (err) {
        console.error("Failed to save table coordinates:", err);
      }
    }
  };

  const handleUpdateTableGeometry = async (
    table: TableAvailability,
    patch: {
      shape?: TableShape;
      width?: number;
      height?: number;
      rotation?: number;
      capacity?: number;
      section?: string;
    }
  ) => {
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, ...patch } : t)));
    try {
      await api.updateTable(table.id, patch);
    } catch (err) {
      console.error("Failed to update table geometry:", err);
    }
  };

  const handleApplyPresetLayout = async (preset: "fine_dining" | "bistro" | "banquet") => {
    const updates = tables.map((t, idx) => {
      if (preset === "bistro") {
        const col = idx % 5;
        const row = Math.floor(idx / 5);
        return api.updateTable(t.id, {
          x_pos: 60 + col * 170,
          y_pos: 90 + row * 190,
          width: 85,
          height: 85,
          shape: idx % 2 === 0 ? "round" : "square",
          rotation: 0,
        });
      }
      if (preset === "banquet") {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        return api.updateTable(t.id, {
          x_pos: 80 + col * 270,
          y_pos: 70 + row * 130,
          width: 160,
          height: 80,
          shape: "rectangle",
          rotation: 0,
        });
      }
      // fine_dining default zones
      const defaultCoords: Record<number, { x: number; y: number; w: number; h: number; s: TableShape }> = {
        1: { x: 70, y: 70, w: 78, h: 78, s: "round" },
        2: { x: 70, y: 190, w: 78, h: 78, s: "round" },
        4: { x: 65, y: 320, w: 90, h: 90, s: "square" },
        3: { x: 270, y: 80, w: 80, h: 80, s: "round" },
        5: { x: 265, y: 200, w: 95, h: 95, s: "square" },
        6: { x: 265, y: 330, w: 95, h: 95, s: "square" },
        7: { x: 470, y: 90, w: 140, h: 85, s: "rectangle" },
        8: { x: 470, y: 240, w: 140, h: 85, s: "rectangle" },
        9: { x: 700, y: 85, w: 165, h: 95, s: "booth" },
        10: { x: 700, y: 245, w: 175, h: 110, s: "rectangle" },
      };
      const c = defaultCoords[t.table_number] || {
        x: 100 + (idx % 4) * 180,
        y: 100 + Math.floor(idx / 4) * 140,
        w: 90,
        h: 90,
        s: "round" as TableShape,
      };
      return api.updateTable(t.id, {
        x_pos: c.x,
        y_pos: c.y,
        width: c.w,
        height: c.h,
        shape: c.s,
        rotation: 0,
      });
    });
    await Promise.all(updates);
    loadData();
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const defaultW = newShape === "rectangle" || newShape === "booth" ? 140 : 88;
      const defaultH = newShape === "rectangle" ? 85 : 88;
      await api.createTable({
        table_number: parseInt(newTableNumber, 10),
        capacity: newCapacity,
        section: newSection.trim() || "Main Dining",
        min_spend_per_pax: parseFloat(newMinSpend) || 0,
        x_pos: 260,
        y_pos: 180,
        width: defaultW,
        height: defaultH,
        shape: newShape,
        rotation: 0,
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
      if (selectedTableId === table.id) setSelectedTableId(null);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete table");
    }
  };

  const sections = Array.from(new Set(tables.map((t) => t.section)));

  const renderChairs = (table: TableAvailability) => {
    const count = Math.min(12, table.capacity);
    const chairs = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * 2 * Math.PI;
      const rx = table.width / 2 + 10;
      const ry = table.height / 2 + 10;
      const cx = table.width / 2 + rx * Math.cos(angle) - 5;
      const cy = table.height / 2 + ry * Math.sin(angle) - 5;
      chairs.push(
        <span
          key={i}
          style={{ left: `${cx}px`, top: `${cy}px` }}
          className="absolute w-2.5 h-2.5 rounded-full bg-gray-300 border border-gray-400 pointer-events-none"
        />
      );
    }
    return chairs;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            2D Interactive Floor Visualizer & Rate Rules
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Customize your restaurant floor layout via drag-and-drop, inspect live table occupancy, or book directly from any table
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-gray-300 bg-white p-0.5">
            <button
              onClick={() => setViewMode("canvas")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                viewMode === "canvas"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              2D Floor Map
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                viewMode === "grid"
                  ? "bg-brand-500 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Section Cards
            </button>
          </div>

          {viewMode === "canvas" && (
            <button
              onClick={() => setEditLayoutMode(!editLayoutMode)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                editLayoutMode
                  ? "bg-amber-500 border-amber-600 text-white shadow-sm"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              {editLayoutMode ? "Done Customizing Layout" : "Customize Floor Layout"}
            </button>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg text-xs font-semibold hover:bg-brand-600"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
        </div>
      </div>

      {/* Availability Filter & Preset Bar */}
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
          <label className="text-xs font-medium text-gray-500 uppercase">Time</label>
          <input
            type="time"
            value={checkTime}
            onChange={(e) => setCheckTime(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {editLayoutMode && (
          <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
            <span className="text-xs font-semibold text-amber-700">Floor Presets:</span>
            <button
              onClick={() => handleApplyPresetLayout("fine_dining")}
              className="px-2.5 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              4-Zone Fine Dining
            </button>
            <button
              onClick={() => handleApplyPresetLayout("bistro")}
              className="px-2.5 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              Open Bistro Grid
            </button>
            <button
              onClick={() => handleApplyPresetLayout("banquet")}
              className="px-2.5 py-1 text-xs rounded border border-gray-300 hover:bg-gray-50"
            >
              Banquet Hall
            </button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-4 text-xs text-gray-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Available ({tables.filter((t) => t.is_available).length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Expected ({tables.filter((t) => t.conflicting_reservation?.status === "expected").length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Seated ({tables.filter((t) => t.conflicting_reservation?.status === "seated").length})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
            Inactive ({tables.filter((t) => !t.is_active).length})
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : viewMode === "canvas" ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 2D Floor Plan Canvas */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-4 overflow-x-auto">
            {editLayoutMode && (
              <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800 flex items-center justify-between">
                <span>
                  <strong>Layout Customizer Active:</strong> Drag any table to reposition it on the floor plan. Select a table to change its shape, dimensions, rotation, or zone.
                </span>
              </div>
            )}

            <div
              ref={canvasRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onClick={() => setSelectedTableId(null)}
              style={{
                width: "920px",
                height: "520px",
                backgroundImage:
                  "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
              className="relative rounded-xl border border-gray-200 bg-slate-50/70 select-none overflow-hidden mx-auto"
            >
              {/* Architectural Zone Backdrops */}
              <div
                style={{ left: "20px", top: "20px", width: "185px", height: "480px" }}
                className="absolute rounded-xl border border-dashed border-sky-200 bg-sky-50/30 pointer-events-none p-2.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                  Window Promenade
                </span>
              </div>
              <div
                style={{ left: "220px", top: "20px", width: "205px", height: "480px" }}
                className="absolute rounded-xl border border-dashed border-gray-300 bg-white/40 pointer-events-none p-2.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  Main Dining Room
                </span>
              </div>
              <div
                style={{ left: "440px", top: "20px", width: "215px", height: "480px" }}
                className="absolute rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 pointer-events-none p-2.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  Garden Terrace
                </span>
              </div>
              <div
                style={{ left: "670px", top: "20px", width: "230px", height: "480px" }}
                className="absolute rounded-xl border border-dashed border-purple-200 bg-purple-50/30 pointer-events-none p-2.5"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                  VIP Private Dining
                </span>
              </div>

              {/* Interactive Tables */}
              {tables.map((t) => {
                const conflict = t.conflicting_reservation;
                const isSelected = t.id === selectedTableId;

                let colorClasses =
                  "bg-emerald-50 border-emerald-500 text-emerald-950 hover:shadow-md";
                if (!t.is_active) {
                  colorClasses = "bg-gray-200 border-gray-400 text-gray-500 opacity-70";
                } else if (conflict?.status === "seated") {
                  colorClasses = "bg-amber-100 border-amber-500 text-amber-950 shadow-sm";
                } else if (conflict) {
                  colorClasses = "bg-blue-100 border-blue-500 text-blue-950 shadow-sm";
                }

                const shapeClass =
                  t.shape === "round"
                    ? "rounded-full"
                    : t.shape === "booth"
                    ? "rounded-2xl border-x-8"
                    : "rounded-xl";

                return (
                  <div
                    key={t.id}
                    onPointerDown={(e) => handlePointerDown(e, t)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: `${t.x_pos}px`,
                      top: `${t.y_pos}px`,
                      width: `${t.width}px`,
                      height: `${t.height}px`,
                      transform: `rotate(${t.rotation || 0}deg)`,
                    }}
                    className={`absolute border-2 flex flex-col items-center justify-center text-center p-1.5 transition-shadow ${shapeClass} ${colorClasses} ${
                      editLayoutMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${isSelected ? "ring-4 ring-brand-500/40 z-20" : "z-10"}`}
                  >
                    {renderChairs(t)}
                    <div className="font-bold text-xs leading-tight">
                      T{t.table_number}
                      <span className="font-normal text-[10px] ml-1 opacity-75">
                        ({t.capacity}p)
                      </span>
                    </div>
                    {conflict ? (
                      <div className="text-[10px] font-semibold truncate max-w-full px-1 mt-0.5">
                        {conflict.customer?.name?.split(" ")[0] ?? "Guest"} ·{" "}
                        {conflict.time.slice(0, 5)}
                      </div>
                    ) : (
                      <div className="text-[10px] opacity-75">
                        {t.is_active ? "Open" : "Closed"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Inspector & Customizer Panel */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 h-fit">
            {selectedTable ? (
              <>
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">
                      Table {selectedTable.table_number}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {selectedTable.section} · {selectedTable.capacity} Seats
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      !selectedTable.is_active
                        ? "bg-gray-200 text-gray-600"
                        : selectedTable.is_available
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {!selectedTable.is_active
                      ? "Inactive"
                      : selectedTable.is_available
                      ? "Available"
                      : "Occupied / Reserved"}
                  </span>
                </div>

                {/* Live Guest Info or Quick Book */}
                {selectedTable.conflicting_reservation ? (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="font-semibold text-gray-900 text-sm">
                      {selectedTable.conflicting_reservation.customer?.name ?? "Guest"}
                    </div>
                    <div className="text-gray-600">
                      Time: <strong>{selectedTable.conflicting_reservation.time.slice(0, 5)}</strong>{" "}
                      ({selectedTable.conflicting_reservation.duration_minutes || 90} mins) ·{" "}
                      <strong>{selectedTable.conflicting_reservation.pax} pax</strong>
                    </div>
                    {selectedTable.conflicting_reservation.notes && (
                      <div className="text-amber-800 italic">
                        &ldquo;{selectedTable.conflicting_reservation.notes}&rdquo;
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setEditingReservationId(selectedTable.conflicting_reservation!.id)
                      }
                      className="w-full mt-1 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:bg-blue-50"
                    >
                      Edit Reservation
                    </button>
                  </div>
                ) : (
                  selectedTable.is_active && (
                    <button
                      onClick={() => setBookingTableNumber(selectedTable.table_number)}
                      className="w-full py-2.5 bg-brand-500 text-white rounded-xl text-xs font-semibold hover:bg-brand-600 flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="w-4 h-4" />
                      Book Table {selectedTable.table_number} at {checkTime}
                    </button>
                  )
                )}

                {/* Geometry & Layout Controls */}
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase">
                    Table Shape & Geometry
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {(["round", "square", "rectangle", "booth"] as TableShape[]).map((sh) => (
                      <button
                        key={sh}
                        onClick={() => {
                          const w = sh === "rectangle" || sh === "booth" ? 145 : 88;
                          const h = sh === "rectangle" ? 85 : 88;
                          handleUpdateTableGeometry(selectedTable, {
                            shape: sh,
                            width: w,
                            height: h,
                          });
                        }}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium capitalize ${
                          selectedTable.shape === sh
                            ? "border-brand-500 bg-brand-50 text-brand-700"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {sh}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        Width ({selectedTable.width}px)
                      </label>
                      <input
                        type="range"
                        min={65}
                        max={200}
                        step={5}
                        value={selectedTable.width}
                        onChange={(e) =>
                          handleUpdateTableGeometry(selectedTable, {
                            width: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">
                        Height ({selectedTable.height}px)
                      </label>
                      <input
                        type="range"
                        min={65}
                        max={160}
                        step={5}
                        value={selectedTable.height}
                        onChange={(e) =>
                          handleUpdateTableGeometry(selectedTable, {
                            height: parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() =>
                        handleUpdateTableGeometry(selectedTable, {
                          rotation: ((selectedTable.rotation || 0) + 45) % 360,
                        })
                      }
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Rotate ({selectedTable.rotation || 0}°)
                    </button>
                    <button
                      onClick={() => handleToggleActive(selectedTable)}
                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {selectedTable.is_active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() => handleDeleteTable(selectedTable)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-10 space-y-2">
                <Armchair className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-sm font-medium text-gray-700">Select a Table on the Map</p>
                <p className="text-xs text-gray-400">
                  Click any table on the 2D floor plan to view its active reservation, book it for{" "}
                  {checkTime}, or customize its shape & dimensions.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Classic Section Grid View */
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
                              Up to {t.capacity} guests · {t.shape}
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
                Add Table to Floor
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

              <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                  <select
                    value={newShape}
                    onChange={(e) => setNewShape(e.target.value as TableShape)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="round">Round</option>
                    <option value="square">Square</option>
                    <option value="rectangle">Rectangle</option>
                    <option value="booth">Booth</option>
                  </select>
                </div>
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

      {bookingTableNumber !== null && (
        <CreateReservationModal
          defaultDate={checkDate}
          defaultTime={checkTime}
          defaultTableNumber={bookingTableNumber}
          onClose={() => setBookingTableNumber(null)}
          onCreated={loadData}
        />
      )}

      {editingReservationId && selectedTable?.conflicting_reservation && (
        <EditReservationModal
          reservation={selectedTable.conflicting_reservation}
          onClose={() => setEditingReservationId(null)}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
