"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useLogin } from "@/hooks/useAuth";
import { Eye, EyeOff, AtSign, KeyRound, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { applyDocumentTitle, resolveBrandName } from "@/utils/brand";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const { mutate, isPending } = useLogin();

  useEffect(() => {
    applyDocumentTitle("Admin Login");
  }, []);

  const handleLogin = (): void => {
    setErrorMsg("");

    mutate(
      {
        email,
        password,
        fcmToken: null,
      },
      {
        onSuccess: (res) => {
          const {
            accessToken,
            role,
            platformRole,
            brokerId,
            memberships,
          } = res.data;

          if (role !== "ADMIN") {
            setErrorMsg("Access denied. Admin only.");
            return;
          }

          document.cookie = `accessToken=${accessToken}; path=/;`;
          localStorage.setItem("token", accessToken);
          if (platformRole) {
            localStorage.setItem("platformRole", platformRole);
          } else {
            localStorage.removeItem("platformRole");
          }

          // SuperAdmin = same /admin panel, no broker filter (sees all data).
          // Broker Admin = scoped to their broker only.
          if (platformRole === "SUPER_ADMIN") {
            localStorage.removeItem("brokerId");
          } else {
            const activeBrokerId =
              brokerId ||
              memberships?.[0]?.brokerId ||
              memberships?.[0]?.broker?._id ||
              "";
            if (activeBrokerId) {
              localStorage.setItem("brokerId", String(activeBrokerId));
            } else {
              localStorage.removeItem("brokerId");
            }
          }
          localStorage.setItem(
            "memberships",
            JSON.stringify(memberships || [])
          );

          const brand = resolveBrandName({
            platformRole,
            memberships: memberships || [],
          });
          localStorage.setItem("brandName", brand);
          applyDocumentTitle(brand);

          router.push("/admin");
        },

        onError: (err: unknown) => {
          const axiosErr = err as {
            code?: string;
            message?: string;
            response?: { data?: { message?: string }; status?: number };
          };
          if (
            axiosErr?.code === "ERR_NETWORK" ||
            axiosErr?.message === "Network Error"
          ) {
            setErrorMsg("Backend unreachable. Is the API running on :4000?");
            return;
          }
          setErrorMsg(
            axiosErr?.response?.data?.message || "Invalid email or password"
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[var(--background)]">

      {/* LEFT PANEL */}
      <div className="hidden lg:flex w-1/2 relative">

        <Image
          src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1311&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="Trading Dashboard"
          fill
          priority
          className="object-cover"
        />

        <div className="absolute inset-0 bg-black/60" />

        <div className="relative z-10 flex flex-col items-center justify-center text-white px-12 text-center w-full">

          <h1 className="text-4xl font-bold mb-4">
            Admin Command Center
          </h1>

          <p className="text-lg opacity-90 max-w-md">
            Secure administrative access to trading infrastructure
          </p>

        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-4 sm:px-6 md:px-10 py-10 sm:py-12">

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-sm sm:max-w-md bg-[var(--card-bg)]
          border border-[var(--card-border)]
          rounded-2xl p-6 sm:p-8 relative overflow-hidden"
        >
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full blur-3xl"
            style={{
              background:
                "color-mix(in srgb, var(--primary) 18%, transparent)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full blur-3xl"
            style={{
              background:
                "color-mix(in srgb, var(--primary-dark) 18%, transparent)",
            }}
          />

          {/* Header */}
          <div className="text-center mb-7 relative">
            <div
              className="mx-auto mb-4 h-12 w-12 rounded-2xl flex items-center justify-center text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary), var(--primary-dark))",
              }}
            >
              <ShieldCheck size={22} />
            </div>

            <h2 className="text-3xl font-bold text-[var(--primary)] mb-2">
              Admin Control 
            </h2>

            <p className="text-sm text-[var(--text-muted)]">
              Sign in to monitor and manage live trading
            </p>
          </div>

          {/* Email */}
          <div className="mb-5">

            <label className="block text-sm mb-2 font-medium">
              Email Address
            </label>

            <div className="relative">

              <AtSign
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="email"
                value={email}
                placeholder="admin@broker.com"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-lg border
                bg-[var(--input-bg)] border-[var(--input-border)]
                focus:outline-none focus:ring-2
                focus:ring-[var(--primary)]"
              />

            </div>

          </div>

          {/* Password */}
          <div className="mb-4">

            <label className="block text-sm mb-2 font-medium">
              Password
            </label>

            <div className="relative">

              <KeyRound
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="Enter password"
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-lg border
                bg-[var(--input-bg)] border-[var(--input-border)]
                focus:outline-none focus:ring-2
                focus:ring-[var(--primary)]"
              />

              {/* Eye Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

            </div>

          </div>

          {/* Error */}
          {errorMsg && (
            <div
              className="bg-red-100 border border-red-300 text-red-600
              px-4 py-2 rounded mb-4 text-sm text-center"
            >
              {errorMsg}
            </div>
          )}

          {/* Button */}
          <button
            onClick={handleLogin}
            disabled={isPending}
            className="w-full py-3 mt-3 rounded-lg font-semibold text-white
            bg-[var(--primary)] hover:bg-[var(--primary-dark)]
            transition-all duration-200 hover:-translate-y-0.5
            disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Verifying..." : "Login"}
          </button>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Admin Panel
          </div>

        </motion.div>

      </div>

    </div>
  );
}
