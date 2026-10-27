import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
  timeout: 20000,
});

// 🔐 attach token + broker scope (Broker Admin only; SuperAdmin = no header = all data)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const platformRole = localStorage.getItem("platformRole");
    let brokerId = localStorage.getItem("brokerId");
    // Recover broker scope if login stored memberships but brokerId was cleared.
    // Broker admins MUST send x-broker-id or deposit/withdraw lists look empty / wrong.
    if (!brokerId && platformRole !== "SUPER_ADMIN") {
      try {
        const raw = localStorage.getItem("memberships");
        const memberships = raw ? JSON.parse(raw) : [];
        const first =
          memberships?.[0]?.brokerId ||
          memberships?.[0]?.broker?._id ||
          memberships?.[0]?.broker?.id ||
          "";
        if (first) {
          brokerId = String(first);
          localStorage.setItem("brokerId", brokerId);
        }
      } catch {
        // ignore bad memberships JSON
      }
    }
    if (platformRole !== "SUPER_ADMIN" && brokerId) {
      config.headers["x-broker-id"] = brokerId;
    } else if (config.headers?.["x-broker-id"]) {
      delete config.headers["x-broker-id"];
    }
  }
  return config;
});

export default api;
