"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Armchair,
  UtensilsCrossed,
  Receipt,
  BarChart3,
  Megaphone,
  Wrench,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reservations", label: "Reservations", icon: CalendarDays },
  { href: "/tables", label: "Tables & Rates", icon: Armchair },
  { href: "/customers", label: "CRM & Guests", icon: Users },
  { href: "/pos", label: "POS & Accounting", icon: Receipt },
  { href: "/marketing", label: "Marketing & Experience", icon: Megaphone },
  { href: "/operations", label: "Staff, Stock & Maint.", icon: Wrench },
  { href: "/analytics", label: "Reports & Analytics", icon: BarChart3 },
  { href: "/book", label: "Online Booking & OTA", icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg text-gray-900 block leading-none">
              Restaurateur
            </span>
            <span className="text-[11px] text-gray-400">Hospitality Suite</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">Full Suite v0.3.0</p>
      </div>
    </aside>
  );
}
