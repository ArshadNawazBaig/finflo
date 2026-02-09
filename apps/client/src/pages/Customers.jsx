import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CustomerTable from '@/components/CustomerTable';
import CustomerCard from '@/components/CustomerCard';
import PageHeader from '@/components/PageHeader';
import AddCustomerModal from '@/components/AddCustomerModal';
import EditCustomerModal from '@/components/EditCustomerModal';
import TableSkeleton from '@/components/TableSkeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mobile & Infinite Scroll State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchCustomers = useCallback(
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : currentPage;
        const { data } = await api.get(
          `/customers?page=${pageToFetch}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
        );

        if (isAppend) {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => c._id));
            const newCustomers = (data.data || []).filter(
              (c) => !existingIds.has(c._id),
            );
            return [...prev, ...newCustomers];
          });
          setCurrentPage(pageToFetch);
        } else {
          setCustomers(data.data || []);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
      } catch (error) {
        console.error('Failed to fetch customers', error);
        toast.error('Failed to load customers');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchTerm, sortBy, sortOrder],
  );

  // Handle Sort Change
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  // Initial Fetch & Search Debounce (Resets to page 1)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchCustomers(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy, sortOrder, limit]);

  // Handle Page Change (Mostly for Desktop Pagination)
  useEffect(() => {
    if (!isMobile) {
      fetchCustomers(false);
    }
  }, [currentPage, isMobile]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
          // When scrolling, we load 3 items at a time as requested
          // Note: The API usually works with pages/limits.
          // To strictly load 3, we adjust the limit just for this next fetch
          // But for consistency with the existing paginated API, we'll fetch the next "page"
          // which has 'limit' items. If the user strictly wants 3, we'd need to change limit=3.
          // Let's set limit to 3 for mobile batching.
          fetchCustomers(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchCustomers]);

  // Adjust limit based on mobile/desktop
  useEffect(() => {
    if (isMobile) {
      setLimit(3); // Initial load size for mobile (as requested: 3 items add)
    } else {
      setLimit(10); // Desktop default
    }
  }, [isMobile]);

  const handleDeleteClick = async (customer) => {
    try {
      const { data: response } = await api.get(
        `/loans?customerId=${customer._id}&limit=1`,
      );
      const hasLoans = response.totalEntries > 0;

      if (hasLoans) {
        toast.error(
          `Cannot delete ${customer.name}. They have active loan(s).`,
        );
        return;
      }
      setDeleteCustomer(customer);
    } catch (error) {
      toast.error('Failed to check customer loans');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomer) return;
    try {
      await api.delete(`/customers/${deleteCustomer._id}`);
      toast.success('Customer deleted successfully');
      setCustomers((prev) => prev.filter((c) => c._id !== deleteCustomer._id));
      setDeleteCustomer(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-6">
      <PageHeader
        title="Customers"
        description="Manage your client base and view their loan history."
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="gradient"
          className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
        >
          <Plus size={16} strokeWidth={3} />
          Add Customer
        </Button>
      </PageHeader>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10 pointer-events-none" />
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="mt-4">
        {loading ? (
          <div className={`${isMobile ? 'space-y-4' : ''}`}>
            <TableSkeleton />
          </div>
        ) : (
          <>
            {isMobile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {customers.map((customer) => (
                    <CustomerCard
                      key={customer._id}
                      customer={customer}
                      onEdit={setEditCustomer}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                {currentPage < totalPages && (
                  <div ref={observerTarget}>
                    <InfiniteLoader isFetchingMore={isFetchingMore} />
                  </div>
                )}

                {customers.length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    No customers found.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <CustomerTable
                  data={customers}
                  pagination={{
                    currentPage,
                    totalPages,
                    totalEntries,
                    limit,
                    onPageChange: setCurrentPage,
                    onLimitChange: (newLimit) => {
                      setLimit(newLimit);
                      setCurrentPage(1);
                    },
                  }}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onEdit={(customer) => setEditCustomer(customer)}
                  onDelete={handleDeleteClick}
                />
              </div>
            )}
          </>
        )}
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchCustomers(false)}
      />

      <EditCustomerModal
        isOpen={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        customer={editCustomer}
        onSuccess={() => fetchCustomers(false)}
      />

      <AlertDialog
        open={!!deleteCustomer}
        onOpenChange={() => setDeleteCustomer(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{' '}
              <strong>{deleteCustomer?.name}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-gradient-to-r from-red-500 to-destructive text-white shadow-xl shadow-red-500/20 hover:brightness-110 hover:shadow-2xl hover:shadow-red-500/30"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;
