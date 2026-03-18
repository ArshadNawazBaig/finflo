import { Route } from 'react-router-dom';
import { withSkeleton } from '@/lib/routeUtils';
import SuperAdminLayout from '@/layouts/SuperAdminLayout';
import RequireAuth from '@/components/RequireAuth';
import RequireAdmin from '@/components/RequireAdmin';
import {
  TablePageSkeleton,
  ProfilePageSkeleton,
  SettingsPageSkeleton,
  AdminDashboardSkeleton,
  ActivityLogsPageSkeleton,
  ReportsSkeleton,
  CardsPageSkeleton,
} from '@/components/ui/PageSkeletons';

const SuperAdminDashboard = withSkeleton(() => import('@/pages/superadmin/SuperAdminDashboard'), AdminDashboardSkeleton);
const ManageUsers = withSkeleton(() => import('@/pages/superadmin/ManageUsers'), TablePageSkeleton);
const UserDetail = withSkeleton(() => import('@/pages/superadmin/UserDetail'), ProfilePageSkeleton);
const SystemAnalytics = withSkeleton(() => import('@/pages/superadmin/SystemAnalytics'), AdminDashboardSkeleton);
const ManageNotifications = withSkeleton(() => import('@/pages/superadmin/ManageNotifications'), TablePageSkeleton);
const ActivityLogs = withSkeleton(() => import('@/pages/superadmin/ActivityLogs'), ActivityLogsPageSkeleton);
const SystemSettings = withSkeleton(() => import('@/pages/superadmin/SystemSettings'), SettingsPageSkeleton);
const RevenueReports = withSkeleton(() => import('@/pages/superadmin/RevenueReports'), ReportsSkeleton);
const BackupExport = withSkeleton(() => import('@/pages/superadmin/BackupExport'), CardsPageSkeleton);
const ManageTickets = withSkeleton(() => import('@/pages/superadmin/ManageTickets'), TablePageSkeleton);

const SuperAdminRoutes = () => (
  <Route element={<RequireAuth />}>
    <Route element={<RequireAdmin />}>
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
  </Route>
);

export default SuperAdminRoutes;
