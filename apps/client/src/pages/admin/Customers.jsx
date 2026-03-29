import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Loader2, Users, Store, Download } from 'lucide-react';
import TableSearch from '@/components/ui/TableSearch';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import CustomerTable from '@/components/customers/CustomerTable';
import CustomerCard from '@/components/customers/CustomerCard';
import PageHeader from '@/components/PageHeader';
import AddCustomerModal from '@/components/customers/AddCustomerModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import { RegistryPageSkeleton } from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';
import { MOBILE_PAGE_LIMIT, DESKTOP_PAGE_LIMIT } from '@/lib/constants';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import InfiniteLoader from '@/components/InfiniteLoader';
import ConvertToMemberModal from '@/components/customers/ConvertToMemberModal';
import EmptyState from '@/components/ui/EmptyState';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [convertCustomer, setConvertCustomer] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DESKTOP_PAGE_LIMIT);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('all');

  // Mobile & Infinite Scroll State
  const isMobile = useIsMobile();
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const observerTarget = useRef(null);

  const fetchBranches = async () => {
    try {
      const { data } = await api.get('/branches');
      setBranches(data || []);
    } catch (error) {
      console.error('Failed to fetch branches', error);
    }
  };

  const fetchCustomers = useCallback(
    async (isAppend = false, pageNum = currentPage) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : pageNum;
        const branchParam = selectedBranch !== 'all' ? `&branchId=${selectedBranch}` : '';
        const { data } = await api.get(
          `/customers?page=${pageToFetch}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}${branchParam}`,
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
          setCurrentPage(pageNum);
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
    [currentPage, limit, searchTerm, sortBy, sortOrder, selectedBranch],
  );

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers(false, 1);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, sortBy, sortOrder, limit, selectedBranch, fetchCustomers]);

  useEffect(() => {
    if (!isMobile) {
      fetchCustomers(false, currentPage);
    }
  }, [currentPage, isMobile]);

  useEffect(() => {
    if (!isMobile) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !isFetchingMore &&
          currentPage < totalPages
        ) {
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

  useEffect(() => {
    setLimit(isMobile ? MOBILE_PAGE_LIMIT : DESKTOP_PAGE_LIMIT);
    setCurrentPage(1);
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

  const handleDownloadData = () => {
    // Basic CSV implementation
    const headers = ['Name', 'Email', 'Phone', 'Onboarded', 'Status'];
    const rows = customers.map(c => [
      c.name,
      c.email,
      c.phone,
      new Date(c.createdAt).toLocaleDateString(),
      c.isMember ? 'Member' : 'Prospect'
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "customers_registry.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && customers.length === 0) {
    return <RegistryPageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Customer Registry"
        description="Registry of all onboarded individuals and corporate entities."
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
            isLoading={loading && customers.length === 0}
          >
            <Plus size={16} />
            Add Customer
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card/10 p-6 rounded-[2rem] border border-border/40 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
          <TableSearch
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            placeholder="Search customers..."
            className="w-full sm:w-auto sm:min-w-[300px]"
          />
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:w-48">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-primary/10 px-4 focus:ring-0 backdrop-blur-xl">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-primary/60" />
                    <SelectValue placeholder="All Branches" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/50 bg-white/95 backdrop-blur-md">
                  <SelectItem value="all" className="rounded-xl">
                    All Branches
                  </SelectItem>
                  {branches.map((branch) => (
                    <SelectItem
                      key={branch._id}
                      value={branch._id}
                      className="rounded-xl"
                    >
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-[1.25rem] group overflow-hidden border-primary/10 bg-white/5 backdrop-blur-xl h-12 shrink-0 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.15)]"
              onClick={() => fetchCustomers(false)}
              isLoading={loading}
              title="Refresh Data"
            >
              <RefreshCw
                className={cn(
                  'relative w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-700'
                )}
              />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="relative rounded-[1.25rem] group overflow-hidden border-primary/10 bg-white/5 backdrop-blur-xl h-12 shrink-0 transition-all duration-500 hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              onClick={handleDownloadData}
              title="Download Data"
            >
              <Download className="relative w-4 h-4 text-emerald-500 group-hover:scale-125 transition-transform duration-500" />
            </Button>
          </div>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {customers.map((customer) => (
              <CustomerCard
                key={customer._id}
                customer={customer}
                onEdit={(c) => {
                  setEditCustomer(c);
                  setIsModalOpen(true);
                }}
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
        <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden min-h-[400px]">
          <CustomerTable
            data={customers}
            pagination={{
              currentPage,
              totalPages,
              totalEntries,
              limit,
              onPageChange: (page) => setCurrentPage(page),
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

      {/* Modals */}
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
