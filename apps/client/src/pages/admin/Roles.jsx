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
  // Operational — front-counter transaction processing (Teller Mode).
  {
    id: 'process_transactions',
    label: 'Process Cash Transactions (Teller)',
    group: 'Operations',
  },
  // Sensitive — undoing a posted transaction. Usually reserved for
  // accountants / branch managers, not front-line tellers.
  {
    id: 'reverse_transactions',
    label: 'Reverse Posted Transactions',
    group: 'Operations',
  },
  { id: 'manage_branches', label: 'Manage Branches', group: 'System' },
  { id: 'view_reports', label: 'View Reports', group: 'System' },
  { id: 'manage_roles', label: 'Manage Roles & Permissions', group: 'System' },
  { id: 'system_settings', label: 'System Settings', group: 'System' },
];

// Curated role bundles. Admins can click one to seed the create-role form
// with the canonical permission set for that job, then tweak before saving.
// Permissions are intentionally tight — broaden via the checkboxes if a
// specific tenant needs more.
const ROLE_TEMPLATES = [
  {
    slug: 'teller',
    name: 'Teller',
    description:
      'Front-counter cashier. Processes deposits, withdrawals, and loan repayments for assigned branch.',
    permissions: ['view_assigned', 'process_transactions'],
    accent: 'from-emerald-500 to-emerald-600',
  },
  {
    slug: 'branch_manager',
    name: 'Branch Manager',
    description:
      'Runs a single branch. Approves loans/members in their branch and views branch-level reports.',
    permissions: [
      'view_assigned',
      'manage_members',
      'approve_members',
      'manage_loans',
      'approve_loans',
      'disburse_loans',
      'process_transactions',
      'view_reports',
    ],
    accent: 'from-indigo-500 to-indigo-600',
  },
  {
    slug: 'auditor',
    name: 'Auditor',
    description:
      'Read-only access across the business. Cannot mutate any data — built for compliance reviews and external audits.',
    permissions: ['view_all', 'view_reports'],
    accent: 'from-amber-500 to-amber-600',
  },
  {
    slug: 'accountant',
    name: 'Accountant',
    description:
      'Books and reconciliation. Views reports, reverses miss-posted transactions, and reconciles ledgers — does not approve loans or members.',
    permissions: ['view_all', 'view_reports', 'reverse_transactions'],
    accent: 'from-purple-500 to-purple-600',
  },
];

import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import { SettingsPageSkeleton } from '@/components/ui/PageSkeletons';
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

  // Seed the create-role modal from one of the curated templates. The form
  // is still editable — admins routinely want to add/remove a permission
  // before saving (e.g. give a Teller `disburse_loans` for a small branch).
  const handleUseTemplate = (template) => {
    setEditingRole(null);
    reset({
      name: template.name,
      description: template.description,
      permissions: [...template.permissions],
    });
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

  if (loading && roles.length === 0 && !searchQuery) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader
        title="Role Management"
        description="Define granular access control levels for your team members."
        icon={Shield}
      />

      {/* Role templates — curated bundles that pre-fill the create form.
          Common shapes (Teller / Branch Manager / Auditor / Accountant)
          ship as starting points so admins don't build them from scratch. */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">
              Start from a template
            </h3>
            <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
              Pre-curated permission bundles. Tweak before saving if you need a tighter or looser fit.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.slug}
              type="button"
              onClick={() => handleUseTemplate(tpl)}
              className="text-left group rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:border-primary/40 hover:bg-primary/[0.04] transition-all p-4 space-y-3 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`h-9 w-9 rounded-2xl bg-gradient-to-br ${tpl.accent} text-white flex items-center justify-center shadow-sm`}
                >
                  <Shield size={15} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary">
                  {tpl.permissions.length} perms
                </span>
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight">
                  {tpl.name}
                </p>
                <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                  {tpl.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus size={11} />
                Use template
              </div>
            </button>
          ))}
        </div>
      </div>

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
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm font-medium"
          />
        </div>

        <Button
          onClick={() => handleOpenModal()}
          className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          isLoading={loading && roles.length === 0}
        >
          <Plus size={14} strokeWidth={2.5} />
          Create Role
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
              <div className="h-full bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[2rem] p-6 sm:p-8 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all duration-300 overflow-hidden">
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
                          className="text-[9px] font-bold px-2 py-1 rounded-full bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]"
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
        <div className="p-6 border-b z-10 text-center">
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
