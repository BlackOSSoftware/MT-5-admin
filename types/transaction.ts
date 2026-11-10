export type AdminTransaction = {
  _id?: string;
  account?: string;
  referenceType?: string;
  amount?: number;
  balanceAfter?: number;
  createdAt?: string;
  notes?: string;
  remark?: string;
  transactionType?: string;
  transactionMode?: string;
  type?: string;
  mode?: string;
  status?: string;
  referenceId?: string;
  referenceDisplay?: string;
};

export type AdminTransactionPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminTransactionSummary = {
  totalCount?: number;
  totalAmount?: number;
};

export type AdminTransactionListResponse = {
  success?: boolean;
  data: AdminTransaction[];
  summary?: AdminTransactionSummary;
  pagination: AdminTransactionPagination;
};
