export type AdminUser = {
  _id: string;
  email: string;
  phone: string;
  name: string;
  userType: string;
  isMailVerified: boolean;
  kycStatus: string;
  createdAt: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
};

export type UserListPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminUserListResponse = {
  success: boolean;
  data: AdminUser[];
  pagination: UserListPagination;
};

export type UserListParams = {
  q?: string;
  kycStatus?: string;
  isMailVerified?: boolean;
  page?: number;
  limit?: number;
};

export type AdminUserProfile = {
  _id?: string;
  email?: string;
  phone?: string;
  name?: string;
  userType?: string;
  isMailVerified?: boolean;
  kycStatus?: string;
  createdAt?: string;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  date_of_birth?: string;
  gender?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};

export type AdminUserUpdatePayload = {
  name?: string;
  phone?: string;
  isMailVerified?: boolean;
  kycStatus?: string;
  date_of_birth?: string;
  gender?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
};
