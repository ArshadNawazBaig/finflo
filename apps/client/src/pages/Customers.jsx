import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
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
import PageHeader from '@/components/PageHeader';
import AddCustomerModal from '@/components/AddCustomerModal';
import EditCustomerModal from '@/components/EditCustomerModal';
import TableSkeleton from '@/components/TableSkeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteCustomer, setDeleteCustomer] = useState(null);
  const [customerLoans, setCustomerLoans] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(
        `/customers?page=${currentPage}&limit=${limit}&search=${searchTerm}&sortBy=${sortBy}&sortOrder=${sortOrder}`,
      );
      setCustomers(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, sortBy, sortOrder]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc'); // Default to asc for new column
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchCustomers]);

  const handleDeleteClick = async (customer) => {
    try {
      // Use query param to check if customer has loans
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
      fetchCustomers();
      setDeleteCustomer(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
          <TableSkeleton />
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
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchCustomers}
      />

      <EditCustomerModal
        isOpen={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        customer={editCustomer}
        onSuccess={fetchCustomers}
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
