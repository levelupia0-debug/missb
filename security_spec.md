# Security Specification — Miss beauty Atelier (Phase 0 TDD)

## 1. Data Invariants

1. **Global Default-Deny**: Any path not explicitly matched is unconditionally denied (`allow read, write: if false`).
2. **Verified Identity**: All write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **PII Split-Collection Isolation**:
   - `/users/{userId}` holds only `uid`, `name`, `role`, `createdAt`, `updatedAt`. Self-registration forces `role == 'customer'` unless `isAdmin()`.
   - `/users/{userId}/private/{docId}` (`docId == 'info'`) holds PII (`email`, `phone`, `notes`, `preferredStylist`) and is strictly readable/writable only by `request.auth.uid == userId` (verified) or `isAdmin()`, and only when the parent `/users/{userId}` document exists (Master Gate).
4. **Booking Ownership & Terminal State Locking**:
   - A booking in `/bookings/{bookingId}` can only be created when `incoming().customerId == request.auth.uid`, `exists(/databases/$(database)/documents/services/$(incoming().serviceId))`, and `incoming().status == 'confirmed' || incoming().status == 'pending'`.
   - Once a booking reaches a terminal state (`status == 'completed'` or `status == 'cancelled'`), non-admin users are strictly blocked from making any further updates.
   - `allow list` on `/bookings` strictly enforces `isAdmin() || (isSignedIn() && isVerified() && resource.data.customerId == request.auth.uid)` with zero `get()`/`exists()` calls inside `list`.
5. **Temporal Integrity**: `createdAt == request.time` on create; `createdAt == existing().createdAt` and `updatedAt == request.time` on update.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Privilege Escalation on User Registration)**: User creates `/users/user_1` with `role: "owner"`. -> `PERMISSION_DENIED`
2. **Payload 2 (Shadow Field Injection on User)**: User creates `/users/user_1` with extra key `isSuperAdmin: true`. -> `PERMISSION_DENIED`
3. **Payload 3 (Unverified Email Write)**: Authenticated user with `email_verified: false` creates `/bookings/bk_1`. -> `PERMISSION_DENIED`
4. **Payload 4 (Admin Email Spoofing without Verification)**: Attacker with `email: "alsherafael@gmail.com"` and `email_verified: false` attempts to write `/services/s1`. -> `PERMISSION_DENIED`
5. **Payload 5 (PII Lateral Read)**: Verified user `user_2` attempts `get` on `/users/user_1/private/info`. -> `PERMISSION_DENIED`
6. **Payload 6 (Orphaned Subcollection Write - Master Gate)**: Verified user `user_99` writes `/users/user_99/private/info` without parent `/users/user_99` existing. -> `PERMISSION_DENIED`
7. **Payload 7 (Booking Identity Spoofing)**: Verified user `user_1` creates `/bookings/bk_1` with `customerId: "user_2"`. -> `PERMISSION_DENIED`
8. **Payload 8 (Orphaned Service Reference on Booking)**: Verified user `user_1` creates `/bookings/bk_1` referencing non-existent `serviceId: "nonexistent_srv"`. -> `PERMISSION_DENIED`
9. **Payload 9 (Terminal State Re-opening)**: Verified user `user_1` attempts to update a `'cancelled'` booking back to `'confirmed'`. -> `PERMISSION_DENIED`
10. **Payload 10 (Immortal Field Mutation)**: Verified user `user_1` attempts to mutate `createdAt` or `customerId` during a booking update. -> `PERMISSION_DENIED`
11. **Payload 11 (Value Poisoning on Whitelisted Update Key)**: Verified user `user_1` updates `notes` on a booking with a 5,000-character string or integer `12345`. -> `PERMISSION_DENIED`
12. **Payload 12 (Unbounded Query Scraping on `/bookings`)**: Verified user `user_1` attempts to list all documents in `/bookings` without filtering by `customerId == 'user_1'`. -> `PERMISSION_DENIED`

## 3. The Test Runner (`firestore.rules.test.ts`)

See `/firestore.rules.test.ts` for the complete test suite verifying all 12 Dirty Dozen payloads return `PERMISSION_DENIED`.
