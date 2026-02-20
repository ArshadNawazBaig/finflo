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
import RequirePaidPlan from '@/components/RequirePaidPlan';
import { Toaster } from 'sonner';

// Lazy Load Pages
const Landing = lazy(() => import('@/pages/static/Landing'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Customers = lazy(() => import('@/pages/admin/Customers'));
const Members = lazy(() => import('@/pages/admin/Members'));
const Loans = lazy(() => import('@/pages/admin/Loans'));
const Transactions = lazy(() => import('@/pages/admin/Transactions'));
const Reports = lazy(() => import('@/pages/admin/Reports'));
const Branches = lazy(() => import('@/pages/admin/Branches'));
const BranchDetail = lazy(() => import('@/pages/admin/BranchDetail'));
const Team = lazy(() => import('@/pages/admin/Team'));
const StaffProfile = lazy(() => import('@/pages/admin/StaffProfile'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const Billing = lazy(() => import('@/pages/billing/Billing'));
const Pricing = lazy(() => import('@/pages/billing/Pricing'));
const MemberProfile = lazy(() => import('@/pages/admin/MemberProfile'));
const CustomerProfile = lazy(() => import('@/pages/admin/CustomerProfile'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Register = lazy(() => import('@/pages/auth/Register'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const VerifyEmail = lazy(() => import('@/pages/auth/VerifyEmail'));
const Support = lazy(() => import('@/pages/admin/Support'));
const LoanLookup = lazy(() => import('@/pages/admin/LoanLookup'));
const Notifications = lazy(() => import('@/pages/admin/Notifications'));
const LoanDetail = lazy(() => import('@/pages/admin/LoanDetail'));
const PrivacyPolicy = lazy(() => import('@/pages/static/PrivacyPage'));
const TermsOfService = lazy(() => import('@/pages/static/TermsPage'));
const PaymentSuccess = lazy(() => import('@/pages/billing/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/pages/billing/PaymentCancel'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const MemberLogin = lazy(() => import('@/pages/member/MemberLogin'));
const MemberDashboard = lazy(() => import('@/pages/member/MemberDashboard'));
const SuperAdminDashboard = lazy(
  () => import('@/pages/superadmin/SuperAdminDashboard'),
);
const ManageUsers = lazy(() => import('@/pages/superadmin/ManageUsers'));
const UserDetail = lazy(() => import('@/pages/superadmin/UserDetail'));
const SystemAnalytics = lazy(
  () => import('@/pages/superadmin/SystemAnalytics'),
);
const ManageNotifications = lazy(
  () => import('@/pages/superadmin/ManageNotifications'),
);
const ActivityLogs = lazy(() => import('@/pages/superadmin/ActivityLogs'));
const SystemSettings = lazy(() => import('@/pages/superadmin/SystemSettings'));
const RevenueReports = lazy(() => import('@/pages/superadmin/RevenueReports'));
const BackupExport = lazy(() => import('@/pages/superadmin/BackupExport'));
const ManageTickets = lazy(() => import('@/pages/superadmin/ManageTickets'));
const LoanRequests = lazy(() => import('@/pages/admin/LoanRequests'));
const NotFound = lazy(() => import('@/pages/static/NotFound'));
const Documentation = lazy(() => import('@/pages/static/Documentation'));
const ApiDocumentation = lazy(() => import('@/pages/static/ApiDocumentation'));
const AuditLogs = lazy(() => import('@/pages/admin/AuditLogs'));
const Maintenance = lazy(() => import('@/pages/static/Maintenance'));
const Valentine = lazy(() => import('@/pages/static/Valentine'));
const MemberTransactions = lazy(
  () => import('@/pages/member/MemberTransactions'),
);
const MemberLoanDetail = lazy(() => import('@/pages/member/MemberLoanDetail'));
const MemberLoans = lazy(() => import('@/pages/member/MemberLoans'));
const MemberTransfer = lazy(() => import('@/pages/member/MemberTransfer'));
const MemberSettings = lazy(() => import('@/pages/member/MemberSettings'));
const MemberInvestment = lazy(() => import('@/pages/member/MemberInvestment'));
const MemberForgotPassword = lazy(
  () => import('@/pages/member/MemberForgotPassword'),
);
const MemberResetPassword = lazy(
  () => import('@/pages/member/MemberResetPassword'),
);
const MemberNotifications = lazy(
  () => import('@/pages/member/MemberNotifications'),
);

import SplashScreen from '@/components/ui/SplashScreen';
import FloatingSettings from '@/components/landing/FloatingSettings';
import useSystemSettings from '@/hooks/useSystemSettings';

// Loading Fallback
const PageLoader = () => <SplashScreen />;

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
              {/* <Route path="/for-my-love" element={<Valentine />} /> */}
              {/* Public Routes */}
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/documentation/api" element={<ApiDocumentation />} />

              {/* Regular Admin Routes */}
              <Route element={<RequireAuth />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/members/:id" element={<MemberProfile />} />
                  <Route path="/customers/:id" element={<CustomerProfile />} />
                  <Route path="/loans" element={<Loans />} />
                  <Route path="/loan-requests" element={<LoanRequests />} />
                  <Route path="/loans/:id" element={<LoanDetail />} />
                  <Route path="/transactions" element={<Transactions />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/branches" element={<Branches />} />
                  <Route path="/branches/:id" element={<BranchDetail />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/team/:id" element={<StaffProfile />} />

                  {/* Admin Only Routes */}
                  <Route element={<RequireAdmin />}>
                    <Route path="/billing" element={<Billing />} />
                    <Route path="/pricing" element={<Pricing />} />
                  </Route>

                  <Route path="/settings" element={<Settings />} />

                  {/* Paid-plan only routes */}
                  <Route element={<RequirePaidPlan />}>
                    <Route path="/support" element={<Support />} />
                  </Route>
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/audit-logs" element={<AuditLogs />} />
                  <Route path="/payment/success" element={<PaymentSuccess />} />
                  <Route path="/payment/cancel" element={<PaymentCancel />} />
                </Route>
              </Route>

              {/* Super Admin Routes */}
              <Route element={<RequireAuth />}>
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

              <Route element={<RedirectIfAuthenticated />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route
                  path="/reset-password/:token"
                  element={<ResetPassword />}
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
              </Route>

              <Route element={<RequireMemberAuth />}>
                <Route element={<MemberLayout />}>
                  <Route
                    path="/member/dashboard"
                    element={<MemberDashboard />}
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
                  <Route path="/member/settings" element={<MemberSettings />} />
                  <Route
                    path="/member/notifications"
                    element={<MemberNotifications />}
                  />
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
