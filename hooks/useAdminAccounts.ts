import { useQuery } from "@tanstack/react-query";
import {
  adminAccountsService,
  type AdminAccountsSearchParams,
} from "@/services/adminAccounts.service";

export const useAdminAccountsSearch = (params: AdminAccountsSearchParams) =>
  useQuery({
    queryKey: ["admin-accounts-search", params],
    queryFn: () => adminAccountsService.search(params),
    staleTime: 1000 * 20,
    placeholderData: (previous) => previous,
  });
