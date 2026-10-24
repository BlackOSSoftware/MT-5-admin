"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  CircleCheckBig,
  User,
  FileText,
  Wallet,
  DollarSign,
  Check,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { useAdminUserAccounts } from "@/hooks/useAdminUserAccounts";
import { useCreateAdminDeposit } from "@/hooks/deposit/useCreateAdminDeposit";
import { useCreateAdminWithdrawal } from "@/hooks/withdrawals/useCreateAdminWithdrawal";
import type { AdminUser } from "@/types/user";
import type { AdminAccount } from "@/types/account";
import type { CreateAdminDepositResponse } from "@/services/adminDeposit.service";
import type {
  CreateAdminWithdrawalResponse,
  WithdrawalPayoutPayload,
} from "@/services/withdrawal.service";

type FundTransactionType = "Deposit" | "Withdrawal";
type WithdrawalMethod = "BANK" | "UPI" | "CRYPTO" | "MANUAL";
type FundSuccessResponse = CreateAdminDepositResponse | CreateAdminWithdrawalResponse;

export default function CreateTraderFund() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedType = searchParams.get("type")?.toLowerCase();
  const defaultTransactionType: FundTransactionType =
    requestedType === "withdrawal" ? "Withdrawal" : "Deposit";
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedUserName, setSelectedUserName] = useState("");
  const [transactionType, setTransactionType] =
    useState<FundTransactionType>(defaultTransactionType);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [withdrawMethod, setWithdrawMethod] = useState<WithdrawalMethod>("BANK");
  const [withdrawPayout, setWithdrawPayout] = useState<WithdrawalPayoutPayload>({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc: "",
    upi_id: "",
    crypto_address: "",
    wallet_network: "",
    note: "",
  });
  const [submitError, setSubmitError] = useState("");
  const [submitType, setSubmitType] =
    useState<FundTransactionType>(defaultTransactionType);
  const [submitSuccess, setSubmitSuccess] =
    useState<FundSuccessResponse | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setUserQuery(userSearchInput.trim());
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [userSearchInput]);

  const usersQuery = useAdminUsers({
    q: userQuery || undefined,
    page: 1,
    limit: 20,
  });
  const accountsQuery = useAdminUserAccounts({
    userId: selectedUserId || undefined,
    page: 1,
    limit: 50,
  });
  const createDeposit = useCreateAdminDeposit();
  const createWithdrawal = useCreateAdminWithdrawal();

  const users = usersQuery.data?.data ?? [];
  const accounts = accountsQuery.data?.data ?? [];
  const selectedAccount =
    accounts.find((account: AdminAccount) => account._id === selectedAccountId) ?? null;
  const shouldShowUserResults =
    userSearchInput.trim().length > 0 && selectedUserId === "";
  const activeActionLabel =
    transactionType === "Withdrawal" ? "withdrawal" : "deposit";
  const successActionLabel =
    submitType === "Withdrawal" ? "Withdrawal" : "Deposit";
  const isSubmitting =
    transactionType === "Withdrawal"
      ? createWithdrawal.isPending
      : createDeposit.isPending;

  const updateWithdrawPayout = (
    key: keyof WithdrawalPayoutPayload,
    value: string
  ) => {
    setWithdrawPayout((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSuccessOk = () => {
    setSubmitSuccess(null);
    if (submitType === "Withdrawal") {
      router.push("/admin/transactions/withdraw-request");
      return;
    }

    router.push("/admin/transactions/all-deposit");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitSuccess(null);

    if (!selectedUserId) {
      setSubmitError("Please select a user.");
      return;
    }

    if (!selectedAccountId) {
      setSubmitError("Please select an account.");
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("Please enter a valid amount.");
      return;
    }

    try {
      const response = transactionType === "Withdrawal"
        ? await (() => {
            const accountHolderName = withdrawPayout.account_holder_name?.trim() || "";
            const accountNumber = withdrawPayout.account_number?.trim() || "";
            const bankName = withdrawPayout.bank_name?.trim() || "";
            const ifsc = withdrawPayout.ifsc?.trim() || "";
            const upiId = withdrawPayout.upi_id?.trim() || "";
            const cryptoAddress = withdrawPayout.crypto_address?.trim() || "";
            const walletNetwork = withdrawPayout.wallet_network?.trim() || "";
            const note = withdrawPayout.note?.trim() || "";

            let payout: WithdrawalPayoutPayload;

            if (withdrawMethod === "BANK") {
              if (!bankName || !accountHolderName || !accountNumber) {
                throw new Error("Bank payout details are required.");
              }
              payout = {
                bank_name: bankName,
                account_holder_name: accountHolderName,
                account_number: accountNumber,
                ifsc,
              };
            } else if (withdrawMethod === "UPI") {
              if (!upiId || !accountHolderName) {
                throw new Error("UPI ID and account holder name are required.");
              }
              payout = {
                upi_id: upiId,
                account_holder_name: accountHolderName,
              };
            } else if (withdrawMethod === "CRYPTO") {
              if (!cryptoAddress) {
                throw new Error("Crypto wallet address is required.");
              }
              payout = {
                crypto_address: cryptoAddress,
                wallet_network: walletNetwork,
              };
            } else {
              if (!accountHolderName || !accountNumber) {
                throw new Error("Manual payout details are required.");
              }
              payout = {
                account_holder_name: accountHolderName,
                account_number: accountNumber,
                note,
              };
            }

            return createWithdrawal.mutateAsync({
              accountId: selectedAccountId,
              amount: parsedAmount,
              method: withdrawMethod,
              payout,
            });
          })()
        : await createDeposit.mutateAsync({
            accountId: selectedAccountId,
            amount: parsedAmount,
            method: "MANUAL",
          });

      if (!response?.success) {
        setSubmitError(response?.message || `Failed to create ${activeActionLabel}.`);
        return;
      }

      setAmount("");
      setSubmitError("");
      setSubmitType(transactionType);
      setSubmitSuccess(response);
    } catch (error: unknown) {
      let message = `Failed to create ${activeActionLabel}.`;

      if (typeof error === "object" && error !== null) {
        const responseMessage = (
          error as { response?: { data?: { message?: string } } }
        ).response?.data?.message;

        if (typeof responseMessage === "string" && responseMessage.trim()) {
          message = responseMessage;
        } else if (
          "message" in error &&
          typeof (error as { message?: string }).message === "string"
        ) {
          message = (error as { message?: string }).message || message;
        }
      }

      setSubmitError(message);
      setSubmitSuccess(null);
    }
  };

  return (
    <div className="p-6 text-[var(--foreground)]">

      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft size={20} /> Back
      </button>

      {/* Form Container */}
      <div className="
        max-w-4xl mx-auto 
        bg-[var(--card-bg)] 
        border border-[var(--card-border)]
        rounded-2xl p-3 sm:p-4
      ">
        
        <form
          className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
          onSubmit={handleSubmit}
        >

          {/* User */}
          <div className="relative">
            <label className="inline-flex items-center gap-1.5 text-sm mb-1">
              <User size={14} />
              User
            </label>
            <input
              type="text"
              value={userSearchInput}
              onChange={(e) => {
                setUserSearchInput(e.target.value);
                setSelectedUserId("");
                setSelectedUserName("");
                setSelectedAccountId("");
              }}
              className="
                w-full mb-2 px-4 py-2 rounded-lg
                bg-[var(--input-bg)] border border-[var(--input-border)]
              "
              placeholder="Search user by name, email or phone"
            />
            {shouldShowUserResults && (
              <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-44 overflow-y-auto rounded-lg border border-[var(--input-border)] bg-[var(--card-bg)] shadow-lg">
                {usersQuery.isLoading ? (
                  <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                    Searching users...
                  </p>
                ) : users.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                    No users found
                  </p>
                ) : (
                  users.map((user: AdminUser) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user._id);
                        setSelectedUserName(user.name || user.email);
                        setUserSearchInput(user.name || user.email);
                        setSelectedAccountId("");
                      }}
                      className="block w-full px-3 py-2 text-left text-xs sm:text-sm hover:bg-[var(--hover-bg)] border-b border-[var(--card-border)] last:border-b-0"
                    >
                      <span className="block font-medium">{user.name}</span>
                      <span className="block text-[10px] text-[var(--text-muted)]">
                        {user.email}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
            {selectedUserId && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <User size={12} />
                Selected user: {selectedUserName}
              </p>
            )}
          </div>

          {/* Transaction Type */}
          <div>
            <label className="inline-flex items-center gap-1.5 text-sm mb-1">
              <FileText size={14} />
              Transaction Type
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value as FundTransactionType)}
              className="
              w-full px-4 py-2 rounded-lg 
              bg-[var(--input-bg)] border border-[var(--input-border)]
            ">
              <option>Deposit</option>
              <option>Withdrawal</option>
            </select>
          </div>

          {/* Account */}
          <div>
            <label className="inline-flex items-center gap-1.5 text-sm mb-1">
              <Wallet size={14} />
              Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              disabled={!selectedUserId || accountsQuery.isLoading}
              className="
              w-full px-4 py-2 rounded-lg 
              bg-[var(--input-bg)] border border-[var(--input-border)]
            ">
              <option value="">
                {!selectedUserId
                  ? "Select user first"
                  : accountsQuery.isLoading
                  ? "Loading accounts..."
                  : accounts.length === 0
                  ? "No accounts found"
                  : "Select account"}
              </option>
              {accounts.map((account: AdminAccount) => (
                <option key={account._id} value={account._id}>
                  {account.account_number ?? account._id}
                  {account.plan_name ? ` - ${account.plan_name}` : ""}
                  {typeof account.balance === "number"
                    ? ` - Bal: $${account.balance.toLocaleString()}`
                    : ""}
                </option>
              ))}
            </select>
            {selectedAccount && (
              <div className="mt-2 rounded-lg border border-[var(--card-border)] bg-[var(--input-bg)] px-3 py-2 text-xs sm:text-sm">
                <p className="text-[var(--text-muted)]">
                  Current Balance:{" "}
                  <span className="font-semibold text-emerald-600">
                    ${selectedAccount.balance?.toLocaleString() ?? "0"}
                  </span>
                </p>
                <p className="text-[var(--text-muted)]">
                  Hold Balance:{" "}
                  <span className="font-semibold text-amber-600">
                    ${selectedAccount.hold_balance?.toLocaleString() ?? "0"}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="inline-flex items-center gap-1.5 text-sm mb-1">
              <DollarSign size={14} />
              Amount
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="
                w-full px-4 py-2 rounded-lg 
                bg-[var(--input-bg)] border border-[var(--input-border)]
              "
              placeholder="Enter amount"
            />
          </div>

          {transactionType === "Withdrawal" && (
            <>
              <div>
                <label className="inline-flex items-center gap-1.5 text-sm mb-1">
                  <FileText size={14} />
                  Withdrawal Method
                </label>
                <select
                  value={withdrawMethod}
                  onChange={(event) =>
                    setWithdrawMethod(event.target.value as WithdrawalMethod)
                  }
                  className="
                    w-full px-4 py-2 rounded-lg
                    bg-[var(--input-bg)] border border-[var(--input-border)]
                  "
                >
                  <option value="BANK">BANK</option>
                  <option value="UPI">UPI</option>
                  <option value="CRYPTO">CRYPTO</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>

              <div className="md:col-span-2 rounded-xl border border-[var(--card-border)] bg-[var(--input-bg)] p-3 sm:p-4">
                <p className="text-xs font-semibold text-[var(--text-muted)] mb-3">
                  Payout Details
                </p>

                {withdrawMethod === "BANK" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={withdrawPayout.bank_name ?? ""}
                      onChange={(event) => updateWithdrawPayout("bank_name", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Bank name"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.account_holder_name ?? ""}
                      onChange={(event) => updateWithdrawPayout("account_holder_name", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Account holder name"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.account_number ?? ""}
                      onChange={(event) => updateWithdrawPayout("account_number", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Account number"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.ifsc ?? ""}
                      onChange={(event) => updateWithdrawPayout("ifsc", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="IFSC code"
                    />
                  </div>
                )}

                {withdrawMethod === "UPI" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={withdrawPayout.upi_id ?? ""}
                      onChange={(event) => updateWithdrawPayout("upi_id", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="UPI ID"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.account_holder_name ?? ""}
                      onChange={(event) => updateWithdrawPayout("account_holder_name", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Account holder name"
                    />
                  </div>
                )}

                {withdrawMethod === "CRYPTO" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={withdrawPayout.crypto_address ?? ""}
                      onChange={(event) => updateWithdrawPayout("crypto_address", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Wallet address"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.wallet_network ?? ""}
                      onChange={(event) => updateWithdrawPayout("wallet_network", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Network (optional)"
                    />
                  </div>
                )}

                {withdrawMethod === "MANUAL" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={withdrawPayout.account_holder_name ?? ""}
                      onChange={(event) => updateWithdrawPayout("account_holder_name", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Account holder name"
                    />
                    <input
                      type="text"
                      value={withdrawPayout.account_number ?? ""}
                      onChange={(event) => updateWithdrawPayout("account_number", event.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)]"
                      placeholder="Reference / account number"
                    />
                    <textarea
                      value={withdrawPayout.note ?? ""}
                      onChange={(event) => updateWithdrawPayout("note", event.target.value)}
                      className="sm:col-span-2 w-full px-4 py-2 rounded-lg bg-[var(--card-bg)] border border-[var(--input-border)] min-h-[90px]"
                      placeholder="Note (optional)"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {submitError && (
            <p className="md:col-span-2 text-sm text-[var(--danger)]">
              {submitError}
            </p>
          )}
          {/* Submit Button */}
          <div className="md:col-span-2 flex justify-center mt-4 sm:mt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="
                inline-flex items-center gap-2
                px-8 sm:px-10 py-2.5 sm:py-3 rounded-xl
                bg-gradient-to-r from-emerald-600 to-teal-600
                hover:from-emerald-700 hover:to-teal-700
                text-white text-sm sm:text-base font-semibold tracking-wide
                transition-colors
                disabled:opacity-70 disabled:cursor-not-allowed
              "
            >
              {isSubmitting ? (
                <>
                  <DollarSign size={16} className="animate-pulse" />
                  Submitting...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Submit
                </>
              )}
            </button>
          </div>
        </form>

      </div>

      {submitSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/35 backdrop-blur-[3px] p-4">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/35 bg-white/70 p-5 sm:p-6 text-[var(--foreground)] backdrop-blur-xl dark:border-white/15 dark:bg-[#111a2c]/70">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/20 via-transparent to-teal-500/20" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <CircleCheckBig size={20} />
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-semibold">Success</h3>
                  <p className="text-xs sm:text-sm text-[var(--text-muted)]">
                    {submitSuccess.message}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-white/40 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 p-3 text-xs sm:text-sm backdrop-blur-sm dark:border-white/15">
                <p>Amount: {submitSuccess.data.amount}</p>
                <p>Status: {submitSuccess.data.status}</p>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSuccessOk}
                  className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white hover:from-emerald-700 hover:to-teal-700"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
