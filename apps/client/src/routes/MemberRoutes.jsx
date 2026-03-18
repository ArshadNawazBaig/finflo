import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { withSkeleton } from '@/lib/routeUtils';
import MemberLayout from '@/layouts/MemberLayout';
import RequireMemberAuth from '@/components/RequireMemberAuth';
import RedirectIfMemberAuthenticated from '@/components/RedirectIfMemberAuthenticated';
import ForcePasswordChange from '@/pages/auth/ForcePasswordChange';
import {
  ProfilePageSkeleton,
  SettingsPageSkeleton,
  ChatSkeleton,
  MemberNotificationsPageSkeleton,
  MemberDashboardSkeleton,
  MemberWalletSkeleton,
  MemberTransferSkeleton,
  MemberInvestmentPageSkeleton,
  MemberLoansPageSkeleton,
  MemberActivityPageSkeleton,
} from '@/components/ui/PageSkeletons';

const MemberLogin = lazy(() => import('@/pages/member/MemberLogin'));
const MemberForgotPassword = lazy(() => import('@/pages/member/MemberForgotPassword'));
const MemberResetPassword = lazy(() => import('@/pages/member/MemberResetPassword'));

const MemberDashboard = withSkeleton(() => import('@/pages/member/MemberDashboard'), MemberDashboardSkeleton);
const MemberGrantorRequests = withSkeleton(() => import('@/pages/member/MemberGrantorRequests'), MemberLoansPageSkeleton);
const MemberLoanDetail = withSkeleton(() => import('@/pages/member/MemberLoanDetail'), ProfilePageSkeleton);
const MemberLoans = withSkeleton(() => import('@/pages/member/MemberLoans'), MemberLoansPageSkeleton);
const MemberTransactions = withSkeleton(() => import('@/pages/member/MemberTransactions'), MemberActivityPageSkeleton);
const MemberTransfer = withSkeleton(() => import('@/pages/member/MemberTransfer'), MemberTransferSkeleton);
const MemberWallet = withSkeleton(() => import('@/pages/member/MemberWallet'), MemberWalletSkeleton);
const MemberInvestment = withSkeleton(() => import('@/pages/member/MemberInvestment'), MemberInvestmentPageSkeleton);
const MemberBusinessShare = withSkeleton(() => import('@/pages/member/MemberBusinessShare'), MemberInvestmentPageSkeleton);
const MemberSettings = withSkeleton(() => import('@/pages/member/MemberSettings'), SettingsPageSkeleton);
const MemberNotifications = withSkeleton(() => import('@/pages/member/MemberNotifications'), MemberNotificationsPageSkeleton);
const MemberChat = withSkeleton(() => import('@/pages/member/MemberChat'), ChatSkeleton);

const MemberRoutes = () => (
  <>
    {/* Member Portal Auth Routes */}
    <Route element={<RedirectIfMemberAuthenticated />}>
      <Route path="/member/login" element={<MemberLogin />} />
      <Route path="/member/forgot-password" element={<MemberForgotPassword />} />
      <Route path="/member/reset-password/:token" element={<MemberResetPassword />} />
      <Route path="/member/force-password-change" element={<ForcePasswordChange isMember />} />
    </Route>

    {/* Member Dashboard Routes */}
    <Route element={<RequireMemberAuth />}>
      <Route element={<MemberLayout />}>
        <Route path="/member/dashboard" element={<MemberDashboard />} />
        <Route path="/member/grantor-requests" element={<MemberGrantorRequests />} />
        <Route path="/member/loans/:id" element={<MemberLoanDetail />} />
        <Route path="/member/loans" element={<MemberLoans />} />
        <Route path="/member/transactions" element={<MemberTransactions />} />
        <Route path="/member/transfer" element={<MemberTransfer />} />
        <Route path="/member/wallet" element={<MemberWallet />} />
        <Route path="/member/investments" element={<MemberInvestment />} />
        <Route path="/member/shares" element={<MemberBusinessShare />} />
        <Route path="/member/settings" element={<MemberSettings />} />
        <Route path="/member/notifications" element={<MemberNotifications />} />
        <Route path="/member/chat" element={<MemberChat />} />
      </Route>
    </Route>
  </>
);

export default MemberRoutes;
