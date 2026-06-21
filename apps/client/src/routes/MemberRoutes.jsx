import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { withSkeleton } from '@/lib/routeUtils';
import MemberLayout from '@/layouts/MemberLayout';
import RequireMemberAuth from '@/components/RequireMemberAuth';
import RequireMemberOnboarding from '@/components/auth/RequireMemberOnboarding';
import RedirectIfMemberAuthenticated from '@/components/RedirectIfMemberAuthenticated';
import ForcePasswordChange from '@/pages/auth/ForcePasswordChange';

const WizardLoading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);
const MemberSetup = withSkeleton(
  () => import('@/pages/onboarding/member/MemberSetupWizard'),
  WizardLoading,
);
import {
  SettingsPageSkeleton,
  ChatSkeleton,
  MemberNotificationsPageSkeleton,
  MemberDashboardSkeleton,
  MemberWalletSkeleton,
  MemberTransferSkeleton,
  MemberInvestmentPageSkeleton,
  MemberLoansPageSkeleton,
  MemberLoanDetailSkeleton,
  MemberActivityPageSkeleton,
  MemberCalculatorSkeleton,
} from '@/components/ui/PageSkeletons';

const MemberLogin = lazy(() => import('@/pages/member/MemberLogin'));
const MemberForgotPassword = lazy(() => import('@/pages/member/MemberForgotPassword'));
const MemberResetPassword = lazy(() => import('@/pages/member/MemberResetPassword'));
const AcceptInvite = lazy(() => import('@/pages/member/AcceptInvite'));

const MemberDashboard = withSkeleton(() => import('@/pages/member/MemberDashboard'), MemberDashboardSkeleton);
const MemberGrantorRequests = withSkeleton(() => import('@/pages/member/MemberGrantorRequests'), MemberLoansPageSkeleton);
const MemberLoanDetail = withSkeleton(() => import('@/pages/member/MemberLoanDetail'), MemberLoanDetailSkeleton);
const MemberLoans = withSkeleton(() => import('@/pages/member/MemberLoans'), MemberLoansPageSkeleton);
const MemberTransactions = withSkeleton(() => import('@/pages/member/MemberTransactions'), MemberActivityPageSkeleton);
const MemberTransfer = withSkeleton(() => import('@/pages/member/MemberTransfer'), MemberTransferSkeleton);
const MemberWallet = withSkeleton(() => import('@/pages/member/MemberWallet'), MemberWalletSkeleton);
const MemberTermDeposits = withSkeleton(() => import('@/pages/member/MemberTermDeposits'), MemberInvestmentPageSkeleton);
const MemberBusinessShare = withSkeleton(() => import('@/pages/member/MemberBusinessShare'), MemberInvestmentPageSkeleton);
const MemberCheckbooks = withSkeleton(() => import('@/pages/member/MemberCheckbooks'), MemberInvestmentPageSkeleton);
const MemberCalculator = withSkeleton(() => import('@/pages/member/MemberCalculator'), MemberCalculatorSkeleton);
const MemberSettings = withSkeleton(() => import('@/pages/member/MemberSettings'), SettingsPageSkeleton);
const MemberNotifications = withSkeleton(() => import('@/pages/member/MemberNotifications'), MemberNotificationsPageSkeleton);
const MemberChat = withSkeleton(() => import('@/pages/member/MemberChat'), ChatSkeleton);
const MemberDisputes = withSkeleton(() => import('@/pages/member/MemberDisputes'), MemberActivityPageSkeleton);

const MemberRoutes = () => (
  <>
    {/* Public invite acceptance — no auth guard so invited users can register */}
    <Route path="/member/accept-invite/:token" element={<AcceptInvite />} />

    {/* Member Portal Auth Routes */}
    <Route element={<RedirectIfMemberAuthenticated />}>
      <Route path="/member/login" element={<MemberLogin />} />
      <Route path="/member/forgot-password" element={<MemberForgotPassword />} />
      <Route path="/member/reset-password/:token" element={<MemberResetPassword />} />
      <Route path="/member/force-password-change" element={<ForcePasswordChange isMember />} />
    </Route>

    {/* Member Dashboard Routes */}
    <Route element={<RequireMemberAuth />}>
      {/* Full-screen member setup wizard — outside MemberLayout (no sidebar) */}
      <Route path="/member/setup" element={<MemberSetup />} />
      {/* Legacy notification deep-link — deposit/withdrawal/profit alerts used to
          point at the non-existent /member/investments. Redirect already-sent
          notifications to the wallet so they don't 404. */}
      <Route
        path="/member/investments"
        element={<Navigate to="/member/wallet" replace />}
      />
      {/* First-run members are redirected here until onboarding is complete */}
      <Route element={<RequireMemberOnboarding />}>
        <Route element={<MemberLayout />}>
          <Route path="/member/dashboard" element={<MemberDashboard />} />
        <Route path="/member/grantor-requests" element={<MemberGrantorRequests />} />
        <Route path="/member/loans/:id" element={<MemberLoanDetail />} />
        <Route path="/member/loans" element={<MemberLoans />} />
        <Route path="/member/transactions" element={<MemberTransactions />} />
        <Route path="/member/transfer" element={<MemberTransfer />} />
        <Route path="/member/wallet" element={<MemberWallet />} />
        <Route path="/member/term-deposits" element={<MemberTermDeposits />} />
        <Route path="/member/shares" element={<MemberBusinessShare />} />
        <Route path="/member/checkbooks" element={<MemberCheckbooks />} />
        <Route path="/member/calculator" element={<MemberCalculator />} />
        <Route path="/member/settings" element={<MemberSettings />} />
        <Route path="/member/notifications" element={<MemberNotifications />} />
        <Route path="/member/chat" element={<MemberChat />} />
        <Route path="/member/disputes" element={<MemberDisputes />} />
        </Route>
      </Route>
    </Route>
  </>
);

export default MemberRoutes;
