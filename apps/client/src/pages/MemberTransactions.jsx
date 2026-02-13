import { useState, useEffect, useCallback, useRef } from 'react';
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  Target,
  FileText,
  Calendar,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/CardsSkeleton';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import EmptyState from '@/components/ui/EmptyState';
import { exportLoanStatement } from '@/lib/pdfExportUtils';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MemberTransactions = () => {
  const [activity, setActivity] = useState([]);
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  // Pagination & Mobile State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalEntries, setTotalEntries] = useState(0);
  const [limit, setLimit] = useState(5);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const observerTarget = useRef(null);

  const fetchActivity = useCallback(
    async (isAppend = false) => {
      try {
        if (!isAppend) {
          setLoading(true);
          setCurrentPage(1);
        } else {
          setIsFetchingMore(true);
        }

        const memberToken = localStorage.getItem('memberToken');
        const pageToFetch = isAppend ? currentPage + 1 : 1;

        const [activityRes, memberRes] = await Promise.all([
          api.get(
            `/members/portal/activity?page=${pageToFetch}&limit=${limit}&category=${filter === 'all' ? '' : filter}&search=${search}`,
            {
              headers: { Authorization: `Bearer ${memberToken}` },
            },
          ),
          api.get('/member-auth/me', {
            headers: { Authorization: `Bearer ${memberToken}` },
          }),
        ]);

        const newActivity = activityRes.data.data || [];

        if (isAppend) {
          setActivity((prev) => {
            const existingIds = new Set(prev.map((a) => a._id));
            const filtered = newActivity.filter((a) => !existingIds.has(a._id));
            return [...prev, ...filtered];
          });
          setCurrentPage(pageToFetch);
        } else {
          setActivity(newActivity);
        }

        setMember(memberRes.data);
        setTotalPages(activityRes.data.totalPages || 0);
        setTotalEntries(activityRes.data.totalEntries || 0);
      } catch (error) {
        console.error('Failed to fetch activity:', error);
        toast.error('Failed to load transaction history');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, filter, search, limit],
  );

  useEffect(() => {
    fetchActivity();
  }, [filter, search, limit]);

  useEffect(() => {
    if (!isMobile || !observerTarget.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          fetchActivity(true);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchActivity]);

  const handleExportPDF = () => {
    if (!activity.length) return toast.error('No transactions to export');

    const doc = new jsPDF();
    const tableColumn = ['Date', 'Description', 'Category', 'Amount', 'Type'];
    const tableRows = [];

    activity.forEach((item) => {
      const rowData = [
        new Date(item.date).toLocaleDateString(),
        item.description,
        item.category.toUpperCase(),
        formatPKR(item.amount),
        item.type.toUpperCase(),
      ];
      tableRows.push(rowData);
    });

    // Header styling
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Primary Emerald color
    doc.text('ACE WEALTH PORTAL', 14, 22);

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Financial Activity Statement', 14, 30);
    doc.text(`Account Holder: ${member?.name || 'Valued Member'}`, 14, 38);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 44);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 55,
      theme: 'grid',
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { halign: 'right' },
      },
    });

    doc.save(`Activity_Statement_${new Date().getTime()}.pdf`);
    toast.success('Statement downloaded successfully');
  };

  // Filtering and searching are now handled on the backend
  const displayActivity = activity;

  const getIcon = (category, type) => {
    if (category === 'profit')
      return <PieChart className="text-emerald-500" size={18} />;
    if (category === 'goal')
      return <Target className="text-primary" size={18} />;
    if (category === 'repayment')
      return <FileText className="text-red-500" size={18} />;

    return type === 'deposit' ? (
      <ArrowUpRight className="text-emerald-500" size={18} />
    ) : (
      <ArrowDownLeft className="text-red-500" size={18} />
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title={
          <>
            Activity <span className="text-primary ">Ledger</span>
          </>
        }
        description="Every movement of your funds, recorded with absolute transparency."
      />

      <div className="bg-card rounded-[2.5rem] border border-border/50 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-10 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative flex-1 max-w-md">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                placeholder="Search transactions..."
                className="pl-12 rounded-2xl h-12 bg-background border-none shadow-sm focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              {['all', 'investment', 'profit', 'repayment', 'goal'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    filter === f
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {f}
                </button>
              ))}
              <div className="h-6 w-[1px] bg-border/50 mx-1 hidden md:block" />
              <Button
                onClick={handleExportPDF}
                variant="outline"
                size="sm"
                className="rounded-full gap-2 text-[10px] font-black uppercase tracking-widest px-4 h-9 border-primary/20 hover:bg-primary/5 text-primary whitespace-nowrap"
              >
                <Download size={14} />
                Export PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {loading ? (
            <div className="p-10 text-center">
              <CardsSkeleton />
            </div>
          ) : displayActivity.length === 0 ? (
            <div className="p-20">
              <EmptyState
                icon={History}
                title="No Transactions Found"
                description="Your transaction ledger is currently empty or matches no filters."
              />
            </div>
          ) : (
            displayActivity.map((item) => (
              <div
                key={item._id}
                className="p-6 sm:p-8 hover:bg-muted/30 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-5">
                  <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform">
                    {getIcon(item.category, item.type)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg tracking-tight capitalize">
                      {item.description}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">
                        {item.category}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        <Calendar size={10} />
                        {new Date(item.date).toLocaleDateString(undefined, {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`text-xl font-black tracking-tighter ${item.type === 'deposit' ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {item.type === 'deposit' ? '+' : '-'}
                      {formatPKR(item.amount)}
                    </p>
                    {item.metadata?.balanceAfter && (
                      <p className="text-[10px] font-bold text-muted-foreground/60 mt-0.5">
                        Bal: {formatPKR(item.metadata.balanceAfter)}
                      </p>
                    )}
                  </div>
                  {(item.category === 'repayment' ||
                    item.category === 'goal') && (
                    <Tooltip content="Export Statement">
                      <button
                        onClick={() => {
                          exportLoanStatement(
                            {
                              ...item,
                              principal: item.amount,
                              totalAmount: item.amount,
                              status: 'confirmed',
                              customer: member,
                            },
                            [],
                            member,
                          );
                        }}
                        className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 opacity-0 group-hover:opacity-100"
                      >
                        <Download size={16} />
                      </button>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {!loading && displayActivity.length > 0 && (
          <div className="p-4 border-t border-border/40">
            {isMobile ? (
              currentPage < totalPages && (
                <div ref={observerTarget}>
                  <InfiniteLoader isFetchingMore={isFetchingMore} />
                </div>
              )
            ) : (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalEntries={totalEntries}
                limit={limit}
                onPageChange={(p) => {
                  setCurrentPage(p);
                  const memberToken = localStorage.getItem('memberToken');
                  api
                    .get(
                      `/members/portal/activity?page=${p}&limit=${limit}&category=${filter === 'all' ? '' : filter}&search=${search}`,
                      {
                        headers: { Authorization: `Bearer ${memberToken}` },
                      },
                    )
                    .then(({ data: response }) => {
                      setActivity(response.data || []);
                      setCurrentPage(p);
                    });
                }}
                onLimitChange={(l) => {
                  setLimit(l);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberTransactions;
