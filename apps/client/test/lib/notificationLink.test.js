/** lib/utils — getSafeNotificationLink: role-aware redirect guardrails. */
import { describe, it, expect } from 'vitest';
import { getSafeNotificationLink } from '@/lib/utils';

describe('getSafeNotificationLink', () => {
  it('returns null for an empty link', () => {
    expect(getSafeNotificationLink(null, 'admin')).toBe(null);
  });

  it('lets members reach member + whitelisted general routes', () => {
    expect(getSafeNotificationLink('/member/loans', 'member')).toBe('/member/loans');
    expect(getSafeNotificationLink('/loans', 'member')).toBe('/loans');
  });

  it('redirects non-members away from member routes', () => {
    expect(getSafeNotificationLink('/member/x', 'admin')).toBe('/notifications');
  });

  it('blocks regular admins from super-admin routes', () => {
    expect(getSafeNotificationLink('/super-admin/users', 'admin')).toBe('/notifications');
  });

  it('allows super admins into super-admin routes and general admin links', () => {
    expect(getSafeNotificationLink('/super-admin/users', 'super_admin')).toBe('/super-admin/users');
    expect(getSafeNotificationLink('/dashboard', 'admin')).toBe('/dashboard');
  });
});
