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
import RequireAuth from '@/components/RequireAuth';
import RedirectIfAuthenticated from '@/components/RedirectIfAuthenticated';
import { Toaster } from 'sonner';

// Lazy Load Pages
const Landing = lazy(() => import('@/pages/Landing'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Customers = lazy(() => import('@/pages/Customers'));
const Members = lazy(() => import('@/pages/Members'));
const Loans = lazy(() => import('@/pages/Loans'));
const Transactions = lazy(() => import('@/pages/Transactions'));
const Reports = lazy(() => import('@/pages/Reports'));
const Settings = lazy(() => import('@/pages/Settings'));
const Billing = lazy(() => import('@/pages/Billing'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const MemberProfile = lazy(() => import('@/pages/MemberProfile'));
const CustomerProfile = lazy(() => import('@/pages/CustomerProfile'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const Support = lazy(() => import('@/pages/Support'));
const LoanLookup = lazy(() => import('@/pages/LoanLookup'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const LoanDetail = lazy(() => import('@/pages/LoanDetail'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPage'));
const TermsOfService = lazy(() => import('@/pages/TermsPage'));
const PaymentSuccess = lazy(() => import('@/pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('@/pages/PaymentCancel'));

// Super Admin Pages
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

// Loading Fallback
const PageLoader = () => (
  <div className="h-screen w-full flex items-center justify-center bg-background/50 backdrop-blur-sm">
    <Loader2 className="w-10 h-10 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/loan-lookup" element={<LoanLookup />} />

          {/* Regular Admin Routes */}
          <Route element={<RequireAuth />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:id" element={<MemberProfile />} />
              <Route path="/customers/:id" element={<CustomerProfile />} />
              <Route path="/loans" element={<Loans />} />
              <Route path="/loans/:id" element={<LoanDetail />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/support" element={<Support />} />
              <Route path="/notifications" element={<Notifications />} />
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
              <Route path="notifications" element={<ManageNotifications />} />
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
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster position="top-right" richColors />
    </Router>
  );
}

export default App;
