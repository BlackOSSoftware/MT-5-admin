/** Prefer business labels over raw Mongo ObjectIds / engine UUIDs in admin UI. */

export function displayUserLabel(input: {
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  name?: string | null;
  email?: string | null;
}) {
  const name = (input.userName || input.name || "").trim();
  const email = (input.userEmail || input.email || "").trim();
  if (name && email) return `${name} (${email})`;
  if (email) return email;
  if (name) return name;
  return (input.userId || "--").trim() || "--";
}

export function displayAccountLabel(input: {
  accountId?: string | null;
  accountNumber?: string | null;
  account_number?: string | null;
}) {
  const number = (
    input.accountNumber ||
    input.account_number ||
    ""
  ).trim();
  if (number) return number;
  return (input.accountId || "--").trim() || "--";
}

/** MT5-style numeric ticket preferred over engine UUID (positionId / orderId). */
export function displayTicket(input: {
  ticket?: number | string | null;
  positionId?: string | null;
  orderId?: string | null;
  fallback?: string | null;
}) {
  const ticket = input.ticket;
  if (ticket !== undefined && ticket !== null && String(ticket).trim() !== "") {
    return String(ticket);
  }
  const fallback =
    input.fallback || input.positionId || input.orderId || "--";
  return String(fallback).trim() || "--";
}
