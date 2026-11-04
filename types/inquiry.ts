// types/inquiry.ts

export type InquiryStatus = "OPEN" | "REVIEWED" | "CLOSED" | string;

export type Inquiry = {
  _id: string;
  ticketId?: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  description: string;
  ip: string;
  status?: InquiryStatus;
  adminNote?: string;
  reviewedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type GetInquiryResponse = {
  success: boolean;
  data: Inquiry[];
  total: number;
  page: number;
  totalPages: number;
};
