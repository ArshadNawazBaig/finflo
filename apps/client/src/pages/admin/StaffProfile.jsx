import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Clock,
  Building2,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/axios';
import { capitalize, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const StaffProfileSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    {/* Page Header Skeleton */}
    <div className="bg-card/30 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div className="space-y-4 flex-1">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-wrap gap-4 pt-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-lg" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
    </div>

    {/* Stats Cards Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Skeleton className="h-32 rounded-[2rem] border border-border/50 bg-card/50" />
      <Skeleton className="h-32 rounded-[2rem] border border-border/50 bg-card/50" />
      <Skeleton className="h-32 rounded-[2rem] border border-border/50 bg-card/50" />
    </div>

    {/* Activity Table Skeleton */}
    <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden">
      <div className="p-6 border-b border-border/50 bg-muted/30">
        <Skeleton className="h-6 w-48 rounded-lg" />
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex gap-4 p-4 rounded-2xl border border-border/10 bg-muted/20"
          >
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/4 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
              <Skeleton className="h-2 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const StaffProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit] = useState(10);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/staff/${id}?page=1&limit=${limit}`);
      setStaff(data.staff);
      setRecentActivity(data.recentActivity || []);
      setTotalPages(data.totalPages || 0);
      setTotalEntries(data.totalEntries || 0);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff details');
      navigate('/team');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, limit]);

  const fetchActivity = useCallback(
    async (pageToFetch, isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setIsActivityLoading(true);
        }

        const { data } = await api.get(
          `/staff/${id}?page=${pageToFetch}&limit=${limit}`,
        );

        if (isAppend) {
          setRecentActivity((prev) => [
            ...prev,
            ...(data.recentActivity || []),
          ]);
        } else {
          setRecentActivity(data.recentActivity || []);
        }

        setTotalPages(data.totalPages || 0);
        setTotalEntries(data.totalEntries || 0);
        setCurrentPage(pageToFetch);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast.error('Failed to load more activity');
      } finally {
        setIsActivityLoading(false);
        setIsFetchingMore(false);
      }
    },
    [id, limit],
  );

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Infinite Scroll for Mobile
  useEffect(() => {
    if (!isMobile || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchActivity(currentPage + 1, true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [
    isMobile,
    loading,
    isFetchingMore,
    currentPage,
    totalPages,
    fetchActivity,
  ]);

  if (loading) {
    return <StaffProfileSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        variant="card"
        icon={User}
        onBack={() => navigate('/team')}
        title={capitalize(staff?.name) || 'Staff Profile'}
        badge={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                staff?.isActive
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20',
              )}
            >
              {staff?.isActive ? (
                <CheckCircle2 size={10} />
              ) : (
                <XCircle size={10} />
              )}
              {staff?.isActive ? 'Active' : 'Inactive'}
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
              {staff?.role}
            </span>
          </div>
        }
        description={
          <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-muted-foreground">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Mail className="w-4 h-4 text-primary" />
              <span>{staff?.email}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 bg-border rounded-full" />
            <div className="flex items-center gap-2 text-sm font-medium capitalize">
              <Building2 className="w-4 h-4 text-primary" />
              <span>{staff?.branchId?.name || 'Global Access'}</span>
            </div>
            <div className="hidden sm:block w-1.5 h-1.5 bg-border rounded-full" />
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="w-4 h-4 text-primary" />
              <span>
                Member Since{' '}
                {format(new Date(staff?.createdAt || Date.now()), 'PPP')}
              </span>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatsCard
          title="Role"
          amount={capitalize(staff?.role)}
          icon={<Shield size={20} />}
          color="bg-primary shadow-primary/20"
          subtitle="System permissions"
        />
        <StatsCard
          title="Status"
          amount={staff?.isActive ? 'Operational' : 'Restricted'}
          icon={<Activity size={20} />}
          color={staff?.isActive ? 'bg-emerald-500' : 'bg-red-500'}
          subtitle="Current access level"
        />
        <StatsCard
          title="Branch"
          amount={staff?.branchId?.name || 'Global'}
          icon={<Building2 size={20} />}
          color="bg-blue-500 shadow-blue-500/20"
          subtitle="Assigned location"
        />
      </div>

      <div className="bg-card border border-border/50 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border/50 bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Clock size={20} />
            </div>
            <h3 className="font-black text-lg">Recent System Activity</h3>
          </div>
          {!isMobile && totalEntries > 0 && (
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-1 rounded-full">
              {totalEntries} Total
            </span>
          )}
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity?.length > 0 ? (
              <>
                <div
                  className={cn(
                    'grid gap-4',
                    isMobile ? 'grid-cols-1' : 'grid-cols-1',
                  )}
                >
                  {recentActivity.map((log) => (
                    <div
                      key={log._id}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-muted/30 border border-border/10 hover:border-primary/20 transition-all group"
                    >
                      <div className="mt-1 p-2 rounded-full bg-background border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-foreground capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          {isMobile && (
                            <span className="text-[10px] text-muted-foreground/60 font-medium whitespace-nowrap">
                              {format(new Date(log.createdAt), 'MMM d')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {log.details}
                        </p>
                        {!isMobile && (
                          <p className="text-[10px] text-muted-foreground/60 font-medium pt-1">
                            {format(
                              new Date(log.createdAt),
                              'MMM d, yyyy • h:mm a',
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {isMobile ? (
                  currentPage < totalPages && (
                    <div ref={observerTarget} className="pt-4">
                      <InfiniteLoader isFetchingMore={isFetchingMore} />
                    </div>
                  )
                ) : (
                  <div className="pt-6 border-t border-border/10 mt-6">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalEntries={totalEntries}
                      limit={limit}
                      onPageChange={(page) => fetchActivity(page)}
                    />
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={Activity}
                title="No Recent Activity"
                description="This staff member hasn't performed any logged actions recently."
                className="py-12"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
