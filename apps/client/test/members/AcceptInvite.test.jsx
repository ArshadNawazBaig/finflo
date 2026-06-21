/**
 * pages/member/AcceptInvite — public invite-acceptance page. Loads the invite
 * (GET /members/invite/:token), locks the email field, submits the accept form
 * (POST /members/invite/:token/accept), and renders a clear error state for an
 * invalid/expired token. api + sonner + SEO are mocked; navigation is asserted
 * via a mocked useNavigate.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../helpers/render';

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
const { success, error } = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));
const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@/lib/axios', () => ({ default: { get, post } }));
vi.mock('sonner', () => ({ toast: { success, error } }));
vi.mock('@/components/SEO', () => ({ default: () => null }));
vi.mock('@/lib/appLock', () => ({ markAppUnlocked: vi.fn() }));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ token: 'tok123' }),
    useNavigate: () => navigate,
  };
});

import AcceptInvite from '@/pages/member/AcceptInvite';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  success.mockReset();
  error.mockReset();
  navigate.mockReset();
});

describe('AcceptInvite', () => {
  it('loads the invite, locks the email, and submits the accept form', async () => {
    get.mockResolvedValue({
      data: {
        email: 'invitee@example.com',
        businessName: 'Acme Lending',
        businessLogo: '',
        brandColor: '#6366f1',
        securityCode: 'ABC123',
      },
    });
    post.mockResolvedValue({
      data: { message: 'Welcome', securityCode: 'ABC123' },
    });

    renderWithProviders(<AcceptInvite />, {
      route: '/member/accept-invite/tok123',
    });

    await waitFor(() => expect(get).toHaveBeenCalledWith('/members/invite/tok123'));

    // Locked email prefilled from the invite
    const emailInput = await screen.findByDisplayValue('invitee@example.com');
    expect(emailInput).toHaveAttribute('readOnly');

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('xxxxx-xxxxxxx-x'), {
      target: { value: '4210112345671' },
    });
    fireEvent.change(screen.getByPlaceholderText('0300 0000000'), {
      target: { value: '03001234567' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /activate my account/i }),
    );

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        '/members/invite/tok123/accept',
        expect.objectContaining({
          name: 'Jane Doe',
          phone: '03001234567',
          password: 'password123',
        }),
      ),
    );

    // No session token returned → redirect to login with the security code
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/member/login?code=ABC123'),
    );
  });

  it('auto-logs the member in when the accept response includes a token', async () => {
    get.mockResolvedValue({
      data: { email: 'invitee@example.com', businessName: 'Acme Lending' },
    });
    post.mockResolvedValue({
      data: {
        message: 'Welcome',
        token: 'member-jwt',
        member: { _id: 'm1', name: 'jane doe' },
        securityCode: 'ABC123',
      },
    });

    renderWithProviders(<AcceptInvite />, {
      route: '/member/accept-invite/tok123',
    });

    await screen.findByDisplayValue('invitee@example.com');

    fireEvent.change(screen.getByPlaceholderText('John Doe'), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByPlaceholderText('xxxxx-xxxxxxx-x'), {
      target: { value: '4210112345671' },
    });
    fireEvent.change(screen.getByPlaceholderText('0300 0000000'), {
      target: { value: '03001234567' },
    });
    fireEvent.change(screen.getByPlaceholderText('Minimum 8 characters'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), {
      target: { value: 'password123' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /activate my account/i }),
    );

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith('/member/dashboard'),
    );
  });

  it('renders the invalid/expired error state with a login link', async () => {
    get.mockRejectedValue({
      response: { status: 410, data: { message: 'This invitation has expired.' } },
    });

    renderWithProviders(<AcceptInvite />, {
      route: '/member/accept-invite/tok123',
    });

    expect(
      await screen.findByText(/this invitation is invalid or has expired/i),
    ).toBeInTheDocument();
    expect(screen.getByText('This invitation has expired.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to login/i })).toHaveAttribute(
      'href',
      '/member/login',
    );
  });
});
