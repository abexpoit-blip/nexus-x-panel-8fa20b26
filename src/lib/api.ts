// API client for nexus-backend
const BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:4000/api";
const TOKEN_KEY = "nexus_token";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T = any>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any).error || `Request failed: ${res.status}`);
  return data as T;
}

export type Agent = {
  id: number; username: string; role: string; balance: number; otp_count: number;
  daily_limit: number; per_request_limit: number; status: string;
  telegram?: string; phone?: string; full_name?: string; created_at: number;
};
export type Allocation = {
  id: number; user_id: number; username?: string; provider: string;
  country_code?: string; operator?: string; phone_number: string;
  otp?: string | null; status: string; allocated_at: number; otp_received_at?: number;
};
export type Rate = {
  id: number; provider: string; country_code?: string; country_name?: string;
  operator?: string; price_bdt: number; active: number; updated_at: number;
};
export type CDR = {
  id: number; user_id: number; username?: string; provider: string;
  country_code?: string; operator?: string; phone_number: string; otp_code?: string;
  price_bdt: number; status: string; note?: string; created_at: number;
};
export type Payment = {
  id: number; user_id: number; username?: string; amount_bdt: number;
  type: string; method?: string; reference?: string; note?: string; created_at: number;
};
export type Notification = {
  id: number; user_id: number | null; title: string; message: string;
  type: string; is_read: number; created_at: number;
};

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ token: string; user: any }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request<{ user: any }>("/auth/me"),

  // Numbers
  providers: () => request<{ providers: { id: string; name: string }[] }>("/numbers/providers"),
  countries: (provider: string) => request<{ countries: any[] }>(`/numbers/countries/${provider}`),
  operators: (provider: string, countryId: number) =>
    request<{ operators: any[] }>(`/numbers/operators/${provider}/${countryId}`),
  getNumber: (body: { provider: string; country_id?: number; operator_id?: number; count?: number }) =>
    request<{ allocated: any[]; errors: string[] }>("/numbers/get", { method: "POST", body: JSON.stringify(body) }),
  myNumbers: () => request<{ numbers: Allocation[] }>("/numbers/my"),
  releaseNumber: (id: number) => request(`/numbers/release/${id}`, { method: "POST" }),
  numberSummary: () => request<{ today: { c: number; s: number }; week: { c: number; s: number }; month: { c: number; s: number }; active: number }>("/numbers/summary"),
  syncOtp: () => request<{ updated: number }>("/otp/sync", { method: "POST" }),

  // Rates
  rates: {
    list: () => request<{ rates: Rate[] }>("/rates"),
    create: (body: Partial<Rate>) => request<{ id: number }>("/rates", { method: "POST", body: JSON.stringify(body) }),
    update: (id: number, body: Partial<Rate>) => request(`/rates/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    remove: (id: number) => request(`/rates/${id}`, { method: "DELETE" }),
  },

  // CDR
  cdr: {
    mine: () => request<{ cdr: CDR[] }>("/cdr/mine"),
    all: () => request<{ cdr: CDR[] }>("/cdr"),
    refund: (id: number, note?: string) => request(`/cdr/${id}/refund`, { method: "POST", body: JSON.stringify({ note }) }),
  },

  // Payments
  payments: {
    mine: () => request<{ payments: Payment[] }>("/payments/mine"),
    all: () => request<{ payments: Payment[] }>("/payments"),
    topup: (body: { user_id: number; amount_bdt: number; method?: string; reference?: string; note?: string }) =>
      request("/payments/topup", { method: "POST", body: JSON.stringify(body) }),
  },

  // Notifications
  notifications: {
    list: () => request<{ notifications: Notification[]; unread: number }>("/notifications"),
    markRead: (id: number) => request(`/notifications/${id}/read`, { method: "POST" }),
    markAllRead: () => request("/notifications/read-all", { method: "POST" }),
    broadcast: (body: { title: string; message: string; type?: string; user_id?: number | null }) =>
      request("/notifications/broadcast", { method: "POST", body: JSON.stringify(body) }),
  },

  // Settings
  settings: {
    getPublic: () => request<{ signup_enabled: boolean }>("/settings/public"),
    getAll: () => request<{ settings: Record<string, string> }>("/settings"),
    set: (key: string, value: string) => request(`/settings/${key}`, { method: "PUT", body: JSON.stringify({ value }) }),
  },

  // Admin
  admin: {
    agents: () => request<{ agents: Agent[] }>("/admin/agents"),
    createAgent: (body: any) => request<{ id: number }>("/admin/agents", { method: "POST", body: JSON.stringify(body) }),
    updateAgent: (id: number, body: any) => request(`/admin/agents/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteAgent: (id: number) => request(`/admin/agents/${id}`, { method: "DELETE" }),
    stats: () => request<{
      totalAgents: number; activeAgents: number; totalAlloc: number; activeAlloc: number;
      totalOtp: number; todayOtp: number; todayRevenue: number; totalRevenue: number;
    }>("/admin/stats"),
    leaderboard: () => request<{ leaderboard: { id: number; username: string; otp_count: number }[] }>("/admin/leaderboard"),
    allocations: () => request<{ allocations: Allocation[] }>("/admin/allocations"),
  },
};
