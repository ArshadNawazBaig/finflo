import { Route } from 'react-router-dom';
import { withSkeleton } from '@/lib/routeUtils';
import DashboardLayout from '@/layouts/DashboardLayout';
import RequireAuth from '@/components/RequireAuth';
import RequirePermissions from '@/components/auth/RequirePermissions';
import RequirePaidPlan from '@/components/RequirePaidPlan';
import {
  TablePageSkeleton,
  LoansPageSkeleton,
  CardsPageSkeleton,
  ProfilePageSkeleton,
  SettingsPageSkeleton,
  AdminDashboardSkeleton,
  ReportsSkeleton,
  ChatSkeleton,
  RegistryPageSkeleton,
} from '@/components/ui/PageSkeletons';
import MemberProfileSkeleton from '@/components/member/MemberProfileSkeleton';
import MemberGuarantorsSkeleton from '@/components/member/MemberGuarantorsSkeleton';
import CustomerProfileSkeleton from '@/components/customers/CustomerProfileSkeleton';
import LoanDetailSkeleton from '@/components/loans/LoanDetailSkeleton';
import SupportPageSkeleton from '@/components/support/SupportPageSkeleton';
import BillingSkeleton from '@/components/pricing/BillingSkeleton';
import PricingSkeleton from '@/components/pricing/PricingSkeleton';

// Lazy Load Pages
const Dashboard = withSkeleton(() => import('@/pages/admin/Dashboard'), AdminDashboardSkeleton);
const Customers = withSkeleton(() => import('@/pages/admin/Customers'), RegistryPageSkeleton);
const Members = withSkeleton(() => import('@/pages/admin/Members'), TablePageSkeleton);
const Loans = withSkeleton(() => import('@/pages/admin/Loans'), LoansPageSkeleton);
const Transactions = withSkeleton(() => import('@/pages/admin/Transactions'), TablePageSkeleton);
const Reports = withSkeleton(() => import('@/pages/admin/Reports'), ReportsSkeleton);
const Branches = withSkeleton(() => import('@/pages/admin/Branches'), CardsPageSkeleton);
const BranchDetail = withSkeleton(() => import('@/pages/admin/BranchDetail'), ProfilePageSkeleton);
const Team = withSkeleton(() => import('@/pages/admin/Team'), CardsPageSkeleton);
const StaffProfile = withSkeleton(() => import('@/pages/admin/StaffProfile'), ProfilePageSkeleton);
const Settings = withSkeleton(() => import('@/pages/admin/Settings'), SettingsPageSkeleton);
const Billing = withSkeleton(() => import('@/pages/billing/Billing'), BillingSkeleton);
const Pricing = withSkeleton(() => import('@/pages/billing/Pricing'), PricingSkeleton);
const MemberProfile = withSkeleton(() => import('@/pages/admin/MemberProfile'), MemberProfileSkeleton);
const MemberGuarantors = withSkeleton(() => import('@/pages/admin/MemberGuarantors'), MemberGuarantorsSkeleton);
const CustomerProfile = withSkeleton(() => import('@/pages/admin/CustomerProfile'), CustomerProfileSkeleton);
const Support = withSkeleton(() => import('@/pages/admin/Support'), SupportPageSkeleton);
const Notifications = withSkeleton(() => import('@/pages/admin/Notifications'), RegistryPageSkeleton);
const LoanDetail = withSkeleton(() => import('@/pages/admin/LoanDetail'), LoanDetailSkeleton);
const LoanRequests = withSkeleton(() => import('@/pages/admin/LoanRequests'), TablePageSkeleton);
const LoanProducts = withSkeleton(() => import('@/pages/admin/LoanProducts'), TablePageSkeleton);
const DistributionHub = withSkeleton(() => import('@/pages/admin/DistributionHub'), TablePageSkeleton);
const VerificationQueue = withSkeleton(() => import('@/pages/admin/VerificationQueue'), RegistryPageSkeleton);
const Roles = withSkeleton(() => import('@/pages/admin/Roles'), SettingsPageSkeleton);
const AuditLogs = withSkeleton(() => import('@/pages/admin/AuditLogs'), RegistryPageSkeleton);
const AmlCompliance = withSkeleton(() => import('@/pages/admin/AmlCompliance'), RegistryPageSkeleton);
const Chat = withSkeleton(() => import('@/pages/admin/Chat'), ChatSkeleton);
const TellerMode = withSkeleton(() => import('@/pages/admin/TellerMode'), TablePageSkeleton);
const Statement = withSkeleton(() => import('@/pages/admin/Statement'), TablePageSkeleton);
const PaymentSuccess = withSkeleton(() => import('@/pages/billing/PaymentSuccess'), CardsPageSkeleton);
const PaymentCancel = withSkeleton(() => import('@/pages/billing/PaymentCancel'), CardsPageSkeleton);
const CashFlowForecast = withSkeleton(() => import('@/pages/admin/CashFlowForecast'), ReportsSkeleton);
const BulkOperations = withSkeleton(() => import('@/pages/admin/BulkOperations'), TablePageSkeleton);
const Disputes = withSkeleton(() => import('@/pages/admin/Disputes'), RegistryPageSkeleton);

const AdminRoutes = () => (
  <Route element={<RequireAuth />}>
    <Route element={<DashboardLayout />}>
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Permission Based Routes */}
      <Route element={<RequirePermissions permissions={['view_all', 'manage_members', 'manage_roles']} any />}>
        <Route path="/customers" element={<Customers />} />
        <Route path="/members" element={<Members />} />
        <Route path="/members/:id" element={<MemberProfile />} />
        <Route path="/members/:id/guarantors" element={<MemberGuarantors />} />
        <Route path="/customers/:id" element={<CustomerProfile />} />
        <Route path="/team" element={<Team />} />
        <Route path="/team/:id" element={<StaffProfile />} />
      </Route>

      <Route element={<RequirePermissions permissions={['manage_loans']} />}>
        <Route path="/loan-requests" element={<LoanRequests />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_all', 'manage_loans']} any />}>
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_all', 'view_reports', 'manage_loans']} any />}>
        <Route path="/transactions" element={<Transactions />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_all', 'view_reports']} any />}>
        <Route path="/statement" element={<Statement />} />
      </Route>

      {/* Teller Mode — front-counter cash operations. `view_all` keeps
          admins in; `process_transactions` is the dedicated capability the
          Teller / Branch Manager / Accountant templates grant. */}
      <Route
        element={
          <RequirePermissions
            permissions={['view_all', 'process_transactions']}
            any
          />
        }
      >
        <Route path="/teller" element={<TellerMode />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_reports']} />}>
        <Route path="/reports" element={<Reports />} />
        <Route path="/cash-flow-forecast" element={<CashFlowForecast />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_all', 'manage_loans', 'manage_members']} any />}>
        <Route path="/bulk-operations" element={<BulkOperations />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_all', 'manage_members']} any />}>
        <Route path="/disputes" element={<Disputes />} />
      </Route>

      <Route element={<RequirePermissions permissions={['manage_branches']} />}>
        <Route path="/branches" element={<Branches />} />
        <Route path="/branches/:id" element={<BranchDetail />} />
      </Route>

      <Route element={<RequirePermissions permissions={['manage_members', 'view_reports']} any />}>
        <Route path="/distributions" element={<DistributionHub />} />
      </Route>

      <Route element={<RequirePermissions permissions={['manage_loans', 'system_settings']} any />}>
        <Route path="/loan-products" element={<LoanProducts />} />
      </Route>

      <Route element={<RequirePermissions permissions={['system_settings']} />}>
        <Route path="/billing" element={<Billing />} />
        <Route path="/pricing" element={<Pricing />} />
      </Route>

      <Route element={<RequirePermissions permissions={['approve_members', 'manage_members']} any />}>
        <Route path="/verification-queue" element={<VerificationQueue />} />
      </Route>

      <Route element={<RequirePermissions permissions={['manage_roles']} />}>
        <Route path="/roles" element={<Roles />} />
      </Route>

      <Route element={<RequirePermissions permissions={['view_reports', 'manage_roles']} any />}>
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/aml-compliance" element={<AmlCompliance />} />
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
);

export default AdminRoutes;
