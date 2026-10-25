import api from "@/api/axios";

export type LoginPayload = {
  email: string;
  password: string;
  fcmToken: null;
};

export type BrokerMembership = {
  brokerId: string;
  role: string;
  permissions: string[];
  broker?: {
    _id: string;
    code: string;
    displayName: string;
    status?: string;
  } | null;
};

export type LoginResponse = {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    role: string;
    platformRole?: string | null;
    brokerId?: string | null;
    memberships?: BrokerMembership[];
    isMailVerified?: boolean;
  };
};

export type LogoutPayload = {
  refreshToken: string;
};

export const loginService = async (
  payload: LoginPayload
): Promise<LoginResponse> => {
  const res = await api.post("/auth/login", payload);
  return res.data;
  
};

export const logoutService = async (refreshToken: string) => {
  const res = await api.post("/auth/logout", {
    refreshToken,
  });
  return res.data;
};

export type AdminSignupProfilePayload = {
  date_of_birth: string;
  gender: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
};

export type AdminSignupPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  isMailVerified: boolean;
  kycStatus: string;
  profile: AdminSignupProfilePayload;
};

export type AdminSignupResponse = {
  success: boolean;
  message?: string;
  data?: {
    user_id: string;
    message?: string;
  };
};

export const adminSignupService = async (
  payload: AdminSignupPayload
): Promise<AdminSignupResponse> => {
  const res = await api.post<AdminSignupResponse>("/auth/admin/signup", payload);

  if (res.data && typeof res.data === "object" && res.data.success === false) {
    const message = res.data.message || res.data.data?.message || "Request failed.";
    throw new Error(message);
  }

  return res.data;
};
