import { cn } from "@/lib/utils";
import type { ReservationStatus, LoyaltyTier } from "@/lib/api";

const statusConfig: Record<ReservationStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-700" },
  expected: { label: "Expected", className: "bg-blue-100 text-blue-700" },
  seated: { label: "Seated", className: "bg-green-100 text-green-700" },
  completed: { label: "Completed", className: "bg-gray-100 text-gray-500" },
  no_show: { label: "No-Show", className: "bg-red-100 text-red-700" },
};

export function StatusBadge({ status }: { status: ReservationStatus }) {
  const config = statusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", config.className)}>
      {config.label}
    </span>
  );
}

const tierConfig: Record<LoyaltyTier, { label: string; className: string }> = {
  none: { label: "—", className: "bg-gray-100 text-gray-500" },
  silver: { label: "Silver", className: "bg-gray-200 text-gray-700" },
  gold: { label: "Gold", className: "bg-amber-100 text-amber-700" },
  vip: { label: "VIP", className: "bg-purple-100 text-purple-700" },
};

export function TierBadge({ tier }: { tier: LoyaltyTier }) {
  const config = tierConfig[tier];
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold", config.className)}>
      {config.label}
    </span>
  );
}
