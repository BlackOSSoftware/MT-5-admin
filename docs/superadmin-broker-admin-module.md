# Super Admin and Broker Admin Module

## Goal

Support multiple independent brokers in one platform. A platform Super Admin manages broker tenants. Each Broker Admin works only inside the broker they are assigned to. Users, trading accounts, deposits, withdrawals, payment methods, plans, reports, and broker settings must not leak across brokers.

This document is based on the current admin frontend and `trading-backend` code. It is a design and implementation plan; the module itself has not been implemented yet.

## Current implementation audit

### Roles and authentication

- `User.model.js` has `userType: USER | ADMIN`; it has no `SUPER_ADMIN`, broker, or permission fields.
- `adminAuth.middleware.js` accepts every authenticated user whose `userType` is `ADMIN`. There is no broker membership check or permission-level authorization.
- `authMiddleware.js` reloads `userType` from MongoDB on each request. This is a good base for revoking role changes, but it does not load a broker context.
- `auth.service.js` returns the global `userType` as the login role. The admin login page only accepts the literal role `ADMIN`.
- `/auth/admin/signup` is behind the general `adminAuth` gate. The service explicitly forces created users to `USER`; there is no dedicated safe Broker Admin provisioning flow.
- The user update service accepts `userType`, so any current Admin route that can update users can potentially promote or demote global roles. This must become a restricted operation.
- The admin layout calls `/user/me` and redirects unauthenticated users, but the sidebar renders all current admin modules for every Admin. There is no role-aware navigation.

### Tenant and finance data

- No `Broker` or tenant model was found in backend models or admin pages.
- `Account` belongs to a user and account plan, but has no broker ID.
- `Deposit`, `Withdrawal`, `Transaction`, `PaymentMethod`, `AccountPlan`, `Trade`, and `Brokerage` have no broker ID.
- Deposit approval and withdrawal approval mutate account balances and create ledger transactions. They currently operate on platform-wide data behind the global Admin gate.
- Payment methods and account plans are platform-wide. Conversion, bonus, referral, market schedules, notifications, and reports also have no broker scope in the models inspected.
- Instrument/market data can be a shared catalogue, but broker-specific tradability, pricing, leverage, and restrictions need a separate broker configuration layer.
- Existing admin APIs for finance, users, accounts, KYC, trading, reports, symbols, and settings use `adminAuth`; none impose a broker data filter.
- The frontend contains Dashboard, users, funds, KYC, deposits, withdrawals, payment methods, account plans, trading, instruments, conversion rates, bonus, referrals, activity, notifications, and inquiries. They are all presented as one global admin console.

## Recommended role model

Keep identity and authorization separate:

1. **Super Admin (platform level)**
   - Owns the platform and can create, pause, configure, and inspect brokers.
   - Can create/invite Broker Admins, assign permissions, and see cross-broker platform reports.
   - Must explicitly choose a broker context before opening broker customer or finance data.
   - Can suspend a broker or revoke a Broker Admin. Destructive financial actions remain audited.
2. **Broker Admin (tenant level)**
   - Belongs to one or more brokers through a membership record.
   - Can only access data for selected broker memberships and granted permissions.
   - Cannot create brokers, grant Super Admin, or view another broker's records.
3. **Optional scoped staff roles** (use permissions rather than growing a long hard-coded role list)
   - Finance: deposits, withdrawals, payment methods, finance reports.
   - Support: client lookup, inquiries, limited account view; no balance changes.
   - Trading operations: positions/orders and risk settings; no payment approval.
   - Compliance: KYC and audit review.

Initially the UI can expose only Super Admin and Broker Admin. Store permissions in a way that supports the optional roles without another schema rewrite.

## Data model to add

### `Broker`

Suggested fields:

```text
_id, code (unique), legalName, displayName, status (ACTIVE | SUSPENDED),
baseCurrency, timezone, country, branding, createdBy, createdAt, updatedAt
```

Keep secrets (payment provider credentials, SMTP credentials, API keys) in a secret store or encrypted configuration, never in frontend-readable broker documents.

### `BrokerMembership`

```text
_id, brokerId, userId, role (BROKER_ADMIN | BROKER_STAFF),
permissions[], status (INVITED | ACTIVE | SUSPENDED), invitedBy,
acceptedAt, createdAt, updatedAt
```

Create a unique compound index on `{ brokerId, userId }`. Do not store the only admin role on `User.userType`; a user can be a staff member of one broker and have a different membership in another.

### Platform role

Add a platform-level field such as `platformRole: SUPER_ADMIN | null` to the identity record, or a separate `PlatformRole` collection if multiple platform roles are needed. Only a Super Admin provisioning operation can grant it. Never accept platform role values from a normal profile update.

### Broker ownership on operational records

Add indexed, required `brokerId` references to at least:

- `Account`, `AccountPlan`, `Deposit`, `Withdrawal`, `PaymentMethod`, `Transaction`.
- Trade/order/position and brokerage records, either directly or through an always-enforced Account join. Prefer direct `brokerId` on high-volume query collections for safe and efficient filtering, while validating it matches the related Account.
- `Kyc`/client workflow records, referrals/rewards, bonus settings and ledger adjustments where those are broker-owned.
- Inquiries, broker notifications, finance configuration, conversion rates and broker-scoped activity/audit records.
- Broker-specific market schedule, instrument configuration, leverage/risk controls, and fee/commission settings.

Do not duplicate a broker's bank/payment credentials into a global shared record. Keep payment method visibility and active status scoped to its broker.

### Shared catalogue vs broker configuration

Keep canonical symbol metadata and upstream tick feed shared where appropriate. Add `BrokerInstrument` (or equivalent) keyed uniquely by `{ brokerId, instrumentId }` for enabled status, permitted account types, leverage/risk limits, spread/commission overrides, and trading schedule. One broker's change must not alter another's trading rules.

## Authentication and authorization flow

1. Login validates the same identity/password as today.
2. Backend returns platform role and the user's active broker memberships (IDs, names, permissions, status), not a client-provided role.
3. Super Admin enters the platform console and chooses a broker context before tenant data operations. Broker Admin selects only from assigned brokers.
4. Backend issues/refreshes a session with `userId`, active `brokerId` (where relevant), and session ID. The server reloads role/membership and broker status on every protected request; do not trust a role or broker ID in the JWT alone.
5. Backend middleware sets `req.auth` and `req.brokerId` only after verifying membership. For Super Admin cross-broker reports, require an explicit, separately authorized platform endpoint.
6. All service queries receive a server-derived scope. Body, URL, or query `brokerId` is never sufficient authorization.

Suggested middleware split:

```text
requireAuthenticatedUser
requirePlatformPermission("brokers.manage")
requireBrokerMembership
requireBrokerPermission("finance.withdrawals.approve")
```

Replace the single `adminAuth` gate gradually. Keep a temporary compatibility wrapper during migration, but make it fail closed when the active broker context is missing.

## Broker isolation rules

- Every broker-owned query starts with `{ brokerId: req.brokerId }`; add user/account/status filters after that.
- For an ID-based mutation, load the target with both `_id` and `brokerId`; never fetch by `_id` alone and check later in the UI.
- Derive a deposit/withdrawal broker from its account on creation, then persist it and verify consistency on every approval.
- Financial writes must update request, balance/account state, transaction ledger, and audit record in a Mongo transaction where supported.
- Use idempotency keys for approve/reject/admin-adjust actions so retries cannot post a second balance change.
- Super Admin cross-broker queries must be separate, permission-checked endpoints, visibly marked as platform-wide, and audited.
- Include `brokerId` in cache keys, Redis messages, exports, background jobs, socket subscriptions, and report aggregation. A broker filter in the page alone is not isolation.
- Return 404 for an object outside the active broker scope to avoid confirming another broker's record exists.

## Admin module layout

### Super Admin console

- **Platform overview:** broker count/status, aggregate volume and finance indicators, operational alerts.
- **Broker directory:** create/edit, suspend/reactivate, details, assigned admins, broker-level health.
- **Broker onboarding wizard:** legal/display identity, timezone/currency, fee and risk defaults, payment setup, first Broker Admin invitation.
- **Admin access:** invite/revoke memberships, assign permissions, force session revocation, review access history.
- **Platform audit:** broker-wide changes, role grants, admin login and sensitive actions.
- **Cross-broker reporting:** aggregate-only by default; drill down only with explicit broker selection and audit trail.

### Broker Admin workspace

Every section is scoped to the active broker:

- **Dashboard:** broker-only balances, pending deposits/withdrawals, client counts, active trades, revenue and alerts.
- **Clients & KYC:** client search, profiles, account list, KYC review, status and communication history.
- **Finance:** deposit queue, withdrawal queue, payment methods, broker conversion rates, ledger/transaction history, reconciliation and downloadable reports.
- **Trading:** active/closed positions, pending orders, broker-specific instrument access, risk controls, commissions/spreads/swaps.
- **Products:** account plans, leverage and account limits, bonuses/referrals if enabled for that broker.
- **Operations:** broker announcements, inquiries, broker-scoped audit log, health/configuration.
- **Access management:** only if granted `admins.manage`; create staff memberships for this broker, never Super Admin.

The selected broker name/code should remain visible in the header and in every finance review screen. Changing context should clear cached queries and unsaved filters.

## Deposit and withdrawal workflow requirements

### Deposit

1. Client submits request against one of their broker-owned accounts and a payment method belonging to that broker.
2. Server validates account, broker, method, amount/currency rules and proof; stores `brokerId` from the verified account.
3. Broker Finance/Admin sees only that broker's pending queue and filters.
4. Approve/reject requires permission, records actor and reason, is idempotent, updates account/ledger atomically, and creates an immutable audit event.
5. Super Admin can see it only through an explicitly broker-scoped support/audit flow.

### Withdrawal

1. Request validates the account belongs to the active broker and applies the existing balance, KYC, open-trade and hold checks.
2. Broker Finance/Admin sees only their broker's requests and payout details.
3. Approve/reject records actor, reason, status transition, amount, broker, before/after balances, and transaction references.
4. Add configurable limits, two-person approval thresholds, and daily reconciliation/export per broker. No approval should be possible from a list row with stale status; backend rechecks inside the transaction.

## Audit, security, and operational controls

- Add a dedicated append-only `AdminAuditLog`: actor user, platform/broker role, broker, permission/action, target type/ID, before/after diff with sensitive values redacted, reason, request ID, IP, user agent, timestamp.
- Log login, broker context switch, role/membership changes, payment method edits, deposit/withdrawal decisions, manual balance adjustments, account/trade interventions, exports, and broker status changes.
- Separate `finance.deposit.approve`, `finance.deposit.reject`, `finance.withdrawal.approve`, `finance.withdrawal.reject`, and `finance.payout.details.read` permissions.
- Mask bank account/payout data except for permissions that need it. Never put secrets or passwords in audit logs.
- Require step-up reauthentication or MFA for payout changes, role grants, broker suspension and sensitive financial actions.
- Add rate limits, session revocation, secure cookies (`HttpOnly`, `Secure`, `SameSite`), and a server-side session/refresh strategy. Current frontend stores the access token in `localStorage`; plan to replace this for admin sessions.
- Current `ActivityLog` action enum is too narrow for finance/admin audit. Do not stretch it into the immutable financial audit ledger.

## Frontend changes

- Build distinct `/superadmin/*` and `/admin/*` shells, or a shared shell with server-authorized feature navigation. The current `/admin` shell assumes all users are the same Admin.
- Change login/session bootstrap to consume the backend's authoritative role and membership context. Show a broker picker only when the user has multiple broker memberships.
- Add a persistent active broker selector to the Broker Admin header. Super Admin has a separate platform view and an explicit “open broker” action.
- Sidebar entries derive from permissions. Hiding a menu item is for usability only; backend checks remain mandatory.
- Include broker ID/context in React Query keys and clear cache on switch/logout. Avoid rendering old broker data during a context transition.
- Add broker context to CSV/PDF exports, filters, empty states, page titles and confirmation dialogs.
- Finance UI should show request status history, action reason, actor, and duplicate-action prevention.

## API changes (target shape)

Platform routes:

```text
POST   /api/v1/platform/brokers
GET    /api/v1/platform/brokers
GET    /api/v1/platform/brokers/:brokerId
PATCH  /api/v1/platform/brokers/:brokerId
POST   /api/v1/platform/brokers/:brokerId/suspend
POST   /api/v1/platform/brokers/:brokerId/memberships/invite
PATCH  /api/v1/platform/memberships/:membershipId
GET    /api/v1/platform/audit
GET    /api/v1/platform/reports/overview
```

Broker routes use the verified active broker context:

```text
GET    /api/v1/admin/context
POST   /api/v1/admin/context/switch
GET    /api/v1/broker/dashboard
GET    /api/v1/broker/deposits
POST   /api/v1/broker/deposits/:id/approve
POST   /api/v1/broker/deposits/:id/reject
GET    /api/v1/broker/withdrawals
POST   /api/v1/broker/withdrawals/:id/approve
POST   /api/v1/broker/withdrawals/:id/reject
GET/POST/PATCH /api/v1/broker/payment-methods
GET/POST/PATCH /api/v1/broker/account-plans
GET    /api/v1/broker/audit
```

Existing routes can remain temporarily for compatibility, but must be converted endpoint by endpoint to enforce broker scope before the module is exposed to multiple brokers.

## Migration plan

### Phase 0 — Establish current owner and preserve behavior

- Create the first `Broker` record for the existing FP Trades operation.
- Backfill all existing operational records to that broker. Verify counts and relationships before enabling strict tenant filters.
- Mark the existing platform owner explicitly as Super Admin; do not infer Super Admin from email or from a generic `ADMIN` role.
- Add broker IDs to accounts/plans/payment methods first, then financial requests/transactions and trading records.
- Add indexes for `{ brokerId, status, createdAt }`, `{ brokerId, account }`, and tenant-scoped lookup patterns.

### Phase 1 — Backend authorization foundation

- Add Broker and BrokerMembership models, invite/accept flow, context selection, and permission resolver.
- Add middleware that resolves active broker and membership from authenticated identity.
- Add a query-scope helper and convert reads and mutations, beginning with users/accounts and all finance routes.
- Lock role changes behind dedicated platform permission; remove `userType` from general user profile updates.
- Add audit events and idempotency to deposit/withdrawal decisions.

### Phase 2 — Broker finance and configuration

- Scope payment methods, plans, conversion, bonus/referral configuration, deposits, withdrawals, ledger views, reports and reconciliation by broker.
- Move broker-specific risk/commission/instrument rules into broker configuration.
- Verify background jobs, Redis cache/pub-sub and WebSocket messages carry broker scope when they concern tenant state.

### Phase 3 — Frontend workspaces

- Add role-aware login bootstrap, broker picker/context selector, Super Admin broker directory and invite flows.
- Convert the existing admin pages to use the broker context and broker-specific API routes.
- Gate sidebar/actions by permissions and clearly label active broker.

### Phase 4 — Verify and release safely

- Test two brokers with overlapping account numbers, same-name users, payment methods, and finance requests.
- Assert Broker Admin A cannot list, fetch by ID, update, export, or approve Broker B records through any endpoint.
- Test Super Admin platform endpoints, broker suspension, revoked membership, stale JWTs, cache switching, and background tasks.
- Reconcile per-broker opening balances, transaction totals, pending deposit/withdrawal counts, and brokerage reports against pre-migration totals.
- Roll out behind a feature flag. Keep legacy single-broker behavior only until reconciliation and access checks pass; then make missing `brokerId` fail closed.

## Acceptance criteria

- Super Admin can create/suspend brokers and assign Broker Admins without making them platform admins.
- Broker Admin login resolves an active broker membership and sees only that broker's data and permitted modules.
- Every finance, user, trading, export, and report endpoint is tenant-scoped server-side.
- Broker A cannot retrieve Broker B's record by changing IDs, query parameters, request body, pagination, or cached client state.
- Deposits/withdrawals are isolated by broker payment methods and accounts, and every decision is attributable, reasoned, idempotent and auditable.
- Shared symbol/feed data remains available while broker trading rules are independently configurable.
- Legacy records all map to the intended initial broker and financial reconciliation is signed off before strict enforcement.

## Suggested implementation order

Start with **Broker + BrokerMembership + authorization context**, then backfill a single existing broker and add tenant filters to **users/accounts/deposits/withdrawals/payment methods**. Do not start with sidebar styling: the security boundary must exist in backend services before multiple Broker Admins can use this system.
