# Club sports workspace — first implementation package

## Baseline and scope (21 October 2026)

Started from main `44c1022`, retaining 20 October application updates `662fb40` and `9a95627` (multi-sport data, coach/branch selectors, sport scope and EGP currency). The club entry point is `club.html`; existing academy editions and data remain intact.

This is a separate browser prototype that validates the club domain and user journeys. It is **not** the production backend phase. No real membership integration, authenticated accounts, cross-device synchronization, payment, court booking or medical-record access is enabled. Do not import real member or financial records into this prototype.

## Implemented and reviewable

- `club-model.js`: distinct people, households, read-only membership snapshots, programs, groups, enrollments, sessions and enrollment credit movements.
- One person can have multiple enrollments with separate balances and dates. Attendance is tied to a session and enrollment; repeating it does not deduct twice. Wrong-group attendance, insufficient credits and invalid enrollment dates are rejected.
- Registration follows person -> branch -> sport -> program -> group. It validates program/group relationships, duplicate active enrollments, eligibility and capacity.
- Membership status is calculated from a snapshot, not edited. Expired or stale membership requires review; existing enrollments and balances remain intact. The demonstration freshness window is 24 hours, not a live synchronization guarantee or an approved club policy.
- Nonmember admissions, 40% premiums, 30% quotas, discounts and grants are not assumed or enabled. This package does not price a registration or create an invoice; it grants illustrative credits only in the explicitly labeled demo.
- `club.html`: overview, people and households, sport/program workspaces, attendance, resource directory and a visible implementation roadmap. Person cards show independent enrollment balances.
- Separate localStorage key `club-sports-foundation-v1`; never writes the existing `elite-academy-v1` academy state. Corrupt data and write failures are preserved/reported. A revision guard rejects sequential stale-tab writes. This is not an atomic database lock and does not establish concurrent booking safety.

## Scope-document corrections carried into the plan

1. Membership creation, renewal, cards, annual fees and administration remain outside sports-platform scope; integration is read-only.
2. Rates, quotas, freezes, makeups, refunds, grants and approval thresholds from the supplied scope file are proposals pending club approval, with policy versions and effective dates required.
3. Payment may settle one household invoice or several invoices. Each service/enrollment remains traceable through invoice lines and payment allocations; do not force one invoice for every family forever.
4. Booking concurrency acceptance belongs after the resource engine is implemented. Do not claim it from browser-local capacity validation.
5. If the swimming/football pilot includes competitive squads, minimum Team/Season/Roster must precede the pilot. Otherwise football pilot covers academy operations only; full registration/competition scope follows.
6. Fawry code issuance/reconciliation and actual WhatsApp/SMS receipts require contracted integrations. Manual payment entries are not those integrations.
7. Player affairs may see medical clearance and expiry only as authorized. Detailed diagnoses require a separate medical role and server enforcement.
8. Priorities do not silently cancel confirmed bookings. Reallocation needs approval, notice and a refund/alternative policy, including emergencies.

## Next production package and release gates

- Approve the target club's membership schema, identity matching, source ownership, freshness/failure handling and integration contract. A nightly file is a possible first adapter, not a verified source currently connected.
- Create a private relational database and authenticated API, with scoped roles, guardian relationships, CSRF and session protection, audit records, schema migrations and tested backup/restore. Store secrets outside public files.
- Migrate legacy single-group members to people plus enrollments using stable legacy IDs. Do not infer identity from matching names or alter existing money. Reconcile counts/balances in a dry run before cutover.
- Transactional enrollment capacity and attendance ledger; enforce entitlement checks at the API. Reject stale concurrent edits and duplicate payment events. Add two-device acceptance tests.
- Shared resource engine: whole/part conflicts, allocations, maintenance, booking holds, recurring exceptions and policy-driven cancellations.
- Financial core: invoice lines, allocations, shifts, grants/adjustments, reversals and reconciliation. Define which system issues invoices to prevent duplicates with the club ERP.
- Read-only role preview and a resource directory are not completion criteria for authenticated roles or live booking.

The current prototype is additive and has no automatic migration path into production until the above contracts and reconciliation gates are met. Any PHP/SQL runtime implementation must first verify the hosting/runtime versions and safe private storage paths, as described in `academy-runtime.md`.

## Validation

Required suites:

```sh
node --test tests.cjs academy-model.test.cjs sport-engine.test.cjs family-schedule.test.cjs apps-context.test.cjs club-model.test.cjs
```

Browser acceptance, using installed Playwright and Chromium:

```sh
node scripts/check-club-workspace.cjs
```

The browser script checks responsive navigation, multi-enrollment persistence, branch/sport cascade, duplicate/eligibility rejection, isolated credit consumption, academy data separation and booting the existing academy editions. It does not claim production authentication or server concurrency.
