import { useQuery } from "@tanstack/react-query";
import { getAdminNotificationsService } from "@/services/notification/notification.services";

interface UseGetAdminNotificationsProps {
  page: number;
  limit: number;
  q?: string;
}

export const useGetAdminNotifications = ({
  page,
  limit,
  q = "",
}: UseGetAdminNotificationsProps) => {
  return useQuery({
    queryKey: ["admin-notifications", page, limit, q] as const,
    queryFn: () => getAdminNotificationsService(page, limit, q),
    staleTime: 60 * 1000,
  });
};
