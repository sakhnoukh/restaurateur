export const API_BASE = "/api";

export type LoyaltyTier = "none" | "silver" | "gold" | "vip";
export type ReservationStatus = "pending" | "expected" | "seated" | "completed" | "no_show";
export type BookingSource = "phone" | "walk_in" | "online" | "whatsapp" | "ota";
export type PaymentMethod = "cash" | "card" | "instapay" | "wallet";
export type DepositStatus = "none" | "required" | "paid" | "refunded";
export type StaffRole = "manager" | "host" | "server" | "chef";
export type MaintenancePriority = "low" | "medium" | "high" | "critical";
export type MaintenanceStatus = "open" | "in_progress" | "resolved";

export interface Customer {
  id: string;
  phone_number: string;
  name: string;
  email: string | null;
  total_visits: number;
  lifetime_spend: number;
  loyalty_tier: LoyaltyTier;
  no_show_count: number;
  preferred_pax: number | null;
  dietary_notes: string | null;
  birthday: string | null;
  anniversary: string | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  phone_number: string | null;
  assigned_section: string | null;
  shift: string;
  is_active: boolean;
  created_at: string | null;
  reservations_handled?: number;
  covers_served?: number;
  revenue_generated?: number;
  tips_earned?: number;
  avg_rating?: number | null;
}

export interface OrderItem {
  menu_item_id?: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Transaction {
  id: string;
  reservation_id: string;
  pos_receipt_id: string | null;
  amount: number;
  tip_amount: number;
  payment_method: PaymentMethod;
  items_json: OrderItem[] | null;
  created_at: string | null;
}

export type TableShape = "round" | "square" | "rectangle" | "booth";

export interface Reservation {
  id: string;
  customer_id: string;
  server_id: string | null;
  date: string;
  time: string;
  duration_minutes: number;
  pax: number;
  status: ReservationStatus;
  table_number: number | null;
  notes: string | null;
  occasion: string | null;
  source: BookingSource;
  external_booking_ref: string | null;
  min_spend_required: number;
  deposit_amount: number;
  deposit_status: DepositStatus;
  guest_rating: number | null;
  guest_feedback: string | null;
  created_at: string | null;
  updated_at: string | null;
  customer?: Customer;
  server?: StaffMember | null;
  transactions?: Transaction[];
}

export interface CustomerDetail extends Customer {
  reservations: Reservation[];
}

export interface RestaurantTable {
  id: string;
  table_number: number;
  capacity: number;
  section: string;
  min_spend_per_pax: number;
  x_pos: number;
  y_pos: number;
  width: number;
  height: number;
  shape: TableShape;
  rotation: number;
  is_active: boolean;
  created_at: string | null;
}

export interface TableAvailability extends RestaurantTable {
  is_available: boolean;
  conflicting_reservation: Reservation | null;
}

export interface RateRule {
  id: string;
  name: string;
  section: string;
  day_of_week: string;
  start_time: string;
  min_spend_per_pax: number;
  deposit_per_pax: number;
  min_party_size_for_deposit: number;
  is_active: boolean;
  created_at: string | null;
}

export interface RateQuote {
  min_spend_required: number;
  deposit_amount: number;
  deposit_required: boolean;
  applied_rule: string | null;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string | null;
}

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  recorded_by: string | null;
  created_at: string | null;
}

export interface AccountingSummary {
  gross_revenue: number;
  total_tips: number;
  total_expenses: number;
  net_profit: number;
  by_payment_method: Record<string, number>;
  expenses_by_category: Record<string, number>;
  transactions_count: number;
  recent_expenses: Expense[];
}

export interface Campaign {
  id: string;
  name: string;
  channel: string;
  target_segment: string;
  message_template: string;
  recipients_count: number;
  status: string;
  created_at: string | null;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  current_stock: number;
  par_level: number;
  cost_per_unit: number;
  supplier: string | null;
  updated_at: string | null;
}

export interface MaintenanceTicket {
  id: string;
  equipment_name: string;
  location: string;
  issue_description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_to: string | null;
  estimated_cost: number;
  created_at: string | null;
  resolved_at: string | null;
}

export interface TimeSlotAvailability {
  time: string;
  available_tables: number;
  max_party_size: number;
  min_spend_per_pax: number;
}

export interface DashboardStats {
  total_reservations: number;
  expected: number;
  seated: number;
  completed: number;
  no_shows: number;
  total_pax: number;
  daily_revenue: number;
  vip_arrivals: number;
  low_stock_alerts: number;
  open_maintenance_tickets: number;
}

export interface TimelineSlot {
  time: string;
  reservations: Reservation[];
}

export interface AnalyticsReport {
  total_revenue: number;
  total_reservations: number;
  total_covers: number;
  avg_spend_per_cover: number;
  completion_rate: number;
  no_show_rate: number;
  avg_guest_rating: number | null;
  revenue_by_section: Record<string, number>;
  bookings_by_source: Record<string, number>;
  peak_hours: { hour: string; reservations: number; covers: number }[];
  top_customers: Customer[];
  staff_leaderboard: StaffMember[];
}

async function fetchAPI<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    let message = `API error: ${res.status}`;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      } else if (body?.detail) {
        message = JSON.stringify(body.detail);
      }
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Dashboard & Analytics
  getStats: (date?: string) =>
    fetchAPI<DashboardStats>(`/dashboard/stats${date ? `?date=${date}` : ""}`),
  getTimeline: (date?: string) =>
    fetchAPI<TimelineSlot[]>(`/dashboard/timeline${date ? `?date=${date}` : ""}`),
  getAnalytics: () => fetchAPI<AnalyticsReport>("/dashboard/analytics"),

  // Reservations
  getReservations: (params?: { date?: string; status?: ReservationStatus }) => {
    const query = new URLSearchParams();
    if (params?.date) query.set("date", params.date);
    if (params?.status) query.set("status", params.status);
    const qs = query.toString();
    return fetchAPI<Reservation[]>(`/reservations${qs ? `?${qs}` : ""}`);
  },
  createReservation: (data: {
    phone_number: string;
    name: string;
    date: string;
    time: string;
    duration_minutes?: number;
    pax: number;
    table_number?: number | null;
    server_id?: string | null;
    notes?: string | null;
    occasion?: string | null;
    source?: BookingSource;
    deposit_status?: DepositStatus;
  }) =>
    fetchAPI<Reservation>("/reservations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateReservation: (
    id: string,
    data: {
      date?: string;
      time?: string;
      duration_minutes?: number;
      pax?: number;
      status?: ReservationStatus;
      table_number?: number | null;
      server_id?: string | null;
      notes?: string | null;
      occasion?: string | null;
      source?: BookingSource;
      deposit_status?: DepositStatus;
      guest_rating?: number | null;
      guest_feedback?: string | null;
    }
  ) =>
    fetchAPI<Reservation>(`/reservations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteReservation: (id: string) =>
    fetchAPI<void>(`/reservations/${id}`, { method: "DELETE" }),

  // Transactions
  createTransaction: (
    reservationId: string,
    data: {
      amount: number;
      tip_amount?: number;
      payment_method?: PaymentMethod;
      pos_receipt_id?: string | null;
      items_json?: OrderItem[] | null;
      mark_completed?: boolean;
    }
  ) =>
    fetchAPI<Transaction>(`/reservations/${reservationId}/transactions`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getReservationTransactions: (reservationId: string) =>
    fetchAPI<Transaction[]>(`/reservations/${reservationId}/transactions`),

  // Customers
  getCustomers: (search?: string) =>
    fetchAPI<Customer[]>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  lookupCustomerByPhone: (phone: string) =>
    fetchAPI<Customer | null>(`/customers/lookup?phone=${encodeURIComponent(phone)}`),
  getCustomer: (id: string) => fetchAPI<CustomerDetail>(`/customers/${id}`),
  createCustomer: (data: {
    phone_number: string;
    name: string;
    email?: string | null;
    loyalty_tier?: LoyaltyTier;
    preferred_pax?: number | null;
    dietary_notes?: string | null;
    birthday?: string | null;
    anniversary?: string | null;
    tags?: string[] | null;
  }) =>
    fetchAPI<Customer>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCustomer: (
    id: string,
    data: {
      name?: string;
      phone_number?: string;
      email?: string | null;
      loyalty_tier?: LoyaltyTier;
      preferred_pax?: number | null;
      dietary_notes?: string | null;
      birthday?: string | null;
      anniversary?: string | null;
      tags?: string[];
    }
  ) =>
    fetchAPI<Customer>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // Tables & Rate Rules
  getTables: (activeOnly?: boolean) =>
    fetchAPI<RestaurantTable[]>(`/tables${activeOnly ? "?active_only=true" : ""}`),
  getTablesAvailability: (params: {
    date: string;
    time?: string;
    pax?: number;
    exclude_reservation_id?: string;
  }) => {
    const query = new URLSearchParams();
    query.set("date", params.date);
    if (params.time) query.set("time", params.time);
    if (params.pax) query.set("pax", String(params.pax));
    if (params.exclude_reservation_id) query.set("exclude_reservation_id", params.exclude_reservation_id);
    return fetchAPI<TableAvailability[]>(`/tables/availability?${query.toString()}`);
  },
  createTable: (data: {
    table_number: number;
    capacity: number;
    section?: string;
    min_spend_per_pax?: number;
    x_pos?: number;
    y_pos?: number;
    width?: number;
    height?: number;
    shape?: TableShape;
    rotation?: number;
    is_active?: boolean;
  }) =>
    fetchAPI<RestaurantTable>("/tables", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTable: (
    id: string,
    data: {
      capacity?: number;
      section?: string;
      min_spend_per_pax?: number;
      x_pos?: number;
      y_pos?: number;
      width?: number;
      height?: number;
      shape?: TableShape;
      rotation?: number;
      is_active?: boolean;
    }
  ) =>
    fetchAPI<RestaurantTable>(`/tables/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteTable: (id: string) =>
    fetchAPI<void>(`/tables/${id}`, { method: "DELETE" }),
  getRateRules: () => fetchAPI<RateRule[]>("/tables/rates"),
  createRateRule: (data: {
    name: string;
    section: string;
    day_of_week: string;
    start_time: string;
    min_spend_per_pax: number;
    deposit_per_pax: number;
    min_party_size_for_deposit: number;
  }) =>
    fetchAPI<RateRule>("/tables/rates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteRateRule: (id: string) =>
    fetchAPI<void>(`/tables/rates/${id}`, { method: "DELETE" }),
  getRateQuote: (params: {
    date: string;
    time: string;
    pax: number;
    table_number?: number;
    section?: string;
    customer_no_shows?: number;
  }) => {
    const q = new URLSearchParams();
    q.set("date", params.date);
    q.set("time", params.time);
    q.set("pax", String(params.pax));
    if (params.table_number) q.set("table_number", String(params.table_number));
    if (params.section) q.set("section", params.section);
    if (params.customer_no_shows) q.set("customer_no_shows", String(params.customer_no_shows));
    return fetchAPI<RateQuote>(`/tables/quote?${q.toString()}`);
  },

  // POS & Accounting
  getMenuItems: (availableOnly?: boolean) =>
    fetchAPI<MenuItem[]>(`/pos/menu${availableOnly ? "?available_only=true" : ""}`),
  createMenuItem: (data: {
    name: string;
    category: string;
    price: number;
    stock_quantity?: number;
    low_stock_threshold?: number;
  }) =>
    fetchAPI<MenuItem>("/pos/menu", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMenuItem: (
    id: string,
    data: { name?: string; category?: string; price?: number; is_available?: boolean; stock_quantity?: number }
  ) =>
    fetchAPI<MenuItem>(`/pos/menu/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMenuItem: (id: string) =>
    fetchAPI<void>(`/pos/menu/${id}`, { method: "DELETE" }),
  getAccountingSummary: (date?: string) =>
    fetchAPI<AccountingSummary>(`/pos/accounting${date ? `?date=${date}` : ""}`),
  createExpense: (data: {
    date: string;
    category: string;
    description: string;
    amount: number;
    payment_method: PaymentMethod;
    recorded_by?: string | null;
  }) =>
    fetchAPI<Expense>("/pos/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: string) =>
    fetchAPI<void>(`/pos/expenses/${id}`, { method: "DELETE" }),

  // Marketing & Segments
  getSegmentCustomers: (segment: string) =>
    fetchAPI<Customer[]>(`/marketing/segments?segment=${encodeURIComponent(segment)}`),
  getCampaigns: () => fetchAPI<Campaign[]>("/marketing/campaigns"),
  launchCampaign: (data: {
    name: string;
    channel: string;
    target_segment: string;
    message_template: string;
  }) =>
    fetchAPI<Campaign>("/marketing/campaigns", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Operations: Staff, Inventory & Maintenance
  getStaff: (activeOnly?: boolean) =>
    fetchAPI<StaffMember[]>(`/operations/staff${activeOnly ? "?active_only=true" : ""}`),
  createStaff: (data: {
    name: string;
    role: StaffRole;
    phone_number?: string | null;
    assigned_section?: string | null;
    shift?: string;
  }) =>
    fetchAPI<StaffMember>("/operations/staff", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateStaff: (
    id: string,
    data: {
      name?: string;
      role?: StaffRole;
      assigned_section?: string | null;
      shift?: string;
      is_active?: boolean;
    }
  ) =>
    fetchAPI<StaffMember>(`/operations/staff/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteStaff: (id: string) =>
    fetchAPI<void>(`/operations/staff/${id}`, { method: "DELETE" }),

  getInventory: () => fetchAPI<InventoryItem[]>("/operations/inventory"),
  createInventoryItem: (data: {
    name: string;
    category: string;
    unit: string;
    current_stock: number;
    par_level: number;
    cost_per_unit: number;
    supplier?: string | null;
  }) =>
    fetchAPI<InventoryItem>("/operations/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateInventoryItem: (
    id: string,
    data: { current_stock?: number; par_level?: number; cost_per_unit?: number; supplier?: string | null }
  ) =>
    fetchAPI<InventoryItem>(`/operations/inventory/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteInventoryItem: (id: string) =>
    fetchAPI<void>(`/operations/inventory/${id}`, { method: "DELETE" }),

  getMaintenanceTickets: () => fetchAPI<MaintenanceTicket[]>("/operations/maintenance"),
  createMaintenanceTicket: (data: {
    equipment_name: string;
    location: string;
    issue_description: string;
    priority: MaintenancePriority;
    assigned_to?: string | null;
    estimated_cost?: number;
  }) =>
    fetchAPI<MaintenanceTicket>("/operations/maintenance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateMaintenanceTicket: (
    id: string,
    data: { status?: MaintenanceStatus; priority?: MaintenancePriority; assigned_to?: string | null }
  ) =>
    fetchAPI<MaintenanceTicket>(`/operations/maintenance/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteMaintenanceTicket: (id: string) =>
    fetchAPI<void>(`/operations/maintenance/${id}`, { method: "DELETE" }),

  // Online Booking & OTA Webhook
  getBookingSlots: (params: { date: string; pax: number; section?: string }) => {
    const q = new URLSearchParams();
    q.set("date", params.date);
    q.set("pax", String(params.pax));
    if (params.section) q.set("section", params.section);
    return fetchAPI<TimeSlotAvailability[]>(`/booking/slots?${q.toString()}`);
  },
  createPublicBooking: (data: {
    name: string;
    phone_number: string;
    email?: string | null;
    date: string;
    time: string;
    pax: number;
    section_preference?: string | null;
    occasion?: string | null;
    dietary_notes?: string | null;
    notes?: string | null;
  }) =>
    fetchAPI<Reservation>("/booking/reserve", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  simulateOTAWebhook: (data: {
    provider: string;
    external_ref: string;
    guest_name: string;
    guest_phone: string;
    date: string;
    time: string;
    party_size: number;
    notes?: string;
    occasion?: string;
  }) =>
    fetchAPI<Reservation>("/booking/ota-webhook", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
