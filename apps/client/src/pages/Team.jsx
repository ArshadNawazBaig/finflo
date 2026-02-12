import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
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
import PageHeader from '@/components/PageHeader';
import TableSkeleton from '@/components/TableSkeleton';
import TableSearch from '@/components/ui/TableSearch';
import AddStaffModal from '@/components/AddStaffModal';
import EditStaffModal from '@/components/EditStaffModal';
import StaffTable from '@/components/StaffTable';
import StaffCard from '@/components/StaffCard';
import InfiniteLoader from '@/components/InfiniteLoader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const Team = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [deleteStaffId, setDeleteStaffId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Mobile & Infinite Scroll State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const observerTarget = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchStaff = useCallback(
    async (isAppend = false) => {
      try {
        if (isAppend) {
          setIsFetchingMore(true);
        } else {
          setLoading(true);
        }

        const pageToFetch = isAppend ? currentPage + 1 : currentPage;
        const { data } = await api.get(
          `/staff?page=${pageToFetch}&limit=${limit}&search=${searchTerm}`,
        );

        if (isAppend) {
          setStaff((prev) => {
            const existingIds = new Set(prev.map((s) => s._id));
            const newStaff = (data.data || []).filter(
              (s) => !existingIds.has(s._id),
            );
            return [...prev, ...newStaff];
          });
          setCurrentPage(pageToFetch);
        } else {
          setStaff(data.data || []);
        }

        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
      } catch (error) {
        console.error('Failed to fetch staff', error);
        toast.error('Failed to load team members');
      } finally {
        setLoading(false);
        setIsFetchingMore(false);
      }
    },
    [currentPage, limit, searchTerm],
  );

  useEffect(() => {
    if (!isMobile) {
      fetchStaff();
    }
  }, [fetchStaff, isMobile]);

  // Initial Fetch & Search Debounce
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchStaff(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, limit]);

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
          fetchStaff(true);
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isMobile, isFetchingMore, currentPage, totalPages, fetchStaff]);

  // Adjust limit for mobile batching
  useEffect(() => {
    if (isMobile) {
      setLimit(3);
    } else {
      setLimit(10);
    }
  }, [isMobile]);

  const handleAddStaff = () => {
    setIsAddModalOpen(true);
  };

  const handleStaffAdded = () => {
    fetchStaff();
    setIsAddModalOpen(false);
    toast.success('Staff member added successfully');
  };

  const handleEditStaff = (staffMember) => {
    setSelectedStaff(staffMember);
    setIsEditModalOpen(true);
  };

  const handleStaffUpdated = () => {
    fetchStaff();
    setIsEditModalOpen(false);
    toast.success('Staff profile updated');
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaffId) return;

    try {
      await api.delete(`/staff/${deleteStaffId}`);
      toast.success('Staff member removed');
      setDeleteStaffId(null);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete staff');
    }
  };

  const handleToggleStatus = async (staffId) => {
    try {
      await api.patch(`/staff/${staffId}/toggle`);
      toast.success('Status updated successfully');
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const [user] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  const filteredStaff = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.isActive).length,
    admins: staff.filter((s) => s.role === 'admin' || s.role === 'super_admin')
      .length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Team Management"
        description="Add and manage your staff members who can create loans and manage customers."
      >
        {user.role === 'admin' && (
          <Button
            onClick={handleAddStaff}
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-wider w-full sm:w-auto"
          >
            <Plus size={16} />
            Add Staff
          </Button>
        )}
      </PageHeader>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Total Team"
          amount={stats.total}
          icon={<Users size={20} />}
          color="bg-primary shadow-primary/20"
        />
        <StatsCard
          title="Active Staff"
          amount={stats.active}
          icon={<UserCheck size={20} />}
          color="bg-emerald-500 shadow-emerald-500/20"
        />
        <StatsCard
          title="Privileged Users"
          amount={stats.admins}
          icon={<ShieldCheck size={20} />}
          color="bg-purple-500 shadow-purple-500/20"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <TableSearch
            value={searchTerm}
            onChange={(value) => {
              setSearchTerm(value);
              setCurrentPage(1);
            }}
            placeholder="Search staff..."
          />
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <>
            {isMobile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {staff.map((item) => (
                    <StaffCard
                      key={item._id}
                      item={item}
                      onToggleStatus={handleToggleStatus}
                      onEdit={handleEditStaff}
                      onDelete={setDeleteStaffId}
                    />
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                {currentPage < totalPages && (
                  <div ref={observerTarget}>
                    <InfiniteLoader isFetchingMore={isFetchingMore} />
                  </div>
                )}

                {staff.length === 0 && (
                  <div className="py-12 text-center text-slate-500">
                    No staff members found.
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-[2rem] border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
                <StaffTable
                  data={staff}
                  onToggleStatus={handleToggleStatus}
                  onEdit={handleEditStaff}
                  onDelete={setDeleteStaffId}
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
                />
              </div>
            )}
          </>
        )}
      </div>

      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleStaffAdded}
      />

      <EditStaffModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        staff={selectedStaff}
        onSuccess={handleStaffUpdated}
      />

      <AlertDialog
        open={!!deleteStaffId}
        onOpenChange={() => setDeleteStaffId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this staff member? This action
              cannot be undone and they will lose all access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="bg-gradient-to-r from-red-500 to-destructive text-white shadow-xl shadow-red-500/20 hover:brightness-110"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Team;
