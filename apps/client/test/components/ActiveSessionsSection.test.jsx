/**
 * components/admin/ActiveSessionsSection — lists the caller's active sessions,
 * flags the current device, and signs individual devices / all-other-devices out.
 * api + toast are mocked.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { get, del, post } = vi.hoisted(() => ({
  get: vi.fn(),
  del: vi.fn(),
  post: vi.fn(),
}));
const { success, error } = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/axios', () => ({ default: { get, delete: del, post } }));
vi.mock('sonner', () => ({ toast: { success, error } }));

import ActiveSessionsSection from '@/components/admin/ActiveSessionsSection';

const SESSIONS = [
  {
    id: 's1',
    device: 'macOS',
    ip: '203.0.113.7',
    lastUsedAt: new Date().toISOString(),
    current: true,
  },
  {
    id: 's2',
    device: 'Android',
    ip: '198.51.100.2',
    lastUsedAt: new Date().toISOString(),
    current: false,
  },
];

beforeEach(() => {
  get.mockReset();
  del.mockReset();
  post.mockReset();
  success.mockReset();
  error.mockReset();
});

describe('ActiveSessionsSection', () => {
  it('lists sessions and flags the current device', async () => {
    get.mockResolvedValue({ data: { sessions: SESSIONS } });
    render(<ActiveSessionsSection />);

    await waitFor(() => expect(screen.getByText('macOS')).toBeInTheDocument());
    expect(screen.getByText('Android')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    // exactly one non-current row → one "Sign out" affordance
    expect(screen.getAllByText('Sign out')).toHaveLength(1);
  });

  it('signs a single device out and removes its row', async () => {
    get.mockResolvedValue({ data: { sessions: SESSIONS } });
    del.mockResolvedValue({ data: { success: true } });
    render(<ActiveSessionsSection />);

    await waitFor(() => expect(screen.getByText('Android')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Sign out'));

    await waitFor(() =>
      expect(del).toHaveBeenCalledWith('/auth/sessions/s2'),
    );
    await waitFor(() =>
      expect(screen.queryByText('Android')).not.toBeInTheDocument(),
    );
    expect(success).toHaveBeenCalled();
  });

  it('logs out all other devices via keepCurrent', async () => {
    get.mockResolvedValue({ data: { sessions: SESSIONS } });
    post.mockResolvedValue({ data: { revoked: 1 } });
    render(<ActiveSessionsSection />);

    await waitFor(() =>
      expect(screen.getByText('Log out others')).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByText('Log out others'));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith('/auth/logout-all', {
        keepCurrent: true,
      }),
    );
    // the current device remains, others are gone
    await waitFor(() =>
      expect(screen.queryByText('Android')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('macOS')).toBeInTheDocument();
  });

  it('targets the member endpoints when given basePath="/member-auth"', async () => {
    get.mockResolvedValue({ data: { sessions: [] } });
    render(<ActiveSessionsSection basePath="/member-auth" />);
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/member-auth/sessions'),
    );
  });

  it('shows an empty state when there are no sessions', async () => {
    get.mockResolvedValue({ data: { sessions: [] } });
    render(<ActiveSessionsSection />);

    await waitFor(() =>
      expect(screen.getByText('No other active sessions.')).toBeInTheDocument(),
    );
  });

  it('surfaces a fetch failure via toast', async () => {
    get.mockRejectedValue({ response: { data: { message: 'nope' } } });
    render(<ActiveSessionsSection />);
    await waitFor(() => expect(error).toHaveBeenCalledWith('nope'));
  });
});
