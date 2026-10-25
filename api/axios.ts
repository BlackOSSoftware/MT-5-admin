import axios from "axios";

const api = axios.create({ 
  baseURL: process.env.NEXT_PUBLIC_API_URL, 
  headers: {
     "Content-Type": "application/json", 
    }, withCredentials: true, 
  });

// 🔐 attach token + broker scope (Broker Admin only; SuperAdmin = no header = all data)
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const platformRole = localStorage.getItem("platformRole");
    const brokerId = localStorage.getItem("brokerId");
    if (platformRole !== "SUPER_ADMIN" && brokerId) {
      config.headers["x-broker-id"] = brokerId;
    } else if (config.headers?.["x-broker-id"]) {
      delete config.headers["x-broker-id"];
    }
  }
  return config;
});

export default api;
