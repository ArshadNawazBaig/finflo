import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Shield,
  LogIn,
  FileEdit,
  Trash2,
  Terminal,
  Activity,
  Archive,
  Eye,
  X,
  Globe,
} from 'lucide-react';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import Pagination from '@/components/ui/Pagination';
import PageHeader from '@/components/PageHeader';
import { RegistryPageSkeleton } from '@/components/ui/PageSkeletons';
import InfiniteLoader from '@/components/InfiniteLoader';
import EmptyState from '@/components/ui/EmptyState';
import MemberAvatar from '@/components/member/MemberAvatar';
import { toast } from 'sonner';
import PillSelect from '@/components/ui/PillSelect';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn, capitalize } from '@/lib/utils';
import { useIsMobile } from '@/hooks/useIsMobile';
import useDebounce from '@/hooks/useDebounce';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedLog, setSelectedLog] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observer = useRef();
  const isMobile = useIsMobile();
  const skipNextEffect = useRef(false);

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
  }, [isMobile]);

  const fetchLogs = useCallback(
    async (page = 1, append = false) => {
      try {
        if (append) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }
        const params = new URLSearchParams({
          page,
          limit,
          ...(debouncedSearch && { search: debouncedSearch }),
          ...(category && category !== 'all' && { category }),
          sortBy,
        });

        const { data } = await api.get(`/activity-logs?${params}`);
        const newLogs = data.logs || [];
        if (append) {
          setLogs((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            return [...prev, ...newLogs.filter((l) => !existingIds.has(l._id))];
          });
          skipNextEffect.current = true;
        } else {
          setLogs(newLogs);
        }
        setPagination(data.pagination);
        setHasMore(data.pagination.page < data.pagination.pages);
      } catch (error) {
        console.error('Failed to fetch activity logs:', error);
        toast.error('Failed to fetch audit logs');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [limit, debouncedSearch, category, sortBy],
  );

  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }
    fetchLogs(pagination.page, false);
  }, [pagination.page, fetchLogs]);

  const lastLogElementRef = useCallback(
    (node) => {
      if (loading || isFetchingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          fetchLogs(pagination.page + 1, true);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, pagination.page, fetchLogs],
  );

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'auth':
        return 'border-blue-500/30 text-blue-400 bg-blue-500/5';
      case 'loan':
        return 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5';
      case 'customer':
        return 'border-cyan-500/30 text-cyan-400 bg-cyan-500/5';
      case 'admin':
        return 'border-red-500/30 text-red-400 bg-red-500/5';
      default:
        return 'border-border/30 text-muted-foreground bg-muted/5';
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('login')) return <LogIn size={14} />;
    if (action.includes('loan')) return <Activity size={14} />;
    if (action.includes('update')) return <FileEdit size={14} />;
    if (action.includes('delete')) return <Trash2 size={14} />;
    return <Terminal size={14} />;
  };

  if (loading && logs.length === 0) {
    return <RegistryPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Trace Ledger"
        description="System audit trail. Every action, movement, and trace recorded with absolute precision."
        icon={Archive}
        variant="card"
        badge={
          <div className="px-5 h-12 flex items-center justify-center rounded-2xl bg-slate-900 border border-white/10 text-center min-w-[140px]">
            <p className="text-sm font-black text-white font-mono gap-2 flex items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {pagination.total.toLocaleString()} TRACES
            </p>
          </div>
        }
      />

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-6 relative group flex">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input
            type="text"
            placeholder="Trace by action, user, or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-11 pr-10 rounded-full bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] text-sm font-semibold focus:ring-0 focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40 dark:text-white"
          />
          {search && (
            <Button
              variant="ghost"
              onClick={() => setSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors"
            >
              <X size={14} />
            </Button>
          )}
        </div>
        <div className="lg:col-span-2">
          <PillSelect
            value={category || 'all'}
            onValueChange={(value) => setCategory(value === 'all' ? '' : value)}
            placeholder="All Streams"
            className="w-full"
            options={[
              { value: 'all', label: 'All Streams' },
              { value: 'auth', label: 'Authentication' },
              { value: 'loan', label: 'Loan Activity' },
              { value: 'customer', label: 'Customer Relations' },
              { value: 'admin', label: 'System Admin' },
            ]}
          />
        </div>
        <div className="lg:col-span-2">
          <PillSelect
            value={sortBy}
            onValueChange={setSortBy}
            placeholder="Timeline"
            className="w-full"
            options={[
              { value: 'newest', label: 'Latest Traces' },
              { value: 'oldest', label: 'Historical Start' },
            ]}
          />
        </div>
        <div className="lg:col-span-2">
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setCategory('all');
              setSortBy('newest');
            }}
            disabled={!search && category === 'all' && sortBy === 'newest'}
            className="w-full h-11 rounded-full border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-primary/5 dark:hover:bg-primary/10 hover:border-primary/50 text-sm font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed group flex items-center justify-center gap-2 dark:text-white"
          >
            <X
              size={14}
              className="group-hover:rotate-90 transition-transform"
            />
            Reset
          </Button>
        </div>
      </div>

      {/* Mobile Card Grid */}
      <div className="lg:hidden space-y-4">
        {logs.length === 0 ? (
          <EmptyState
            icon={Terminal}
            title="Zero Traces Found"
            description={
              search
                ? `No system audits match your search for "${search}".`
                : "The system's black box is currently clear. No audit traces recorded for this stream."
            }
            className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem] py-20"
          />
        ) : (
          logs.map((log, index) => (
            <div
              key={log._id}
              ref={index === logs.length - 1 ? lastLogElementRef : null}
              onClick={() => setSelectedLog(log)}
              className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] active:scale-[0.98] transition-all relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-4">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border',
                    getCategoryColor(log.category),
                  )}
                >
                  {log.category}
                </span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <MemberAvatar
                  name={log.user?.name || 'S'}
                  profilePicture={
                    log.user?.businessLogo || log.user?.profilePicture
                  }
                  size={40}
                  rounded="rounded-full"
                  className="text-[12px] shadow-lg shadow-primary/20"
                  fallback={!log.user?.name ? <Shield size={16} /> : undefined}
                />
                <div>
                  <p className="text-xs font-black tracking-tight">
                    {capitalize(log.user?.name) || 'System Auto'}
                  </p>
                  <p className="text-[10px] tabular-nums text-muted-foreground/60 font-bold">
                    {new Date(log.createdAt).toLocaleDateString()} •{' '}
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour12: false,
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <div className="p-1.5 rounded-lg bg-foreground/5 text-foreground/60 shrink-0">
                  {getActionIcon(log.action)}
                </div>
                <p className="text-[11px] font-bold text-foreground/80 leading-relaxed uppercase tracking-tight">
                  {log.action.replace(/_/g, ' ')}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                  <Globe size={11} className="text-slate-400" />
                  {log.ipAddress || '—'}
                </span>
                <Button
                  variant="ghost"
                  className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1"
                >
                  View Source <Eye size={12} />
                </Button>
              </div>
            </div>
          ))
        )}
        {hasMore && (
          <div ref={lastLogElementRef}>
            <InfiniteLoader isFetchingMore={isFetchingMore} />
          </div>
        )}
      </div>

      {/* Desktop Trace Table */}
      <div className="hidden lg:block rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden relative group">
        <div className="overflow-x-auto relative">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 w-[180px]">
                  Timestamp
                </th>
                <th className="text-left px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Agent
                </th>
                <th className="text-left px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Execution
                </th>
                <th className="text-left px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Stream
                </th>
                <th className="text-left px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Source
                </th>
                <th className="text-right px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20">
                    <EmptyState
                      icon={Terminal}
                      title="Zero Traces Found"
                      description={
                        search
                          ? `No system audits match your search for "${search}".`
                          : "The system's black box is currently clear. No audit traces recorded for this stream."
                      }
                      variant="subtle"
                      className="py-12"
                    />
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className="group/row hover:bg-muted/30 transition-all cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-8 py-5">
                      <div className="flex flex-col tabular-nums text-[11px] font-bold">
                        <span className="text-foreground">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-muted-foreground/60">
                          {new Date(log.createdAt).toLocaleTimeString([], {
                            hour12: false,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      {log.user ? (
                        <div className="flex items-center gap-3">
                          <MemberAvatar
                            name={log.user.name || 'U'}
                            profilePicture={
                              log.user.businessLogo || log.user.profilePicture
                            }
                            size={32}
                            rounded="rounded-full"
                            className="text-[10px] capitalize shadow-lg shadow-primary/20"
                          />
                          <div>
                            <p className="text-xs font-black tracking-tight leading-none mb-1 capitalize">
                              {capitalize(log.user.name)}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground/60">
                              {log.user.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-primary/40 font-bold text-xs uppercase tracking-tighter">
                          <Shield size={12} />
                          Auto-System
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 max-w-md">
                        <div className="p-1.5 rounded-lg bg-foreground/5 text-foreground/40">
                          {getActionIcon(log.action)}
                        </div>
                        <span className="text-xs font-black capitalize tracking-tight text-foreground/80">
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className={cn(
                          'inline-flex items-center px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border',
                          getCategoryColor(log.category),
                        )}
                      >
                        {log.category}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground">
                        <Globe size={12} className="shrink-0 text-slate-400" />
                        {log.ipAddress || '—'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Button
                        variant="ghost"
                        className="p-2 rounded-xl bg-muted/50 text-muted-foreground opacity-0 group-hover/row:opacity-100 transition-all hover:bg-primary/10 hover:text-primary"
                      >
                        <Eye size={16} strokeWidth={2.5} />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-5 border-t border-slate-100 dark:border-white/[0.06]">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.pages}
            totalEntries={pagination.total}
            limit={limit}
            onPageChange={(page) => fetchLogs(page)}
            onLimitChange={setLimit}
          />
        </div>
      </div>

      {/* Metadata Insight Modal */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem]">
          <DialogHeader className="p-8 pb-4 border-b border-border/60">
            <div className="flex items-center gap-3 mb-2 text-primary">
              <Terminal size={20} className="animate-pulse" />
              <DialogTitle className="text-lg font-black tracking-tight font-mono">
                Trace Details
              </DialogTitle>
            </div>
            {selectedLog && (
              <p className="text-xs text-muted-foreground/60 font-mono">
                ID: {selectedLog._id} • REF: LOAN-
                {selectedLog.metadata?.loanId?.slice(-6).toUpperCase() || 'SYS'}
              </p>
            )}
          </DialogHeader>

          {selectedLog && (
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] scrollbar-hide font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-muted/40 dark:bg-white/[0.02] border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">
                    IP Source
                  </p>
                  <p className="text-sm font-bold text-foreground tracking-widest">
                    {selectedLog.ipAddress || '0.0.0.0'}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-muted/40 dark:bg-white/[0.02] border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">
                    Stream Source
                  </p>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                    {selectedLog.category}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-2">
                  Execution Payload
                </p>
                <div className="p-6 rounded-[1.5rem] bg-slate-50 dark:bg-black/40 border border-border text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {selectedLog.details}
                </div>
              </div>

              {selectedLog.metadata && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-2">
                    Metadata Insight
                  </p>

                  {/* Before/After State Diff */}
                  {selectedLog.metadata.before && selectedLog.metadata.after ? (
                    <div className="rounded-[1.5rem] overflow-hidden border border-border">
                      <div className="grid grid-cols-2 divide-x divide-border">
                        <div className="p-4 bg-rose-500/5 dark:bg-red-900/20">
                          <p className="text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-red-400/70 mb-3">
                            Before
                          </p>
                          <div className="space-y-2">
                            {Object.entries(selectedLog.metadata.before).map(
                              ([key, val]) => (
                                <div key={key}>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                    {key.replace(/([A-Z])/g, ' $1')}
                                  </span>
                                  <p className="text-sm font-black text-rose-600 dark:text-red-300 line-through">
                                    {typeof val === 'number'
                                      ? val.toLocaleString()
                                      : String(val)}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                        <div className="p-4 bg-emerald-500/5 dark:bg-emerald-900/20">
                          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400/70 mb-3">
                            After
                          </p>
                          <div className="space-y-2">
                            {Object.entries(selectedLog.metadata.after).map(
                              ([key, val]) => (
                                <div key={key}>
                                  <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                                    {key.replace(/([A-Z])/g, ' $1')}
                                  </span>
                                  <p className="text-sm font-black text-emerald-600 dark:text-emerald-300">
                                    {typeof val === 'number'
                                      ? val.toLocaleString()
                                      : String(val)}
                                  </p>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-[1.5rem] bg-muted/50 dark:bg-white/[0.02] border border-border text-[13px] overflow-x-auto">
                      <pre className="text-foreground/80 scrollbar-hide">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.userAgent && (
                <div className="p-4 rounded-2xl bg-muted/40 dark:bg-white/[0.02] border border-border">
                  <p className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest mb-1">
                    Agent Signature
                  </p>
                  <p className="text-[11px] font-bold text-muted-foreground/60 break-all leading-tight ">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
