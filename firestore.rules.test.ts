/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 Security TDD Test Suite for Miss beauty Atelier Firestore Rules.
 * Verifies that all 12 "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityAssertion {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: {
    uid: string;
    email: string;
    email_verified: boolean;
  } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityAssertion[] = [
  {
    id: 1,
    name: 'Privilege Escalation on User Registration (role: owner)',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      name: 'Malicious Client',
      role: 'owner',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Profile (isVerified: true)',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      name: 'Client',
      role: 'customer',
      isVerified: true,
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Unverified Email Write on Booking Creation',
    collectionPath: '/bookings/bk_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'unverified@example.com', email_verified: false },
    payload: {
      id: 'bk_1',
      referenceCode: 'MB-1001',
      customerId: 'user_1',
      customerName: 'Client',
      customerEmail: 'unverified@example.com',
      customerPhone: '+3312345678',
      serviceId: 's1',
      serviceSlug: 'signature-haircut',
      serviceName: 'Signature Haircut',
      serviceCategory: 'Cut & Styling',
      price: 165,
      duration: '1h 15m',
      durationMinutes: 75,
      date: '2026-10-20',
      time: '10:00 AM',
      notes: '',
      status: 'confirmed',
      emailStatus: 'sent',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Admin Email Spoofing with email_verified: false',
    collectionPath: '/services/s1',
    operation: 'delete',
    auth: { uid: 'attacker_1', email: 'alsherafael@gmail.com', email_verified: false },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'PII Lateral Read on /users/user_1/private/info by user_2',
    collectionPath: '/users/user_1/private/info',
    operation: 'get',
    auth: { uid: 'user_2', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Orphaned Subcollection Write without Parent /users/user_99 (Master Gate)',
    collectionPath: '/users/user_99/private/info',
    operation: 'create',
    auth: { uid: 'user_99', email: 'u99@example.com', email_verified: true },
    payload: {
      uid: 'user_99',
      email: 'u99@example.com',
      phone: '+3312345678',
      notes: 'Fine curls',
      preferredStylist: 'Elena',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Booking Identity Spoofing (customerId != request.auth.uid)',
    collectionPath: '/bookings/bk_2',
    operation: 'create',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      id: 'bk_2',
      referenceCode: 'MB-1002',
      customerId: 'user_2',
      customerName: 'Victim',
      customerEmail: 'victim@example.com',
      customerPhone: '+3312345678',
      serviceId: 's1',
      serviceSlug: 'signature-haircut',
      serviceName: 'Signature Haircut',
      serviceCategory: 'Cut & Styling',
      price: 165,
      duration: '1h 15m',
      durationMinutes: 75,
      date: '2026-10-20',
      time: '11:30 AM',
      notes: '',
      status: 'confirmed',
      emailStatus: 'sent',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Orphaned Service Reference on Booking Creation',
    collectionPath: '/bookings/bk_3',
    operation: 'create',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      id: 'bk_3',
      referenceCode: 'MB-1003',
      customerId: 'user_1',
      customerName: 'Client',
      customerEmail: 'client@example.com',
      customerPhone: '+3312345678',
      serviceId: 'non_existent_service_999',
      serviceSlug: 'ghost',
      serviceName: 'Ghost Service',
      serviceCategory: 'Cut & Styling',
      price: 165,
      duration: '1h 15m',
      durationMinutes: 75,
      date: '2026-10-20',
      time: '11:30 AM',
      notes: '',
      status: 'confirmed',
      emailStatus: 'sent',
      createdAt: 'REQUEST_TIME',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Terminal State Re-opening (updating cancelled booking back to confirmed)',
    collectionPath: '/bookings/bk_cancelled_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      status: 'confirmed',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Immortal Field Mutation (changing createdAt or customerId on update)',
    collectionPath: '/bookings/bk_active_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      customerId: 'user_2',
      createdAt: '2020-01-01T00:00:00Z',
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Value Poisoning on Whitelisted Update Field (non-string or oversized notes)',
    collectionPath: '/bookings/bk_active_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'client@example.com', email_verified: true },
    payload: {
      notes: 'X'.repeat(5000),
      updatedAt: 'REQUEST_TIME'
    },
    expectedResult: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unfiltered List Query on /bookings for another user',
    collectionPath: '/bookings',
    operation: 'list',
    auth: { uid: 'user_2', email: 'user2@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED'
  }
];
