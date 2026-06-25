import { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Trash2, Pencil, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import AddDepartmentModal from '@/components/payroll/AddDepartmentModal';
import api from '@/lib/axios';
import { toast } from 'sonner';

/**
 * Departments — manage the tenant's payroll departments (the pick-list behind
 * the employee `department` field). Create/edit via the modal; delete is blocked
 * server-side while active employees reference the department.
 */
const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDepartments = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/payroll/departments?limit=200');
      setDepartments(data.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const openCreate = () => {
    setEditingDept(null);
    setModalOpen(true);
  };

  const openEdit = (dept) => {
    setEditingDept(dept);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      await api.delete(`/payroll/departments/${deleteTarget._id}`);
      toast.success('Department deleted');
      setDeleteTarget(null);
      fetchDepartments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Departments"
        description="Create and manage the departments employees can be assigned to."
        action={
          <Button onClick={openCreate} className="rounded-full font-bold">
            <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
            Add Department
          </Button>
        }
      />

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-2 dark:border-white/[0.06] dark:bg-white/[0.02]">
        {loading ? (
          <div className="space-y-2 p-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Add your first department to start organising employees."
            className="py-12"
            action={
              <Button onClick={openCreate} className="rounded-full font-bold">
                <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                Add Department
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/[0.06]">
            {departments.map((dept) => (
              <div
                key={dept._id}
                className="flex items-center justify-between gap-3 p-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                      {dept.name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {dept.employeeCount || 0} employee
                      {dept.employeeCount === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(dept)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteTarget(dept)}
                    className="text-rose-500 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddDepartmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={fetchDepartments}
        initialData={editingDept}
      />

      <ConfirmActionModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        variant="danger"
        title={`Delete "${deleteTarget?.name}"?`}
        description="This department will be removed. It can only be deleted if no active employees are assigned to it."
        confirmText="Delete Department"
      />
    </div>
  );
};

export default Departments;
