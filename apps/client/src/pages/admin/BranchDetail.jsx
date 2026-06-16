import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Store,
  Receipt,
  History,
  Info,
  TrendingUp,
  Settings2,
  Power,
  PowerOff,
  MapPin,
  Phone,
  Palette,
  UserCog,
  Coins,
  Download,
  ExternalLink,
  HandCoins,
  Globe,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { ProfilePageSkeleton } from '@/components/ui/PageSkeletons';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import ChartSkeleton from '@/components/skeletons/ChartSkeleton';
import TransactionTable from '@/components/payments/TransactionTable';
import TransactionCard from '@/components/payments/TransactionCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import AnalyticsChart from '@/components/AnalyticsChart';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { subMonths } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { exportCashFlowStatement } from '@/lib/cashFlowPdfUtils';
import TableSearch from '@/components/ui/TableSearch';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useIsMobile } from '@/hooks/useIsMobile';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';

const BranchDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [isUpdatingManager, setIsUpdatingManager] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [expenseData, setExpenseData] = useState({
    staffId: '',
    paymentMethod: 'cash',
  });
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingLedger, setIsDownloadingLedger] = useState(false);
  const [isDownloadingExpenses, setIsDownloadingExpenses] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Financials Pagination States
  const [expenses, setExpenses] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({
    totalTransactions: 0,
    totalExpenses: 0,
    liquidity: null, // Initialized as null to track first load
  });
  const [fetchingFinancials, setFetchingFinancials] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useIsMobile();

  // Analytics Chart State
  const [analyticsData, setAnalyticsData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // Ledger Filter States
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDateRange, setLedgerDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [ledgerCategory, setLedgerCategory] = useState('all');

  // Expense Filter States
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseDateRange, setExpenseDateRange] = useState({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [expenseCategory, setExpenseCategory] = useState('all');
  const [classificationPool, setClassificationPool] = useState([]);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);

  const expenseObserverTarget = useRef(null);
  const ledgerObserverTarget = useRef(null);
  const skipNextEffect = useRef(false);
  const initialFetchDone = useRef(false);

  const [ledgerPagination, setLedgerPagination] = useState({
    page: 1,
    limit: 10,
    totalEntries: 0,
    totalPages: 0,
  });

  const [expensePagination, setExpensePagination] = useState({
    page: 1,
    limit: 10,
    totalEntries: 0,
    totalPages: 0,
  });

  const [ledgerSortBy, setLedgerSortBy] = useState('date');
  const [ledgerSortOrder, setLedgerSortOrder] = useState('desc');
  const [expenseSortBy, setExpenseSortBy] = useState('date');
  const [expenseSortOrder, setExpenseSortOrder] = useState('desc');

  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};

  useEffect(() => {
    // Set smaller limits for mobile infinite scroll
    if (isMobile) {
      setExpensePagination((prev) => ({ ...prev, limit: 5, page: 1 }));
      setLedgerPagination((prev) => ({ ...prev, limit: 5, page: 1 }));
    } else {
      setExpensePagination((prev) => ({ ...prev, limit: 10, page: 1 }));
      setLedgerPagination((prev) => ({ ...prev, limit: 10, page: 1 }));
    }
  }, [isMobile]);

  const fetchBranch = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/branches/${id}`);
      setBranch(res.data);
    } catch (error) {
      console.error('Failed to fetch branch details', error);
      toast.error('Failed to load branch information');
      navigate('/branches');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  const fetchExpenses = useCallback(
    async (isAppend = false, pageOverride) => {
      try {
        if (isAppend) setIsFetchingMore(true);
        else setFetchingFinancials(true);

        const pageToFetch =
          pageOverride ||
          (isAppend ? expensePagination.page + 1 : expensePagination.page);

        const { data } = await api.get(`/branches/${id}/financials`, {
          params: {
            type: 'expense',
            page: pageToFetch,
            limit: expensePagination.limit,
            search: expenseSearch,
            category: expenseCategory,
            startDate: expenseDateRange?.from?.toISOString(),
            endDate: expenseDateRange?.to?.toISOString(),
            sortBy: expenseSortBy,
            sortOrder: expenseSortOrder,
          },
        });

        if (isAppend) {
          setExpenses((prev) => {
            const existingIds = new Set(prev.map((e) => e._id));
            const newItems = data.data.filter((e) => !existingIds.has(e._id));
            return [...prev, ...newItems];
          });
          skipNextEffect.current = true;
        } else {
          setExpenses(data.data);
        }

        setSummary(data.summary);
        setExpensePagination((prev) => ({
          ...prev,
          page: pageToFetch,
          totalEntries: data.totalEntries,
          totalPages: data.totalPages,
        }));
      } catch (error) {
        toast.error('Failed to fetch expenses');
      } finally {
        setFetchingFinancials(false);
        setIsFetchingMore(false);
      }
    },
    [
      id,
      expensePagination.page,
      expensePagination.limit,
      expenseSearch,
      expenseDateRange,
      expenseSortBy,
      expenseSortOrder,
      expenseCategory,
    ],
  );

  const fetchLedger = useCallback(
    async (isAppend = false, pageOverride) => {
      try {
        if (isAppend) setIsFetchingMore(true);
        else setFetchingFinancials(true);

        const pageToFetch =
          pageOverride ||
          (isAppend ? ledgerPagination.page + 1 : ledgerPagination.page);

        const { data } = await api.get(`/branches/${id}/financials`, {
          params: {
            page: pageToFetch,
            limit: ledgerPagination.limit,
            search: ledgerSearch,
            category: ledgerCategory,
            startDate: ledgerDateRange?.from?.toISOString(),
            endDate: ledgerDateRange?.to?.toISOString(),
            sortBy: ledgerSortBy,
            sortOrder: ledgerSortOrder,
          },
        });

        if (isAppend) {
          setLedger((prev) => {
            const existingIds = new Set(prev.map((l) => l._id));
            const newItems = data.data.filter((l) => !existingIds.has(l._id));
            return [...prev, ...newItems];
          });
          skipNextEffect.current = true;
        } else {
          setLedger(data.data);
        }

        setSummary(data.summary);
        setLedgerPagination((prev) => ({
          ...prev,
          page: pageToFetch,
          totalEntries: data.totalEntries,
          totalPages: data.totalPages,
        }));
      } catch (error) {
        toast.error('Failed to fetch ledger');
      } finally {
        setFetchingFinancials(false);
        setIsFetchingMore(false);
      }
    },
    [
      id,
      ledgerPagination.page,
      ledgerPagination.limit,
      ledgerSearch,
      ledgerDateRange,
      ledgerSortBy,
      ledgerSortOrder,
      ledgerCategory,
    ],
  );

  const fetchAnalytics = useCallback(async () => {
    try {
      setChartLoading(true);
      const params = {};
      if (dateRange?.from && dateRange?.to) {
        params.startDate = dateRange.from.toISOString();
        params.endDate = dateRange.to.toISOString();
      }

      const { data } = await api.get(`/branches/${id}/analytics`, { params });
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load chart data');
    } finally {
      setChartLoading(false);
    }
  }, [id, dateRange]);

  const handleDownload = async () => {
    try {
      if (!dateRange?.from || !dateRange?.to) {
        toast.error('Please select a date range first');
        return;
      }
      setIsDownloading(true);
      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: dateRange.from.toISOString(),
          endDate: dateRange.to.toISOString(),
          format: 'json',
          branchId: id,
        },
      });

      await exportCashFlowStatement(
        response.data,
        dateRange,
        user.name,
        branch?.name,
      );
      toast.success('Statement generated and downloaded as PDF');
    } catch (error) {
      console.error('Failed to download statement', error);
      toast.error('Failed to download statement');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLedgerDownload = async () => {
    try {
      if (!ledgerDateRange?.from || !ledgerDateRange?.to) {
        toast.error('Please select a date range first');
        return;
      }
      setIsDownloadingLedger(true);
      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: ledgerDateRange.from.toISOString(),
          endDate: ledgerDateRange.to.toISOString(),
          format: 'json',
          branchId: id,
        },
      });

      await exportCashFlowStatement(
        response.data,
        ledgerDateRange,
        user.name,
        branch?.name,
      );
      toast.success('Ledger statement generated as PDF');
    } catch (error) {
      console.error('Failed to download ledger', error);
      toast.error('Failed to download ledger');
    } finally {
      setIsDownloadingLedger(false);
    }
  };

  const handleExpenseDownload = async () => {
    try {
      if (!expenseDateRange?.from || !expenseDateRange?.to) {
        toast.error('Please select a date range first');
        return;
      }
      setIsDownloadingExpenses(true);
      // Expenses are part of the statement, but we might want to filter specifically by type if the API supported it
      // For now, use the same statement API which includes expenses
      const response = await api.get('/dashboard/download-statement', {
        params: {
          startDate: expenseDateRange.from.toISOString(),
          endDate: expenseDateRange.to.toISOString(),
          format: 'json',
          branchId: id,
        },
      });

      await exportCashFlowStatement(
        response.data,
        expenseDateRange,
        user.name,
        branch?.name,
      );
      toast.success('Expense statement generated as PDF');
    } catch (error) {
      console.error('Failed to download expenses', error);
      toast.error('Failed to download expenses');
    } finally {
      setIsDownloadingExpenses(false);
    }
  };

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await api.get('/staff?limit=100'); // Get all staff
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      setIsFetchingCategories(true);
      const { data } = await api.get('/expense-categories');
      setClassificationPool(
        data.map((cat) => ({
          value: cat.name,
          label: cat.name.charAt(0).toUpperCase() + cat.name.slice(1),
          deletable: !cat.isSystem,
          id: cat._id,
        })),
      );
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load classification pool');
    } finally {
      setIsFetchingCategories(false);
    }
  }, []);

  // Initial Mount
  useEffect(() => {
    if (!initialFetchDone.current) {
      fetchBranch();
      fetchStaff();
      fetchCategories();
      // Pre-fetch ledger/stats immediately for a seamless overview experience
      fetchLedger(false);
      initialFetchDone.current = true;
    }
  }, [fetchBranch, fetchStaff, fetchCategories, fetchLedger]);

  // Date Range Trigger for Analytics
  useEffect(() => {
    if (dateRange?.from && dateRange?.to && activeTab === 'overview') {
      fetchAnalytics();
    }
  }, [dateRange, fetchAnalytics, activeTab]);

  // Tab Specific Triggers with Debouncing for filters
  useEffect(() => {
    if (skipNextEffect.current) {
      skipNextEffect.current = false;
      return;
    }

    const delayDebounceFn = setTimeout(
      () => {
        if (activeTab === 'expenses') {
          fetchExpenses(false);
        } else if (activeTab === 'ledger') {
          fetchLedger(false);
        } else if (activeTab === 'overview') {
          fetchAnalytics();
        }
      },
      expenseSearch || ledgerSearch ? 500 : 0,
    ); // Debounce search, but not tab change

    return () => clearTimeout(delayDebounceFn);
  }, [
    activeTab,
    ledgerSearch,
    ledgerDateRange,
    ledgerCategory,
    ledgerSortBy,
    ledgerSortOrder,
    ledgerPagination.page,
    ledgerPagination.limit,
    expenseSearch,
    expenseDateRange,
    expenseCategory,
    expenseSortBy,
    expenseSortOrder,
    expensePagination.page,
    expensePagination.limit,
    fetchExpenses,
    fetchLedger,
    fetchAnalytics,
  ]);

  // Infinite Scroll Observers
  useEffect(() => {
    if (!isMobile || activeTab !== 'expenses') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          expensePagination.page < expensePagination.totalPages
        ) {
          fetchExpenses(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (expenseObserverTarget.current)
      observer.observe(expenseObserverTarget.current);
    return () => observer.disconnect();
  }, [isMobile, activeTab, isFetchingMore, expensePagination, fetchExpenses]);

  useEffect(() => {
    if (!isMobile || activeTab !== 'ledger') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          ledgerPagination.page < ledgerPagination.totalPages
        ) {
          fetchLedger(true);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    if (ledgerObserverTarget.current)
      observer.observe(ledgerObserverTarget.current);
    return () => observer.disconnect();
  }, [isMobile, activeTab, isFetchingMore, ledgerPagination, fetchLedger]);

  const toggleStatus = async () => {
    try {
      setIsTogglingStatus(true);
      const newStatus = !branch.isActive;
      await api.put(`/branches/${id}`, {
        isActive: newStatus,
      });
      setBranch({ ...branch, isActive: newStatus });
      toast.success(
        `Branch ${newStatus ? 'activated' : 'deactivated'} successfully`,
      );
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleAddExpense = async () => {
    try {
      if (expenseData.category === 'salary' && !expenseData.staffId) {
        toast.error('Please select a staff member for salary expenses');
        return;
      }
      setIsAddingExpense(true);
      await api.post(`/branches/${id}/expenses`, expenseData);
      toast.success('Expense recorded successfully');
      setIsExpenseModalOpen(false);
      setExpenseData({
        amount: '',
        category: 'rent',
        description: '',
        staffId: '',
        paymentMethod: 'cash',
      });

      // Reset 'to' dates to now to ensure the new expense is included in filters
      const now = new Date();
      setExpenseDateRange((prev) => ({ ...prev, to: now }));
      setLedgerDateRange((prev) => ({ ...prev, to: now }));
      setDateRange((prev) => ({ ...prev, to: now }));

      // Refresh all financial data to ensure stats cards and tables are in sync
      await Promise.all([
        fetchExpenses(false),
        fetchLedger(false),
        fetchAnalytics(),
      ]);
    } catch (error) {
      toast.error('Failed to record expense');
    } finally {
      setIsAddingExpense(false);
    }
  };

  const handleUpdateManager = async (managerId) => {
    try {
      setIsUpdatingManager(true);
      await api.put(`/branches/${id}`, { managerId });
      toast.success('Branch manager updated');
      fetchBranch();
    } catch (error) {
      toast.error('Failed to update branch manager');
    } finally {
      setIsUpdatingManager(false);
    }
  };

  const handleCreateCategory = async (name) => {
    try {
      const { data } = await api.post('/expense-categories', { name });
      setClassificationPool((prev) => [
        ...prev,
        {
          value: data.name,
          label: data.name.charAt(0).toUpperCase() + data.name.slice(1),
          deletable: true,
          id: data._id,
        },
      ]);
      setExpenseData((prev) => ({ ...prev, category: data.name }));
      toast.success(`Category "${name}" added to the pool`);
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add category';
      toast.error(message);
    }
  };

  const handleDeleteCategory = async (value) => {
    try {
      const categoryToDelete = classificationPool.find(
        (cat) => cat.value === value,
      );
      if (!categoryToDelete || !categoryToDelete.id) return;

      await api.delete(`/expense-categories/${categoryToDelete.id}`);
      setClassificationPool((prev) =>
        prev.filter((cat) => cat.value !== value),
      );

      if (expenseData.category === value) {
        setExpenseData((prev) => ({ ...prev, category: 'other' }));
      }

      toast.success('Category removed from the pool');
    } catch (error) {
      toast.error('Failed to remove category');
    }
  };

  // No full-page SplashScreen to ensure instant transitions
  // if (loading) {
  //   return <SplashScreen />;
  // }

  if (loading && !branch) {
    return <ProfilePageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-12">
      <PageHeader
        title={loading ? 'Loading Branch...' : branch?.name || 'Unknown Branch'}
        description={`Branch ID: ${id.slice(-6).toUpperCase()}`}
        onBack={() => navigate('/branches')}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${
              loading
                ? 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 border-slate-100 dark:border-white/[0.06]'
                : branch?.isActive
                  ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20'
                  : 'bg-red-500/5 text-red-500 border-red-500/20'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                loading
                  ? 'bg-muted-foreground/30'
                  : branch?.isActive
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-red-500'
              }`}
            />
            {loading
              ? 'Fetching...'
              : branch?.isActive
                ? 'Operational'
                : 'Closed'}
          </span>
        </div>
      </PageHeader>

      {/* Financial Intelligence Cards */}
      {fetchingFinancials && summary.liquidity === null ? (
        <CardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          <StatsCard
            title="Net Liquidity"
            amount={formatCurrency(summary.liquidity || 0)}
            subtitle="Available Cash"
            icon={<Coins size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
          />
          <StatsCard
            title="Total Deposits"
            amount={formatCurrency(summary.totalDeposits || 0)}
            subtitle="Member Capital"
            icon={<Download size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
          <StatsCard
            title="Net Profit"
            amount={formatCurrency(summary.netProfit || 0)}
            subtitle="Interest Earnings"
            icon={<TrendingUp size={20} />}
            color="bg-primary shadow-primary/20"
          />
          <StatsCard
            title="Total Disbursed"
            amount={formatCurrency(summary.totalDisbursed || 0)}
            subtitle="Portfolio Value"
            icon={<ExternalLink size={20} />}
            color="bg-orange-500 shadow-orange-500/20"
          />
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex flex-col lg:flex-row gap-4 mt-4 sm:mt-8">
        <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 lg:w-60 no-scrollbar scrollbar-none snap-x mask-fade-right lg:mask-none">
          {[
            { id: 'overview', label: 'Overview', icon: <Info size={16} /> },
            {
              id: 'expenses',
              label: 'Operations & Expenses',
              icon: <Receipt size={16} />,
            },
            {
              id: 'ledger',
              label: 'Transaction Ledger',
              icon: <History size={16} />,
            },
            {
              id: 'settings',
              label: 'Branch Settings',
              icon: <Settings2 size={16} />,
              adminOnly: true,
            },
          ]
            .filter((tab) => !tab.adminOnly || !user.isManager)
            .map((tab) => (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-none lg:w-full flex items-center gap-3 sm:gap-4 px-5 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-[1.5rem] text-xs sm:text-sm font-bold transition-all duration-500 snap-start whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02] hover:bg-primary hover:text-white'
                    : 'bg-white dark:bg-white/[0.02] text-slate-500 hover:bg-slate-50/40 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-white border border-transparent hover:border-slate-100 dark:hover:border-white/[0.06]'
                }`}
              >
                {tab.icon}
                {tab.label}
              </Button>
            ))}
        </div>

        <div className="flex-1 lg:pl-4">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6 sm:space-y-8"
              >
                {/* Analytics Chart Section */}
                <div className="w-full">
                  {chartLoading ? (
                    <ChartSkeleton />
                  ) : (
                    <AnalyticsChart
                      data={analyticsData}
                      dateRange={dateRange}
                      setDateRange={setDateRange}
                      onDownload={handleDownload}
                      loading={chartLoading}
                      isDownloading={isDownloading}
                    />
                  )}
                </div>
                <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-white/[0.02]">
                  <div className="h-48 relative overflow-hidden">
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        background: loading
                          ? 'var(--muted)'
                          : `linear-gradient(135deg, ${branch?.branding?.primaryColor || 'var(--primary)'} 0%, ${branch?.branding?.secondaryColor || 'var(--primary-foreground)'} 100%)`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {branch?.branding?.logoUrl ? (
                        <img
                          src={branch.branding.logoUrl}
                          alt="Logo"
                          className="h-24 object-contain"
                        />
                      ) : (
                        <Store
                          size={80}
                          className={`${loading ? 'text-muted-foreground/10' : 'text-primary opacity-20'}`}
                        />
                      )}
                    </div>
                  </div>
                  <CardContent className="p-10 space-y-8">
                    <div className="grid md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                            Branch Identity
                          </Label>
                          <h3 className="text-3xl font-black tracking-tight">
                            {loading ? (
                              <div className="h-9 w-48 bg-muted animate-pulse rounded-lg" />
                            ) : (
                              branch?.name
                            )}
                          </h3>
                          <div className="text-muted-foreground font-medium">
                            {loading ? (
                              <div className="h-5 w-32 bg-muted animate-pulse rounded-lg mt-2" />
                            ) : (
                              branch?.branding?.companyName ||
                              'Corporate Location'
                            )}
                          </div>
                        </div>
                        <div className="space-y-4 pt-4">
                          <div className="flex items-start gap-4 p-5 rounded-2xl bg-muted/30 border border-border/20">
                            <MapPin className="text-primary mt-1" size={20} />
                            <div>
                              <span className="text-sm font-black block mb-1">
                                Permanent Address
                              </span>
                              <div className="text-sm text-muted-foreground font-medium">
                                {loading ? (
                                  <div className="h-4 w-full bg-muted animate-pulse rounded-lg mt-1" />
                                ) : (
                                  branch?.address
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 p-5 rounded-2xl bg-muted/30 border border-border/20">
                            <Phone className="text-primary" size={20} />
                            <div>
                              <span className="text-sm font-black block mb-1">
                                Direct Contact
                              </span>
                              <div className="text-sm text-muted-foreground font-medium">
                                {loading ? (
                                  <div className="h-4 w-32 bg-muted animate-pulse rounded-lg mt-1" />
                                ) : (
                                  branch?.contactNumber
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-primary/[0.03] border border-primary/10 rounded-[2.5rem] p-8 flex flex-col justify-center text-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary">
                          <TrendingUp size={40} />
                        </div>
                        <h4 className="text-xl font-black mb-2">
                          Operational Analytics
                        </h4>
                        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                          This branch contributes to 12% of the total ecosystem
                          volume. Regular auditing recommended every 30 days.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-end">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DateRangePicker
                      date={expenseDateRange}
                      setDate={(range) => {
                        setExpenseDateRange(range);
                        setExpensePagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="w-full sm:w-auto"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      isLoading={isDownloadingExpenses}
                      className="relative rounded-full group overflow-hidden border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] h-11 w-11 shrink-0 transition-all duration-300 hover:border-primary/50"
                      onClick={handleExpenseDownload}
                      title="Download Expense Statement (PDF)"
                    >
                      <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 bg-white dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full">
                    <TableSearch
                      value={expenseSearch}
                      onChange={(val) => {
                        setExpenseSearch(val);
                        setExpensePagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      placeholder="Search expenses..."
                      className="w-full sm:w-auto sm:min-w-[300px]"
                    />
                    <div className="w-full sm:w-48">
                      <Select
                        value={expenseCategory}
                        onValueChange={(val) => {
                          setExpenseCategory(val);
                          setExpensePagination((prev) => ({
                            ...prev,
                            page: 1,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-none px-4 focus:ring-0 font-bold text-xs uppercase tracking-widest">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 dark:border-white/[0.06]">
                          <SelectItem
                            value="all"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest"
                          >
                            All Categories
                          </SelectItem>
                          {classificationPool.map((cat) => (
                            <SelectItem
                              key={cat.value}
                              value={cat.value}
                              className="rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="rounded-full shadow-2xl shadow-primary/30 font-black uppercase tracking-widest text-[10px] h-12 px-8 w-full md:w-auto shrink-0"
                  >
                    <Plus size={18} className="mr-2" /> Log Expense
                  </Button>
                </div>

                <div className="space-y-4">
                  {fetchingFinancials && !isFetchingMore ? (
                    <TableSkeleton />
                  ) : expenses.length === 0 ? (
                    <div className="py-24 text-center bg-slate-50/40 dark:bg-white/[0.02] rounded-[2rem] border border-dashed border-slate-200 dark:border-white/[0.08]">
                      <Receipt
                        size={64}
                        className="mx-auto text-muted-foreground/20 mb-6"
                      />
                      <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-widest">
                        No recorded disbursements
                      </p>
                    </div>
                  ) : isMobile ? (
                    <div className="space-y-4">
                      {expenses.map((expense) => (
                        <TransactionCard
                          key={expense._id}
                          transaction={expense}
                        />
                      ))}
                      {/* Infinite Scroll Trigger */}
                      {expensePagination.page <
                        expensePagination.totalPages && (
                        <div ref={expenseObserverTarget}>
                          <InfiniteLoader isFetchingMore={isFetchingMore} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <TransactionTable
                      data={expenses}
                      sortBy={expenseSortBy}
                      sortOrder={expenseSortOrder}
                      onSort={(column) => {
                        const newOrder =
                          expenseSortBy === column &&
                          expenseSortOrder === 'asc'
                            ? 'desc'
                            : 'asc';
                        setExpenseSortBy(column);
                        setExpenseSortOrder(newOrder);
                        setExpensePagination((prev) => ({
                          ...prev,
                          page: 1,
                        }));
                      }}
                      pagination={{
                        currentPage: expensePagination.page,
                        totalPages: expensePagination.totalPages,
                        totalEntries: expensePagination.totalEntries,
                        limit: expensePagination.limit,
                        onPageChange: (page) => {
                          setExpensePagination((prev) => ({ ...prev, page }));
                        },
                        onLimitChange: (limit) =>
                          setExpensePagination((prev) => ({
                            ...prev,
                            limit,
                            page: 1,
                          })),
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'ledger' && (
              <motion.div
                key="ledger"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-end">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <DateRangePicker
                      date={ledgerDateRange}
                      setDate={(range) => {
                        setLedgerDateRange(range);
                        setLedgerPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      className="w-full sm:w-auto"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      isLoading={isDownloadingLedger}
                      className="relative rounded-full group overflow-hidden border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] h-11 w-11 shrink-0 transition-all duration-300 hover:border-primary/50"
                      onClick={handleLedgerDownload}
                      title="Download Ledger Statement (PDF)"
                    >
                      <Download className="relative w-4 h-4 text-primary group-hover:scale-125 transition-transform duration-500" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 bg-white dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <TableSearch
                      value={ledgerSearch}
                      onChange={(val) => {
                        setLedgerSearch(val);
                        setLedgerPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      placeholder="Search ledger..."
                      className="w-full sm:w-auto sm:min-w-[300px]"
                    />
                    <div className="w-full sm:w-48">
                      <Select
                        value={ledgerCategory}
                        onValueChange={(val) => {
                          setLedgerCategory(val);
                          setLedgerPagination((prev) => ({
                            ...prev,
                            page: 1,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-2xl bg-muted/50 border-none px-4 focus:ring-0 font-bold text-xs uppercase tracking-widest">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-100 dark:border-white/[0.06]">
                          <SelectItem
                            value="all"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest"
                          >
                            All Categories
                          </SelectItem>
                          <SelectItem
                            value="repayment"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-emerald-600"
                          >
                            Repayments
                          </SelectItem>
                          <SelectItem
                            value="investment"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-blue-600"
                          >
                            Investments
                          </SelectItem>
                          <SelectItem
                            value="withdrawal"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-orange-600"
                          >
                            Withdrawals
                          </SelectItem>
                          <SelectItem
                            value="loan_disbursement"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-primary"
                          >
                            Disbursements
                          </SelectItem>
                          <SelectItem
                            value="expense"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-red-600"
                          >
                            Expenses
                          </SelectItem>
                          <SelectItem
                            value="profit_distribution"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-purple-600"
                          >
                            Profits
                          </SelectItem>
                          <SelectItem
                            value="fee"
                            className="rounded-xl text-xs font-bold uppercase tracking-widest text-amber-600"
                          >
                            Fees
                          </SelectItem>
                          <div className="h-px bg-border/20 my-2" />
                          <div className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Expense Categories
                          </div>
                          {classificationPool.map((cat) => (
                            <SelectItem
                              key={cat.value}
                              value={cat.value}
                              className="rounded-xl text-xs font-bold uppercase tracking-widest"
                            >
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {fetchingFinancials && !isFetchingMore ? (
                    <TableSkeleton />
                  ) : ledger.length === 0 ? (
                    <div className="py-24 text-center bg-slate-50/40 dark:bg-white/[0.02] rounded-[2rem] border border-dashed border-slate-200 dark:border-white/[0.08]">
                      <History
                        size={64}
                        className="mx-auto text-muted-foreground/20 mb-6"
                      />
                      <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-widest">
                        Zero historical entries
                      </p>
                    </div>
                  ) : isMobile ? (
                    <div className="space-y-4">
                      {ledger.map((transaction) => (
                        <TransactionCard
                          key={transaction._id}
                          transaction={transaction}
                          hideType={true}
                        />
                      ))}
                      {/* Infinite Scroll Trigger */}
                      {ledgerPagination.page < ledgerPagination.totalPages && (
                        <div ref={ledgerObserverTarget}>
                          <InfiniteLoader isFetchingMore={isFetchingMore} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <TransactionTable
                      data={ledger}
                      sortBy={ledgerSortBy}
                      sortOrder={ledgerSortOrder}
                      hideType={true}
                      onSort={(column) => {
                        const newOrder =
                          ledgerSortBy === column && ledgerSortOrder === 'asc'
                            ? 'desc'
                            : 'asc';
                        setLedgerSortBy(column);
                        setLedgerSortOrder(newOrder);
                        setLedgerPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                      pagination={{
                        currentPage: ledgerPagination.page,
                        totalPages: ledgerPagination.totalPages,
                        totalEntries: ledgerPagination.totalEntries,
                        limit: ledgerPagination.limit,
                        onPageChange: (page) => {
                          setLedgerPagination((prev) => ({ ...prev, page }));
                        },
                        onLimitChange: (limit) =>
                          setLedgerPagination((prev) => ({
                            ...prev,
                            limit,
                            page: 1,
                          })),
                      }}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="px-4">
                  <h3 className="text-2xl font-black tracking-tight">
                    System Controls
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium">
                    Manage branch lifecycle and visibility.
                  </p>
                </div>

                <div className="p-6 sm:p-10 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <span className="text-xl font-black block tracking-tight">
                        Branch Availability
                      </span>
                      <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">
                        {branch.isActive
                          ? 'The branch is currently open for operations. Deactivating will pause all transactions and visibility.'
                          : 'This branch is closed. Activating will resume operational capabilities and customer service.'}
                      </p>
                    </div>
                    <Button
                      variant={branch.isActive ? 'destructive' : 'default'}
                      onClick={toggleStatus}
                      isLoading={isTogglingStatus}
                      className="rounded-full px-10 h-14 font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95"
                    >
                      {branch.isActive ? (
                        <>
                          <PowerOff size={18} className="mr-3" /> Deactivate
                          Branch
                        </>
                      ) : (
                        <>
                          <Power size={18} className="mr-3" /> Activate Branch
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="pt-10 border-t border-border/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <UserCog size={24} className="text-primary" />
                          <span className="text-xl font-black block tracking-tight leading-none">
                            Branch Manager
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium max-w-sm leading-relaxed">
                          Assign a specific staff member to oversee this
                          branch's daily activities.
                        </p>
                      </div>

                      <div className="w-full sm:w-72 space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                          Select Designated Manager
                        </Label>
                        <Select
                          disabled={isUpdatingManager}
                          value={branch.manager?._id || 'none'}
                          onValueChange={(val) =>
                            handleUpdateManager(val === 'none' ? null : val)
                          }
                        >
                          <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40 font-bold text-sm">
                            <SelectValue
                              className="capitalize"
                              placeholder="Select Manager"
                            />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl text-start justify-start items-start border-border/40">
                            <SelectItem value="none" className="rounded-xl">
                              No Manager Assigned
                            </SelectItem>
                            {staff.map((member) => (
                              <SelectItem
                                key={member._id}
                                value={member._id}
                                className="rounded-xl"
                              >
                                <div className="flex flex-col py-1 text-start justify-start items-start">
                                  <span className="font-bold text-sm capitalize">
                                    {member.name}
                                  </span>
                                  <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-black">
                                    {member.email}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="pt-10 border-t border-border/20 flex items-center justify-between opacity-50 cursor-not-allowed">
                    <div className="space-y-2">
                      <span className="text-xl font-black block tracking-tight">
                        Branding & Profiles
                      </span>
                      <p className="text-sm text-muted-foreground font-medium">
                        This feature is managed by the Corporate Headquarters.
                      </p>
                    </div>
                    <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center">
                      <Palette size={24} className="text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Record Expense Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="sm:max-w-[480px] w-[95vw] rounded-[1.5rem] sm:rounded-[2.5rem] !p-0 border-none shadow-2xl z-[610] overflow-hidden flex flex-col gap-0 bg-card border border-border/20">
          <div className="bg-gradient-to-br from-red-600 to-rose-700 p-6 sm:p-10 text-white relative shrink-0">
            <div className="absolute top-0 right-0 p-6 sm:p-10 opacity-10">
              <Receipt size={64} className="sm:w-20 sm:h-20" />
            </div>
            <DialogHeader className="relative z-10 text-left items-start">
              <DialogTitle className="text-2xl sm:text-4xl font-black tracking-tighter leading-none mb-2">
                Record Outflow
              </DialogTitle>
              <DialogDescription className="text-white/70 font-bold tracking-wide text-[10px] sm:text-xs">
                Operational Disbursement Authorization
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar">
            <div className="p-6 sm:p-10 space-y-8 sm:space-y-10">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Capital Amount (PKR)
                </Label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-muted-foreground/30 group-focus-within:text-red-500 transition-colors text-lg">
                    PKR
                  </span>
                  <Input
                    type="number"
                    value={expenseData.amount}
                    onChange={(e) =>
                      setExpenseData({ ...expenseData, amount: e.target.value })
                    }
                    placeholder="0.00"
                    className="pl-20 h-16 sm:h-20 rounded-2xl border-border/40 focus-visible:ring-red-500/20 focus-visible:border-red-500 bg-muted/30 font-black text-2xl sm:text-4xl tracking-tighter transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Payment Channel
                </Label>
                <div className="flex gap-3 p-1.5 bg-muted/30 rounded-2xl border border-border/20">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setExpenseData({ ...expenseData, paymentMethod: 'cash' })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                      expenseData.paymentMethod === 'cash'
                        ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-[1.02] hover:bg-emerald-500 hover:text-white'
                        : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <HandCoins size={14} />
                    Cash
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      setExpenseData({
                        ...expenseData,
                        paymentMethod: 'online',
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-2 h-12 sm:h-14 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${
                      expenseData.paymentMethod === 'online'
                        ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/20 scale-[1.02]'
                        : 'text-muted-foreground/60 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Globe size={14} />
                    Online
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Classification Pool
                </Label>
                <div className="w-full relative">
                  <SearchableCombobox
                    options={classificationPool}
                    value={expenseData.category}
                    onChange={(val) => {
                      if (
                        !classificationPool.some((opt) => opt.value === val)
                      ) {
                        handleCreateCategory(val);
                      } else {
                        setExpenseData({ ...expenseData, category: val });
                      }
                    }}
                    onDelete={handleDeleteCategory}
                    placeholder="Select Classification Pool..."
                    searchPlaceholder="Search expense categories..."
                    allowCustom={true}
                    disabled={isFetchingCategories}
                    className="h-16 rounded-2xl bg-muted/30 border-border/40 font-bold text-sm"
                  />
                </div>
              </div>

              {expenseData.category === 'salary' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-500">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                    Select Staff Member
                  </Label>
                  <Select
                    value={expenseData.staffId}
                    onValueChange={(val) =>
                      setExpenseData({ ...expenseData, staffId: val })
                    }
                  >
                    <SelectTrigger className="h-14 rounded-2xl bg-muted/20 border-border/40 font-bold text-sm">
                      <SelectValue
                        placeholder="Select Staff Member"
                        className="capitalize"
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 text-left">
                      {staff.map((member) => (
                        <SelectItem
                          key={member._id}
                          value={member._id}
                          className="rounded-xl"
                        >
                          <div className="flex flex-col py-1 text-left">
                            <span className="font-bold text-sm capitalize">
                              {member.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground tracking-widest font-black">
                              {member.email}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
                  Operational Context
                </Label>
                <Input
                  value={expenseData.description}
                  onChange={(e) =>
                    setExpenseData({
                      ...expenseData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief justification for audit..."
                  className="h-14 sm:h-16 rounded-2xl border-border/40 bg-muted/40 font-bold text-sm sm:text-base tracking-tight px-6"
                />
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-10 pb-6 sm:pb-8 shrink-0 mt-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => setIsExpenseModalOpen(false)}
                className="flex-1 rounded-xl h-12 font-black uppercase text-[10px] tracking-widest border-border/40 hover:bg-muted/50 order-2 sm:order-1 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddExpense}
                isLoading={isAddingExpense}
                className="flex-[1.5] rounded-xl h-12 font-black uppercase tracking-[0.2em] text-[10px] bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20 transform transition-all active:scale-95 order-1 sm:order-2"
              >
                Authorize
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchDetail;
