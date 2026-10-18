# Live runtime: one academy with multiple branches

User decision: one academy with branches. Keep branch membership, users and enrollment records inside one academy; do not introduce tenant billing or independent academy signups.

The current site remains a browser-local prototype. The role query is a preview selector, not authentication. This document does not claim that synchronization, multi-enrollment accounting or live permissions are enabled.

## Runtime prerequisites

`Check hosting capabilities` is a manual, read-only workflow. It checks the pinned SSH host, reports PHP and database driver availability, and does not write files on the hosting account or output credentials. Choose the runtime only after reading its outcome.

## Data model and migration boundary

- People: one stable player ID, family and guardian links, consent and medical notes.
- Enrollments: a separate ID for each player/program/group, with branch, sport, current level, credit ledger and validity dates. Switching the enrollment in the app must not transfer the player's roster in another sport.
- Sessions: assigned coach and group; attendance references enrollment, preserving the distinction between intention, arrival and participation.
- Invoices, payments, refunds, freezes, makeups and promotion history reference enrollment. Payment confirmation must be idempotent and atomic with credit activation.
- Accounts: separate authenticated staff/guardian users; guardian-to-player access and staff-to-branch/group assignments must be checked on the server for every operation.
- Notifications derive from actual changes. Internal notifications in the prototype do not imply delivery of email or background push.

The legacy `members.group`, `remaining`, `end`, and `programId` fields represent a single enrollment. Do not switch these fields when a parent only changes the viewed sport: that would silently move the player between rosters and mix balances. A migration needs stable enrollment IDs and updates to every dependent balance and attendance operation before enabling multiple registrations.

## Live release gates

1. Back up and validate an import from browser data, including counts, balances and request decisions; do not overwrite the user's current browser data.
2. Provision a private database outside the web document root and an authenticated administrator account through a one-time setup flow.
3. Implement server sessions (Secure/HttpOnly/SameSite), CSRF protection, password hashing, throttling and server role/scope validation; hide preview role switching in live mode.
4. Replace browser-local persistence with authenticated APIs, transactional writes, conflict handling and device synchronization.
5. Run two-device acceptance tests: guardian request -> office approval -> guardian receipt; coach attendance -> one credit deduction; simultaneous edits -> explicit conflict handling.
6. Configure recovery and notification delivery through secure hosting settings. Never put credentials or a database file in the static public upload.
