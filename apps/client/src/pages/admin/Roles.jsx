import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Check,
  X,
  ShieldCheck,
  Lock,
  ChevronRight,
  Info,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [],
  });
  const [saving, setSaving] = useState(false);

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
      setFormData({
        name: role.name,
        description: role.description,
        permissions: role.permissions,
      });
    } else {
      setEditingRole(null);
      setFormData({
        name: '',
        description: '',
        permissions: [],
      });
    }
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) return toast.error('Role name is required');

    setSaving(true);
    try {
      if (editingRole) {
        await api.put(`/roles/${editingRole._id}`, formData);
        toast.success('Role updated successfully');
      } else {
        await api.post('/roles', formData);
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

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;

    try {
      await api.delete(`/roles/${id}`);
      toast.success('Role deleted successfully');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete role');
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
        subtitle="Define granular access control levels for your team members."
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

      {loading ? (
        <div className="flex flex-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        </div>
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
                        <button
                          onClick={() => handleOpenModal(role)}
                          className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(role._id)}
                          className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Trash2 size={14} />
                        </button>
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl p-0">
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="p-8 space-y-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black tracking-tight">
                    {editingRole ? 'Modify Role' : 'New Identity'}
                  </DialogTitle>
                  <p className="text-muted-foreground text-xs font-medium">
                    {editingRole
                      ? 'Update permissions and description.'
                      : 'Create a custom permission set.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Auditor"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-border/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
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
                    {formData.permissions.length} selected
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
                        formData.permissions.includes(perm.id)
                          ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5'
                          : 'bg-white/50 dark:bg-slate-900/50 border-border/50 hover:border-primary/30',
                      )}
                    >
                      <div
                        className={cn(
                          'h-6 w-6 rounded-lg flex items-center justify-center border transition-colors',
                          formData.permissions.includes(perm.id)
                            ? 'bg-primary border-primary text-white'
                            : 'bg-white dark:bg-slate-800 border-border group-hover/perm:border-primary/50',
                        )}
                      >
                        {formData.permissions.includes(perm.id) && (
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

            <div className="bg-slate-50 dark:bg-slate-900/50 p-6 flex justify-end gap-3 border-t border-border/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                variant="gradient"
                className="rounded-xl text-[10px] font-black uppercase tracking-widest px-8"
              >
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRole ? 'Confim Changes' : 'Finalize Creation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Roles;
