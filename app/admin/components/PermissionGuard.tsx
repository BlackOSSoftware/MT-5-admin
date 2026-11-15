"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminMe } from "@/hooks/useAdmin";
import { canAccessAdminPath } from "@/utils/adminPermissions";
import GlobalLoader from "./ui/GlobalLoader";

/**
 * Blocks direct URL access to admin pages the broker admin has no
 * permission for. Sidebar hiding is cosmetic — this + backend checks
 * are the real gate.
 */
export default function PermissionGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: me, isLoading } = useAdminMe();

  const allowed = me ? canAccessAdminPath(me, pathname) : true;

  useEffect(() => {
    if (!isLoading && me && !allowed) {
      router.replace("/admin");
    }
  }, [isLoading, me, allowed, router]);

  if (isLoading || (me && !allowed)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <GlobalLoader />
      </div>
    );
  }

  return <>{children}</>;
}
