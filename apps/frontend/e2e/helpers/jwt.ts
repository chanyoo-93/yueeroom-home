export function createTestJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.test-signature`;
}

const now = Math.floor(Date.now() / 1000);

export const tokens = {
  approvedCustomer: createTestJwt({
    sub: 'test-customer-1',
    email: 'customer@test.com',
    status: 'APPROVED',
    role: 'CUSTOMER',
    iat: now,
    exp: now + 3600,
  }),
  approvedAdmin: createTestJwt({
    sub: 'test-admin-1',
    email: 'admin@test.com',
    status: 'APPROVED',
    role: 'ADMIN',
    iat: now,
    exp: now + 3600,
  }),
  pending: createTestJwt({
    sub: 'test-pending-1',
    email: 'pending@test.com',
    status: 'PENDING',
    role: 'CUSTOMER',
    iat: now,
    exp: now + 3600,
  }),
  rejected: createTestJwt({
    sub: 'test-rejected-1',
    email: 'rejected@test.com',
    status: 'REJECTED',
    role: 'CUSTOMER',
    iat: now,
    exp: now + 3600,
  }),
  expiredApproved: createTestJwt({
    sub: 'test-expired-1',
    email: 'expired@test.com',
    status: 'APPROVED',
    role: 'CUSTOMER',
    iat: now - 7200,
    exp: now - 3600,
  }),
};
