export const API_BASE = "/api";

export type LoyaltyTier = "none" | "silver" | "gold" | "vip";
export type ReservationStatus = "pending" | "expected" | "seated" | "completed" | "no_show";

export interface Customer {
  id: string;
  phone_number: string;
  name: string;
  total_visits: number;
  lifetime_spend: number;
  loyalty_tier: LoyaltyTier;
  no_show_count: number;
  preferred_pax: number | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CustomerDetail extends Customer {
  reservations: Reservation[];
}

export interface Reservation {
  id: string;
  customer_id: string;
  date: string;
  time: string;
  pax: number;
  status: ReservationStatus;
  table_number: number | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer?: Customer;
}

export interface DashboardStats {
  total_reservations: number;
  expected: number;
  seated: number;
  completed: number;
  no_shows: number;
  total_pax: number;
}

export interface TimelineSlot {
  time: string;
  reservations: Reservation[];
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Dashboard
  getStats: (date?: string) =>
    fetchAPI<DashboardStats>(`/dashboard/stats${date ? `?date=${date}` : ""}`),
  getTimeline: (date?: string) =>
    fetchAPI<TimelineSlot[]>(`/dashboard/timeline${date ? `?date=${date}` : ""}`),

  // Reservations
  getReservations: (params?: { date?: string; status?: ReservationStatus }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return fetchAPI<Reservation[]>(`/reservations/${qs ? `?${qs}` : ""}`);
  },
  createReservation: (data: {
    phone_number: string;
    name: string;
    date: string;
    time: string;
    pax: number;
    table_number?: number | null;
    notes?: string | null;
  }) =>
    fetchAPI<Reservation>("/reservations/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateReservation: (id: string, data: {
    status?: ReservationStatus;
    table_number?: number | null;
    notes?: string | null;
  }) =>
    fetchAPI<Reservation>(`/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteReservation: (id: string) =>
    fetchAPI<void>(`/reservations/${id}`, { method: "DELETE" }),

  // Customers
  getCustomers: (search?: string) =>
    fetchAPI<Customer[]>(`/customers/${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  getCustomer: (id: string) => fetchAPI<CustomerDetail>(`/customers/${id}`),
  updateCustomer: (id: string, data: { name?: string; loyalty_tier?: LoyaltyTier; tags?: string[] }) =>
    fetchAPI<Customer>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};
