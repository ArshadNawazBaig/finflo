/**
 * hooks/usePermissions — reads the permission array off the cached `user` in
 * localStorage, treats '*' as a wildcard, and re-reads on the `userUpdated`
 * window event so a role/permission change reflects without a reload.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import usePermissions from '@/hooks/usePermissions';

const setUser = (permissions) =>
  localStorage.setItem('user', JSON.stringify({ permissions }));

beforeEach(() => localStorage.clear());

describe('usePermissions', () => {
  it('grants a held permission and denies a missing one', () => {
    setUser(['manage_loans']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('manage_loans')).toBe(true);
    expect(result.current.hasPermission('manage_members')).toBe(false);
  });

  it('treats "*" as a wildcard for every check', () => {
    setUser(['*']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('anything')).toBe(true);
    expect(result.current.hasAllPermissions(['a', 'b'])).toBe(true);
    expect(result.current.hasAnyPermission(['a'])).toBe(true);
  });

  it('hasAllPermissions requires every permission', () => {
    setUser(['a']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAllPermissions(['a', 'b'])).toBe(false);
    expect(result.current.hasAllPermissions(['a'])).toBe(true);
  });

  it('hasAnyPermission needs at least one match', () => {
    setUser(['a']);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasAnyPermission(['x', 'a'])).toBe(true);
    expect(result.current.hasAnyPermission(['x', 'y'])).toBe(false);
  });

  it('defaults to no permissions when none are stored', () => {
    const { result } = renderHook(() => usePermissions());
    expect(result.current.permissions).toEqual([]);
    expect(result.current.hasPermission('manage_loans')).toBe(false);
  });

  it('re-reads permissions when a userUpdated event fires', () => {
    setUser([]);
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasPermission('manage_loans')).toBe(false);

    act(() => {
      setUser(['manage_loans']);
      window.dispatchEvent(new Event('userUpdated'));
    });
    expect(result.current.hasPermission('manage_loans')).toBe(true);
  });
});
