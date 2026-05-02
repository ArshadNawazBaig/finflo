import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Plus,
  Search,
  Edit,
  Trash2,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const availablePermissions = [
  { id: 'view_all', label: 'View All Data', group: 'General' },
  { id: 'view_assigned', label: 'View Assigned Data Only', group: 'General' },
  { id: 'manage_loans', label: 'Manage Loans', group: 'Loans' },
  { id: 'approve_loans', label: 'Approve/Reject Loans', group: 'Loans' },
  { id: 'disburse_loans', label: 'Disburse Loans', group: 'Loans' },
  { id: 'manage_members', label: 'Manage Members', group: 'Members' },
  {
    id: 'approve_members',
    label: 'Approve Self-Registered Members',
    group: 'Members',
  },
  { id: 'manage_branches', label: 'Manage Branches', group: 'System' },
  { id: 'view_reports', label: 'View Reports', group: 'System' },
  { id: 'manage_roles', label: 'Manage Roles & Permissions', group: 'System' },
  { id: 'system_settings', label: 'System Settings', group: 'System' },
];

import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import EmptyState from '@/components/ui/EmptyState';

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', description: '', permissions: [] },
  });
  const currentPermissions = watch('permissions') || [];
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/roles');
      setRoles(data);
    } catch (error) {
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (role = null) => {
    if (role) {
      setEditingRole(role);
      reset({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      reset({
        name: '',
        description: '',
        permissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    const current = watch('permissions') || [];
    setValue(
      'permissions',
      current.includes(permId)
        ? current.filter((p) => p !== permId)
        : [...current, permId],
    );
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole._id}`, data);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', data);
        toast.success('Role created successfully');
      }
      fetchRoles();
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const handleDeleteClick = (role) => {
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;
    setDeletingId(roleToDelete._id);
    try {
      await api.delete(`/roles/${roleToDelete._id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
    } finally {
      setDeletingId(null);
      setRoleToDelete(null);
    }
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        title="Role Management"
        description="Define granular access control levels for your team members."
        icon={Shield}
      />

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
          />
        </div>

        <Button
          onClick={() => handleOpenModal()}
          variant="gradient"
          className="rounded-2xl px-6 py-6 h-auto group"
          isLoading={loading && roles.length === 0}
        >
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform">
              <Plus size={18} />
            </div>
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none mb-1">
                New Identity
              </p>
              <p className="font-black text-sm uppercase tracking-wider">
                Create Custom Role
              </p>
            </div>
          </div>
        </Button>
      </div>

      {loading && roles.length === 0 ? (
        <CardsSkeleton count={6} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role, idx) => (
            <motion.div
              key={role._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group relative"
            >
              <div className="h-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Shield size={120} />
                </div>

                <div className="relative z-10 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-6">
                    <div
                      className={cn(
                        'h-12 w-12 rounded-2xl flex items-center justify-center',
                        role.isSystem
                          ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                          : 'bg-primary/10 text-primary',
                      )}
                    >
                      {role.isSystem ? (
                        <ShieldCheck size={24} />
                      ) : (
                        <Shield size={24} />
                      )}
                    </div>
                    {!role.isSystem && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleOpenModal(role)}
                          className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Edit size={14} />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeleteClick(role)}
                          isLoading={deletingId === role._id}
                          className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-xl font-black tracking-tight mb-2 truncate">
                    {role.name}
                  </h3>
                  <p className="text-muted-foreground text-xs font-medium leading-relaxed mb-6 line-clamp-2">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                      <span>Permissions</span>
                      <span className="bg-primary/5 text-primary px-2 py-0.5 rounded-full">
                        {role.permissions.length} active
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {role.permissions.slice(0, 4).map((perm) => (
                        <span
                          key={perm}
                          className="text-[9px] font-bold px-2 py-1 rounded-md bg-white/80 dark:bg-black/20 border border-border/50"
                        >
                          {perm.replace('_', ' ')}
                        </span>
                      ))}
                      {role.permissions.length > 4 && (
                        <span className="text-[9px] font-bold px-2 py-1 rounded-md bg-primary/5 text-primary">
                          +{role.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && filteredRoles.length === 0 && (
        <EmptyState
          icon={Shield}
          title={searchQuery ? 'No Roles Found' : 'No Roles Yet'}
          description={
            searchQuery
              ? `We couldn't find any roles matching "${searchQuery}".`
              : "You haven't created any custom roles yet. Start by defining a new permission set."
          }
          className="border-none bg-transparent py-20"
        />
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[95vh] !p-0 flex flex-col overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
          <form
            id="new-identity-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col h-full overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="p-8 border-b bg-background z-10 shrink-0">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">
                    {editingRole ? 'Modify Role' : 'New Identity'}
                  </DialogTitle>
                  <p className="text-muted-foreground text-xs font-medium mt-1">
                    {editingRole
                      ? 'Update permissions and description.'
                      : 'Create a custom permission set.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    {...register('name', { required: 'Role name is required' })}
                    placeholder="e.g. Auditor"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                  />
                  {errors.name && (
                    <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                      {errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Description
                  </label>
                  <input
                    type="text"
                    {...register('description')}
                    placeholder="Brief purpose of this role"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/20">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Capability Registry
                  </h4>
                  <span className="text-[10px] font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-widest">
                    {currentPermissions.length} selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {availablePermissions.map((perm) => (
                    <button
                      key={perm.id}
                      type="button"
                      onClick={() => handleTogglePermission(perm.id)}
                      className={cn(
                        'flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group/perm',
                        currentPermissions.includes(perm.id)
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                          : 'bg-white/50 dark:bg-slate-900/50 border-border/50 hover:border-primary/30',
                      )}
                    >
                      <div
                        className={cn(
                          'h-6 w-6 rounded-lg flex items-center justify-center border transition-colors',
                          currentPermissions.includes(perm.id)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white dark:bg-slate-800 border-border group-hover/perm:border-primary/50',
                        )}
                      >
                        {currentPermissions.includes(perm.id) && (
                          <Check size={14} strokeWidth={4} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
                          {perm.group}
                        </p>
                        <p className="text-xs font-black uppercase tracking-wider">
                          {perm.label}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex justify-end gap-3 border-t border-border/20 z-10 shrink-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6"
              >
                Cancel
              </Button>
              <Button
                form="new-identity-form"
                type="submit"
                isLoading={saving}
                variant="gradient"
                className="rounded-xl text-[10px] font-black uppercase tracking-widest px-8"
              >
                {editingRole ? 'Confirm Changes' : 'Finalize Creation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DeleteRoleConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        roleName={roleToDelete?.name}
        loading={deletingId !== null}
      />
    </div>
  );
};

const DeleteRoleConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  roleName,
  loading,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10 text-center">
          <DialogHeader>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
              <AlertTriangle className="text-rose-500" size={24} />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-rose-500">
              Delete System Role
            </DialogTitle>
            <DialogDescription className="text-sm font-medium pt-2">
              This action is irreversible and will affect all assigned team
              members.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <p className="text-xs text-muted-foreground font-medium leading-relaxed bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
                Are you sure you want to delete the{' '}
                <span className="text-rose-600 font-black uppercase tracking-wider">
                  "{roleName}"
                </span>{' '}
                role? Team members assigned to this role may lose access to
                system features immediately.
              </p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 min-h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            isLoading={loading}
            className="flex-[2] min-h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 shadow-xl shadow-rose-500/20 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Finalize Deletion
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Roles;
