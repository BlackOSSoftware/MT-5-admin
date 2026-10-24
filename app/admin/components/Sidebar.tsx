"use client";

import React, {
  JSX,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  LayoutDashboard,
  CandlestickChart,
  ShoppingCart,
  Users,
  ShieldCheck,
  CreditCard,
  Bell,
  DollarSign,
  Gift,
  Settings,
  Lock,
  Menu,
  MessageSquare,
  LogOut,
  ChevronDown,
  Activity,
  Wallet,
  FileText,
  UserCheck,
  Clock3,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLogout } from "@/hooks/useAuth";

/* ================= TYPES ================= */

interface NavItem {
  href?: string;
  label: string;
  icon: JSX.Element;
  children?: NavItem[];
}

/* ================= NAV CONFIG ================= */

const navSections: {
  title: string;
  items: NavItem[];
}[] = [
    {
      title: "Core",
      items: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: <LayoutDashboard size={18} />,
        },
      ],
    },
    {
      title: "Trading",
      items: [
        {
          label: "Instruments",
          icon: <CandlestickChart size={18} />,
          children: [
            { href: "/admin/instruments/market-watch", label: "Market Watch", icon: <Activity size={14} /> },
            { href: "/admin/instruments/manage-scrips", label: "Manage Scrips", icon: <FileText size={14} /> },
            { href: "/admin/instruments/market-settings", label: "Market Settings", icon: <Settings size={14} /> },
          ],
        },
        {
          label: "Trades",
          icon: <ShoppingCart size={18} />,
          children: [
            { href: "/admin/trades/live/create", label: "Create Trade", icon: <Plus size={14} /> },
            { href: "/admin/trades/active-positions", label: "Active Positions", icon: <Activity size={14} /> },
            { href: "/admin/trades/pending-orders", label: "Pending Orders", icon: <Clock3 size={14} /> },
            { href: "/admin/trades/close-trades", label: "Closed Trades", icon: <UserCheck size={14} /> },
            { href: "/admin/trades/deleted-trades", label: "Deleted Trades", icon: <Trash2 size={14} /> },
            {
              href: "/admin/trades/brokerage-commission",
              label: "Brokerage & Commission",
              icon: <DollarSign size={14} />,
            },
          ],
        },
        { href: "/admin/account-plan", label: "Account Plans", icon: <Gift size={18} /> },
      ],
    },
    
    {
      title: "Users & Compliance",
      items: [
        {
          label: "Users",
          icon: <Users size={18} />,
          children: [
            { href: "/admin/users/users", label: "All Users", icon: <Users size={14} /> },
            { href: "/admin/users/users-funds", label: "User Funds", icon: <Wallet size={14} /> },
          ],
        },
        {
          label: "Verification",
          icon: <ShieldCheck size={18} />,
          children: [
            { href: "/admin/verification/kyc", label: "KYC Completed", icon: <UserCheck size={14} /> },
          ],
        },
        
      ],
      
    },
    
    {
      title: "Finance",
      items: [
        {
          label: "Transactions",
          icon: <CreditCard size={18} />,
          children: [
            { href: "/admin/transactions/bank-details", label: "Bank Details", icon: <DollarSign size={14} /> },
            { href: "/admin/transactions/withdraw-request", label: "Withdraw Requests", icon: <DollarSign size={14} /> },
            { href: "/admin/transactions/all-deposit", label: "Deposit Requests", icon: <FileText size={14} /> },
            { href: "/admin/transactions/swap", label: "Swap Transactions", icon: <RefreshCcw size={14} /> },
          ],
        },
        { href: "/admin/dollar-rate", label: "Conversion Rates", icon: <DollarSign size={18} /> },
      ],
    },
    {
      title: "System",
      items: [
        { href: "/admin/activity-logs", label: "Activity Logs", icon: <Activity size={18} /> },
        { href: "/admin/notifications/notification", label: "Notifications", icon: <Bell size={18} /> },
        { href: "/admin/inquiry", label: "Inquiry", icon: <MessageSquare size={18} /> },
        {
          label: "Referral",
          icon: <Gift size={18} />,
          children: [
            { href: "/admin/referral", label: "Referral", icon: <Gift size={14} /> },
            { href: "/admin/bonus", label: "Bonus", icon: <DollarSign size={14} /> },
          ],
        },
        {
          label: "Account Security",
          icon: <Lock size={18} />,
          children: [
            {
              href: "/admin/account-security/change-login-password",
              label: "Reset Admin Password",
              icon: <Lock size={14} />,
            },
          ],
        },
      ],
    },
  ];

/* ================= COMPONENT ================= */

export default function AdminSidebar() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { mutate } = useLogout();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pinnedDropdown, setPinnedDropdown] = useState<string | null>(null);

  const normalize = (p: string) => p.replace(/\/+$/, "");
  const currentPath = normalize(pathname);

  const isExactActive = useCallback(
    (href?: string) => {
      if (!href) return false;
      return currentPath === href;
    },
    [currentPath]
  );

  const isNestedActive = useCallback(
    (href?: string) => {
      if (!href) return false;
      return currentPath === href || currentPath.startsWith(href + "/");
    },
    [currentPath]
  );

  const activeDropdown = useMemo(() => {
    let nextDropdown: string | null = null;

    navSections.forEach((section) =>
      section.items.forEach((item) =>
        item.children?.forEach((child) => {
          const href = child.href;
          if (!href) return;
          if (currentPath === href || currentPath.startsWith(href + "/")) {
            nextDropdown = item.label;
          }
        })
      )
    );

    return nextDropdown;
  }, [currentPath]);

  const openDropdown = pinnedDropdown ?? activeDropdown;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollTopRef.current;
    }
  }, [openDropdown]);

  useLayoutEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollTopRef.current;
    }
  }, [pathname]);

  const handleLogout = () => {
    mutate("", {
      onSettled: () => {
        localStorage.clear();
        document.cookie = "accessToken=; Max-Age=0; path=/;";
        router.replace("/");
      },
    });
  };
  const saveScroll = () => {
    if (scrollRef.current) {
      scrollTopRef.current = scrollRef.current.scrollTop;
    }
  };

  const renderSidebarInner = () => (
    <div className="flex h-full flex-col px-4 py-5 text-sm">

      {/* LOGO / TITLE REMOVED */}

      {/* NAV */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-6 overflow-y-auto sidebar-scroll"
      >

        {navSections.map(section => (
          <div key={section.title}>
            <div className="mb-2 px-2 text-xs uppercase tracking-widest text-[var(--text-muted)]">
              {section.title}
            </div>

            <div className="space-y-1">
              {section.items.map(item =>
                item.children ? (
                  <div key={item.label}>
                    <button
                      onClick={() => {
                        if (scrollRef.current) {
                          scrollTopRef.current = scrollRef.current.scrollTop;
                        }

                        setPinnedDropdown((v) =>
                          v === item.label ? null : item.label
                        );
                      }}
                      className="group flex w-full items-center justify-between rounded-xl px-3 py-2
                      hover:bg-[var(--hover-bg)]"
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        {item.label}
                      </span>
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-150 ${openDropdown === item.label ? "rotate-180" : ""
                          }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {openDropdown === item.label && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="ml-6 mt-1 space-y-1 overflow-hidden"
                        >
                          {item.children.map(child => (
                            <Link
                              key={child.href}
                              href={child.href!}
                              onClick={() => {
                                saveScroll();
                                setMobileOpen(false);
                              }}
                              className={`flex items-center gap-2 rounded-none px-3 py-1.5 text-xs
                              ${isExactActive(child.href)
                                  ? "bg-[var(--hover-bg)]"
                                  : "text-[var(--text-muted)] hover:bg-[var(--hover-bg)]"
                                }`}
                            >
                              {child.icon}
                              <span
                                className={
                                  isExactActive(child.href)
                                    ? "text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                                    : ""
                                }
                              >
                                {child.label}
                              </span>
                            </Link>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href!}
                    onClick={() => {
                      saveScroll();
                      setMobileOpen(false);
                    }}
                    className={`flex items-center gap-3 rounded-none px-3 py-2
        ${item.href === "/admin"
                        ? isExactActive(item.href)
                          ? "bg-[var(--hover-bg)]"
                          : "hover:bg-[var(--hover-bg)]"
                        : isNestedActive(item.href)
                          ? "bg-[var(--hover-bg)]"
                          : "hover:bg-[var(--hover-bg)]"
                      }`}
                  >
                    {item.icon}
                    <span
                      className={
                        isNestedActive(item.href) || isExactActive(item.href)
                          ? "text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]"
                          : ""
                      }
                    >
                      {item.label}
                    </span>
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      {/* LOGOUT */}
      <button
        onClick={handleLogout}
        className="mt-6 flex items-center gap-3 rounded-xl px-3 py-2 text-red-500 border border-[color-mix(in_srgb,var(--card-border)_70%,transparent)] hover:bg-red-500/10"
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );

  return (
    <>
      {/* MOBILE BUTTON */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-[1100] rounded-lg p-2 lg:hidden"
      >
        <Menu size={20} />
      </button>

      {/* DESKTOP */}
      <aside className="fixed left-0 top-[var(--topbar-height)] hidden h-[calc(100vh-var(--topbar-height))] w-[260px] bg-[var(--card-bg)] border-r border-[color-mix(in_srgb,var(--card-border)_70%,transparent)] lg:block">
        {renderSidebarInner()}
      </aside>

      {/* MOBILE */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 420, damping: 35 }} // ðŸš€ FAST
              className="fixed inset-y-0 left-0 z-[1200] w-[260px] bg-[var(--card-bg)]"
            >
              {renderSidebarInner()}
            </motion.aside>

            <motion.div
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-[900] bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}

