import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import TableSearch from '@/components/ui/TableSearch';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import CustomerTable from '@/components/customers/CustomerTable';
import CustomerCard from '@/components/customers/CustomerCard';
import PageHeader from '@/components/PageHeader';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import TableSkeleton from '@/components/skeletons/TableSkeleton';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import ConvertToMemberModal from '@/components/customers/ConvertToMemberModal';
import EmptyState from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useIsMobile';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [convertCustomer, setConvertCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Mobile & Infinite Scroll State
  const isMobile = useIsMobile();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const observerTarget = useRef(null);

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
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
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
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${deleteCustomer._id}`);
      toast.success('Customer deleted successfully');
      setCustomers((prev) => prev.filter((c) => c._id !== deleteCustomer._id));
      setDeleteCustomer(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-6">
      <PageHeader
        title="Customer Registry"
        description="Registry of all onboarded individuals and corporate entities."
      >
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="gradient"
          className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2.5 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
          data-onboarding-id="add-customer-button"
        >
          <Plus size={16} strokeWidth={3} />
          Add Customer
        </Button>
      </PageHeader>

      {/* Stats Grid - Moved from Dashboard */}

      <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <TableSearch
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search customers..."
        />
      </div>

      <div className="mt-4">
        {loading ? (
          isMobile ? (
            <div className="py-12 flex justify-center">
              <InfiniteLoader isFetchingMore={true} />
            </div>
          ) : (
            <TableSkeleton rows={8} columns={6} />
          )
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
                      onConvert={setConvertCustomer}
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
                  <EmptyState
                    icon={Users}
                    title="No Customers Found"
                    description={
                      searchTerm
                        ? "We couldn't find any customers matching your search."
                        : 'Your customer list is currently empty. Start by adding your first client.'
                    }
                    className="border-none bg-card/50"
                  />
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
                  onConvert={(customer) => setConvertCustomer(customer)}
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

      <ConvertToMemberModal
        isOpen={!!convertCustomer}
        onClose={() => setConvertCustomer(null)}
        customer={convertCustomer}
        onSuccess={() => fetchCustomers(false)}
      />

      <ConfirmActionModal
        isOpen={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
        onConfirm={handleDeleteConfirm}
        loading={isDeleting}
        title="Delete Customer"
        description={
          <>
            Are you sure you want to delete{' '}
            <strong>{deleteCustomer?.name}</strong>? This action cannot be
            undone.
          </>
        }
        confirmText="Permanently Delete"
        variant="danger"
      />
    </div>
  );
};

export default Customers;
