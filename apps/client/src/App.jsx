import { Suspense, lazy } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DashboardLayout from '@/layouts/DashboardLayout';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import MemberLayout from '@/layouts/MemberLayout';
import RequireAuth from '@/components/RequireAuth';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import RequireMemberAuth from '@/components/RequireMemberAuth';
import RedirectIfMemberAuthenticated from '@/components/RedirectIfMemberAuthenticated';
import RequireAdmin from '@/components/RequireAdmin';
import RequirePermissions from '@/components/auth/RequirePermissions';
import RequirePaidPlan from '@/components/RequirePaidPlan';
import { Toaster } from 'sonner';

import DashboardSkeleton from '@/components/ui/DashboardSkeleton';
import {
  TablePageSkeleton,
  CardsPageSkeleton,
  ProfilePageSkeleton,
  SettingsPageSkeleton,
} from '@/components/ui/PageSkeletons';

const withSkeleton = (importFunc, SkeletonFallback) => {
  const LazyComponent = lazy(importFunc);
  return (props) => (
    <Suspense fallback={<SkeletonFallback />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy Load Pages
const Landing = lazy(() => import('@/pages/static/Landing'));
const Dashboard = withSkeleton(
  () => import('@/pages/admin/Dashboard'),
  DashboardSkeleton,
);
const Customers = withSkeleton(
  () => import('@/pages/admin/Customers'),
  TablePageSkeleton,
);
const Members = withSkeleton(
  () => import('@/pages/admin/Members'),
  TablePageSkeleton,
);
const Loans = withSkeleton(
  () => import('@/pages/admin/Loans'),
  TablePageSkeleton,
);
const Transactions = withSkeleton(
  () => import('@/pages/admin/Transactions'),
  TablePageSkeleton,
);
const Reports = withSkeleton(
  () => import('@/pages/admin/Reports'),
  DashboardSkeleton,
);
const Branches = withSkeleton(
  () => import('@/pages/admin/Branches'),
  CardsPageSkeleton,
);
const BranchDetail = withSkeleton(
  () => import('@/pages/admin/BranchDetail'),
  ProfilePageSkeleton,
);
const Team = withSkeleton(
  () => import('@/pages/admin/Team'),
  CardsPageSkeleton,
);
const StaffProfile = withSkeleton(
  () => import('@/pages/admin/StaffProfile'),
  ProfilePageSkeleton,
);
const Settings = withSkeleton(
  () => import('@/pages/admin/Settings'),
  SettingsPageSkeleton,
);
const Billing = withSkeleton(
  () => import('@/pages/billing/Billing'),
  SettingsPageSkeleton,
);
const Pricing = withSkeleton(
  () => import('@/pages/billing/Pricing'),
  CardsPageSkeleton,
);
const MemberProfile = withSkeleton(
  () => import('@/pages/admin/MemberProfile'),
  ProfilePageSkeleton,
);
const CustomerProfile = withSkeleton(
  () => import('@/pages/admin/CustomerProfile'),
  ProfilePageSkeleton,
);
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const ForcePasswordChange = lazy(
  () => import('@/pages/auth/ForcePasswordChange'),
);
const SelfRegister = lazy(() => import('@/pages/auth/SelfRegister'));
const Support = withSkeleton(
  () => import('@/pages/admin/Support'),
  CardsPageSkeleton,
);
const LoanLookup = withSkeleton(
  () => import('@/pages/admin/LoanLookup'),
  DashboardSkeleton,
);
const Notifications = withSkeleton(
  () => import('@/pages/admin/Notifications'),
  TablePageSkeleton,
);
const LoanDetail = withSkeleton(
  () => import('@/pages/admin/LoanDetail'),
  ProfilePageSkeleton,
);
const PrivacyPolicy = lazy(() => import('@/pages/static/PrivacyPage'));
const TermsOfService = lazy(() => import('@/pages/static/TermsPage'));
const PaymentSuccess = lazy(() => import('@/pages/billing/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/pages/billing/PaymentCancel'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const MemberLogin = lazy(() => import('@/pages/member/MemberLogin'));
const MemberDashboard = withSkeleton(
  () => import('@/pages/member/MemberDashboard'),
  DashboardSkeleton,
);
const SuperAdminDashboard = withSkeleton(
  () => import('@/pages/superadmin/SuperAdminDashboard'),
  DashboardSkeleton,
);
const ManageUsers = withSkeleton(
  () => import('@/pages/superadmin/ManageUsers'),
  TablePageSkeleton,
);
const UserDetail = withSkeleton(
  () => import('@/pages/superadmin/UserDetail'),
  ProfilePageSkeleton,
);
const SystemAnalytics = withSkeleton(
  () => import('@/pages/superadmin/SystemAnalytics'),
  DashboardSkeleton,
);
const ManageNotifications = withSkeleton(
  () => import('@/pages/superadmin/ManageNotifications'),
  TablePageSkeleton,
);
const ActivityLogs = withSkeleton(
  () => import('@/pages/superadmin/ActivityLogs'),
  TablePageSkeleton,
);
const SystemSettings = withSkeleton(
  () => import('@/pages/superadmin/SystemSettings'),
  SettingsPageSkeleton,
);
const RevenueReports = withSkeleton(
  () => import('@/pages/superadmin/RevenueReports'),
  DashboardSkeleton,
);
const BackupExport = withSkeleton(
  () => import('@/pages/superadmin/BackupExport'),
  CardsPageSkeleton,
);
const ManageTickets = withSkeleton(
  () => import('@/pages/superadmin/ManageTickets'),
  TablePageSkeleton,
);
const LoanRequests = withSkeleton(
  () => import('@/pages/admin/LoanRequests'),
  TablePageSkeleton,
);
const LoanProducts = withSkeleton(
  () => import('@/pages/admin/LoanProducts'),
  CardsPageSkeleton,
);
const DistributionHub = withSkeleton(
  () => import('@/pages/admin/DistributionHub'),
  TablePageSkeleton,
);
const VerificationQueue = withSkeleton(
  () => import('@/pages/admin/VerificationQueue'),
  TablePageSkeleton,
);
const Roles = withSkeleton(
  () => import('@/pages/admin/Roles'),
  SettingsPageSkeleton,
);
const NotFound = lazy(() => import('@/pages/static/NotFound'));
const Documentation = lazy(() => import('@/pages/static/Documentation'));
const ApiDocumentation = lazy(() => import('@/pages/static/ApiDocumentation'));
const AuditLogs = withSkeleton(
  () => import('@/pages/admin/AuditLogs'),
  TablePageSkeleton,
);
const Chat = withSkeleton(
  () => import('@/pages/admin/Chat'),
  DashboardSkeleton,
);
const Maintenance = lazy(() => import('@/pages/static/Maintenance'));

const Valentine = lazy(() => import('@/pages/static/Valentine'));
const MemberTransactions = withSkeleton(
  () => import('@/pages/member/MemberTransactions'),
  TablePageSkeleton,
);
const MemberLoanDetail = withSkeleton(
  () => import('@/pages/member/MemberLoanDetail'),
  ProfilePageSkeleton,
);
const MemberLoans = withSkeleton(
  () => import('@/pages/member/MemberLoans'),
  TablePageSkeleton,
);
const MemberTransfer = withSkeleton(
  () => import('@/pages/member/MemberTransfer'),
  CardsPageSkeleton,
);
const MemberSettings = withSkeleton(
  () => import('@/pages/member/MemberSettings'),
  SettingsPageSkeleton,
);
const MemberInvestment = withSkeleton(
  () => import('@/pages/member/MemberInvestment'),
  CardsPageSkeleton,
);
const MemberBusinessShare = withSkeleton(
  () => import('@/pages/member/MemberBusinessShare'),
  CardsPageSkeleton,
);
const MemberForgotPassword = lazy(
  () => import('@/pages/member/MemberForgotPassword'),
);
const MemberResetPassword = lazy(
  () => import('@/pages/member/MemberResetPassword'),
);
const MemberNotifications = withSkeleton(
  () => import('@/pages/member/MemberNotifications'),
  TablePageSkeleton,
);
const MemberGrantorRequests = withSkeleton(
  () => import('@/pages/member/MemberGrantorRequests'),
  TablePageSkeleton,
);
const MemberChat = withSkeleton(
  () => import('@/pages/member/MemberChat'),
  DashboardSkeleton,
);

import SplashScreen from '@/components/ui/SplashScreen';
import FloatingSettings from '@/components/landing/FloatingSettings';
import useSystemSettings from '@/hooks/useSystemSettings';

// Loading Fallbacks
const PageLoader = () => <SplashScreen />;
const DashboardLoader = () => <DashboardSkeleton />;

function App() {
  const { settings, loading } = useSystemSettings();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperAdmin = user.role === 'super_admin';

  if (loading) return <PageLoader />;

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {settings && settings.maintenanceMode === true && !isSuperAdmin ? (
            <Route path="*" element={<Maintenance />} />
          ) : (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/loan-lookup" element={<LoanLookup />} />
              <Route path="/join/:code?" element={<SelfRegister />} />
              {/* <Route path="/for-my-love" element={<Valentine />} /> */}
              {/* Public Routes */}
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/documentation/api" element={<ApiDocumentation />} />

              {/* Regular Admin Routes */}
              <Route element={<RequireAuth />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />

                  {/* Permission Based Routes */}
                  <Route
                    element={
                      <RequirePermissions
                        permissions={['view_all', 'manage_members']}
                        any
                      />
                    }
                  >
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/members" element={<Members />} />
                    <Route path="/members/:id" element={<MemberProfile />} />
                    <Route
                      path="/customers/:id"
                      element={<CustomerProfile />}
                    />
                    <Route path="/team" element={<Team />} />
                    <Route path="/team/:id" element={<StaffProfile />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions permissions={['manage_loans']} />
                    }
                  >
                    <Route path="/loan-requests" element={<LoanRequests />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={['view_all', 'manage_loans']}
                        any
                      />
                    }
                  >
                    <Route path="/loans" element={<Loans />} />
                    <Route path="/loans/:id" element={<LoanDetail />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={[
                          'view_all',
                          'view_reports',
                          'manage_loans',
                        ]}
                        any
                      />
                    }
                  >
                    <Route path="/transactions" element={<Transactions />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions permissions={['view_reports']} />
                    }
                  >
                    <Route path="/reports" element={<Reports />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions permissions={['manage_branches']} />
                    }
                  >
                    <Route path="/branches" element={<Branches />} />
                    <Route path="/branches/:id" element={<BranchDetail />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={['manage_members', 'view_reports']}
                        any
                      />
                    }
                  >
                    <Route
                      path="/distributions"
                      element={<DistributionHub />}
                    />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={['manage_loans', 'system_settings']}
                        any
                      />
                    }
                  >
                    <Route path="/loan-products" element={<LoanProducts />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions permissions={['system_settings']} />
                    }
                  >
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/pricing" element={<Pricing />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={['approve_members', 'manage_members']}
                        any
                      />
                    }
                  >
                    <Route
                      path="/verification-queue"
                      element={<VerificationQueue />}
                    />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions permissions={['manage_roles']} />
                    }
                  >
                    <Route path="/roles" element={<Roles />} />
                  </Route>

                  <Route
                    element={
                      <RequirePermissions
                        permissions={['view_reports', 'manage_roles']}
                        any
                      />
                    }
                  >
                    <Route path="/audit-logs" element={<AuditLogs />} />
                  </Route>

                  <Route path="/settings" element={<Settings />} />

                  {/* Paid-plan only routes */}
                  <Route element={<RequirePaidPlan />}>
                    <Route path="/support" element={<Support />} />
                    <Route path="/chat" element={<Chat />} />
                  </Route>
                  <Route path="/notifications" element={<Notifications />} />

                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />
                </Route>
              </Route>

              {/* Super Admin Routes — DashboardSkeleton via layout wrapper */}
              <Route element={<RequireAuth />}>
                <Route element={<RequireAdmin />}>
                  <Route path="/super-admin" element={<SuperAdminLayout />}>
                    <Route index element={<SuperAdminDashboard />} />
                    <Route path="users" element={<ManageUsers />} />
                    <Route path="users/:id" element={<UserDetail />} />
                    <Route path="analytics" element={<SystemAnalytics />} />
                    <Route
                      path="notifications"
                      element={<ManageNotifications />}
                    />
                    <Route path="activity-logs" element={<ActivityLogs />} />
                    <Route path="revenue" element={<RevenueReports />} />
                    <Route path="backup" element={<BackupExport />} />
                    <Route path="settings" element={<SystemSettings />} />
                    <Route path="tickets" element={<ManageTickets />} />
                  </Route>
                </Route>
              </Route>

              <Route element={<RedirectIfAuthenticated />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/reset-password/:token"
                  element={<ResetPassword />}
                />
                <Route
                  path="/force-password-change"
                  element={<ForcePasswordChange />}
                />
              </Route>

              {/* Member Portal Routes */}
              <Route element={<RedirectIfMemberAuthenticated />}>
                <Route path="/member/login" element={<MemberLogin />} />
                <Route
                  path="/member/forgot-password"
                  element={<MemberForgotPassword />}
                />
                <Route
                  path="/member/reset-password/:token"
                  element={<MemberResetPassword />}
                />
                <Route
                  path="/member/force-password-change"
                  element={<ForcePasswordChange isMember />}
                />
              </Route>

              {/* Member Dashboard Routes */}
              <Route element={<RequireMemberAuth />}>
                <Route element={<MemberLayout />}>
                  <Route
                    path="/member/dashboard"
                    element={<MemberDashboard />}
                  />
                  <Route
                    path="/member/grantor-requests"
                    element={<MemberGrantorRequests />}
                  />
                  <Route
                    path="/member/loans/:id"
                    element={<MemberLoanDetail />}
                  />
                  <Route path="/member/loans" element={<MemberLoans />} />
                  <Route
                    path="/member/transactions"
                    element={<MemberTransactions />}
                  />
                  <Route path="/member/transfer" element={<MemberTransfer />} />
                  <Route
                    path="/member/investments"
                    element={<MemberInvestment />}
                  />
                  <Route
                    path="/member/shares"
                    element={<MemberBusinessShare />}
                  />
                  <Route path="/member/settings" element={<MemberSettings />} />
                  <Route
                    path="/member/notifications"
                    element={<MemberNotifications />}
                  />
                  <Route path="/member/chat" element={<MemberChat />} />
                </Route>
              </Route>

              {/* Catch All - 404 */}
              <Route path="*" element={<NotFound />} />
            </>
          )}
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
      <FloatingSettings />
    </Router>
  );
}

export default App;
