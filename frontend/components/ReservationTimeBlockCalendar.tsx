"use client";

import { useState } from "react";
import { Plus, Receipt, Pencil, Armchair, Users } from "lucide-react";
import type { Reservation, RestaurantTable, ReservationStatus } from "@/lib/api";

interface ReservationTimeBlockCalendarProps {
  reservations: Reservation[];
  tables: RestaurantTable[];
  selectedDate: string;
  onCreateSlot: (tableNumber: number | null, timeStr: string) => void;
  onSelectReservation: (reservation: Reservation) => void;
  onBillReservation: (reservation: Reservation) => void;
  onStatusChange: (id: string, status: ReservationStatus) => void;
}

const START_HOUR = 12; // 12:00
const END_HOUR = 24;   // 00:00 (12 hours = 720 minutes)
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;

const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

function timeToMinutesFromStart(timeStr: string): number {
  const parts = timeStr.split(":");
  const h = parseInt(parts[0], 10) || 12;
  const m = parseInt(parts[1], 10) || 0;
  return Math.max(0, (h - START_HOUR) * 60 + m);
}

const blockStyles: Record<ReservationStatus, string> = {
  pending: "bg-gray-100 border-gray-400 text-gray-800",
  expected: "bg-blue-100/95 border-blue-500 text-blue-950 hover:bg-blue-200/80",
  seated: "bg-emerald-100/95 border-emerald-600 text-emerald-950 hover:bg-emerald-200/80",
  completed: "bg-slate-200/90 border-slate-500 text-slate-800 hover:bg-slate-300/80",
  no_show: "bg-red-100/90 border-red-500 text-red-900 opacity-75",
};

export function ReservationTimeBlockCalendar({
  reservations,
  tables,
  onCreateSlot,
  onSelectReservation,
  onBillReservation,
  onStatusChange,
}: ReservationTimeBlockCalendarProps) {
  const [hoveredCell, setHoveredCell] = useState<{ table: number | null; hour: number } | null>(
    null
  );

  const unassignedReservations = reservations.filter((r) => !r.table_number);

  const renderRowBlocks = (rowReservations: Reservation[]) => {
    return rowReservations.map((r) => {
      const startMins = timeToMinutesFromStart(r.time);
      const duration = r.duration_minutes || 90;
      const leftPct = Math.min(96, (startMins / TOTAL_MINUTES) * 100);
      const widthPct = Math.max(6, Math.min(100 - leftPct, (duration / TOTAL_MINUTES) * 100));
      const billSum = r.transactions?.reduce((acc, tx) => acc + tx.amount, 0) ?? 0;

      return (
        <div
          key={r.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelectReservation(r);
          }}
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
          }}
          className={`absolute top-1.5 bottom-1.5 rounded-lg border-l-4 border px-2 py-1 shadow-sm cursor-pointer transition-all overflow-hidden flex flex-col justify-between group z-10 ${
            blockStyles[r.status]
          }`}
          title={`${r.customer?.name ?? "Guest"} (${r.pax} pax) · ${r.time.slice(0, 5)} (${duration}m)`}
        >
          <div className="flex items-center justify-between gap-1 min-w-0">
            <span className="font-bold text-xs truncate">
              {r.customer?.name ?? "Guest"}
            </span>
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-white/60 shrink-0">
              {r.pax}p
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px] opacity-85 truncate">
            <span>
              {r.time.slice(0, 5)} · {duration}m
              {r.occasion ? ` · ${r.occasion}` : ""}
              {billSum > 0 ? ` · ${billSum} EGP` : ""}
            </span>

            {/* Quick Hover Actions inside Time Block */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="hidden group-hover:flex items-center gap-1 bg-white/90 px-1 py-0.5 rounded shadow-sm"
            >
              {r.status === "expected" && (
                <button
                  onClick={() => onStatusChange(r.id, "seated")}
                  className="text-[10px] font-bold text-emerald-700 hover:underline px-1"
                >
                  Seat
                </button>
              )}
              {r.status === "seated" && (
                <button
                  onClick={() => onBillReservation(r)}
                  className="text-[10px] font-bold text-emerald-700 hover:underline px-1 inline-flex items-center gap-0.5"
                >
                  <Receipt className="w-2.5 h-2.5" />
                  Bill
                </button>
              )}
              <button
                onClick={() => onSelectReservation(r)}
                className="text-gray-600 hover:text-gray-900 px-0.5"
              >
                <Pencil className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Legend Bar */}
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-gray-700">Reservation Time-Block Calendar</span>
          <span className="text-gray-400">
            Click any empty time slot to book · Click any reservation block to edit
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-200 border-l-2 border-blue-600" />
            Expected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-200 border-l-2 border-emerald-600" />
            Seated
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-200 border-l-2 border-slate-600" />
            Completed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-200 border-l-2 border-red-600" />
            No-Show
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[980px]">
          {/* Time Header Row */}
          <div className="flex border-b border-gray-200 bg-gray-50/70">
            <div className="w-44 shrink-0 px-4 py-2.5 border-r border-gray-200 text-xs font-semibold text-gray-600 uppercase">
              Table / Section
            </div>
            <div className="flex-1 grid grid-cols-12">
              {HOURS.map((hr) => (
                <div
                  key={hr}
                  className="px-2 py-2.5 border-r border-gray-200/70 text-xs font-semibold text-gray-600 text-center"
                >
                  {String(hr).padStart(2, "0")}:00
                </div>
              ))}
            </div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-100">
            {tables.map((table) => {
              const rowReservations = reservations.filter(
                (r) => r.table_number === table.table_number
              );
              return (
                <div key={table.id} className="flex h-16 hover:bg-gray-50/40 transition-colors">
                  {/* Table Label Column */}
                  <div className="w-44 shrink-0 px-4 py-2 border-r border-gray-200 flex flex-col justify-center bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                        <Armchair className="w-3.5 h-3.5 text-brand-500" />
                        Table {table.table_number}
                      </span>
                      <span className="text-[11px] text-gray-500 flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {table.capacity}p
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 truncate">{table.section}</span>
                  </div>

                  {/* Time Axis Cells + Positioned Reservation Time Blocks */}
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 grid grid-cols-12">
                      {HOURS.map((hr) => {
                        const isHovered =
                          hoveredCell?.table === table.table_number && hoveredCell?.hour === hr;
                        const slotStr = `${String(hr).padStart(2, "0")}:00`;
                        return (
                          <div
                            key={hr}
                            onMouseEnter={() =>
                              setHoveredCell({ table: table.table_number, hour: hr })
                            }
                            onMouseLeave={() => setHoveredCell(null)}
                            onClick={() => onCreateSlot(table.table_number, slotStr)}
                            className="border-r border-gray-100 h-full cursor-pointer flex items-center justify-center group"
                          >
                            {isHovered && (
                              <span className="opacity-0 group-hover:opacity-100 text-[10px] font-medium text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Plus className="w-3 h-3" />
                                {slotStr}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {renderRowBlocks(rowReservations)}
                  </div>
                </div>
              );
            })}

            {/* Unassigned / Walk-in Row */}
            {unassignedReservations.length > 0 && (
              <div className="flex h-16 bg-amber-50/20">
                <div className="w-44 shrink-0 px-4 py-2 border-r border-gray-200 flex flex-col justify-center">
                  <span className="font-semibold text-amber-800 text-xs">
                    Unassigned Table
                  </span>
                  <span className="text-[11px] text-amber-600">
                    {unassignedReservations.length} pending assignment
                  </span>
                </div>
                <div className="flex-1 relative">
                  <div className="absolute inset-0 grid grid-cols-12">
                    {HOURS.map((hr) => (
                      <div key={hr} className="border-r border-gray-100 h-full" />
                    ))}
                  </div>
                  {renderRowBlocks(unassignedReservations)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
