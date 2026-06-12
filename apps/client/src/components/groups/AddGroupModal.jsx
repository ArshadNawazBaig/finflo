import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Users,
  PlusCircle,
  Landmark,
  ShieldCheck,
  User,
  Crown,
  Check,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { capitalize } from '@/lib/utils';

const GUARANTEE_OPTIONS = [
  { value: 'joint', label: 'Joint Liability' },
  { value: 'several', label: 'Several' },
  { value: 'none', label: 'None' },
];

const AddGroupModal = ({ isOpen, onClose, onSuccess, initialData }) => {
  const isEdit = Boolean(initialData?._id);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', notes: '' } });

  const [customers, setCustomers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [guaranteePolicy, setGuaranteePolicy] = useState('joint');
  // Map of customerId -> true for selected members.
  const [selected, setSelected] = useState({});
  const [leaderId, setLeaderId] = useState('');
  const [loading, setLoading] = useState(false);

  const hydrate = useCallback(() => {
    if (initialData) {
      reset({ name: initialData.name || '', notes: initialData.notes || '' });
      setBranchId(initialData.branchId?._id || initialData.branchId || '');
      setGuaranteePolicy(initialData.guaranteePolicy || 'joint');
      const sel = {};
      let leader = '';
      (initialData.members || []).forEach((m) => {
        const id = m.customer?._id || m.customer;
        if (id) {
          sel[id] = true;
          if (m.role === 'leader') leader = id;
        }
      });
      setSelected(sel);
      setLeaderId(leader);
    } else {
      reset({ name: '', notes: '' });
      setBranchId('');
      setGuaranteePolicy('joint');
      setSelected({});
      setLeaderId('');
    }
  }, [initialData, reset]);

  useEffect(() => {
    if (!isOpen) return;
    hydrate();

    const fetchCustomers = async () => {
      try {
        const { data } = await api.get('/customers?limit=100');
        setCustomers(data.data || []);
      } catch (err) {
        console.error('Failed to fetch customers', err);
      }
    };
    const fetchBranches = async () => {
      try {
        const { data } = await api.get('/branches');
        setBranches(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch branches', err);
      }
    };
    fetchCustomers();
    fetchBranches();
  }, [isOpen, hydrate]);

  const toggleMember = (id) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        // Drop leader designation if the leader was removed.
        setLeaderId((curr) => (curr === id ? '' : curr));
      } else {
        next[id] = true;
        // First member auto-becomes leader if none chosen yet.
        setLeaderId((curr) => curr || id);
      }
      return next;
    });
  };

  const onSubmit = async (formData) => {
    const memberIds = Object.keys(selected);
    if (memberIds.length < 2) {
      setError('root', { message: 'Select at least two members for the group.' });
      return;
    }

    const members = memberIds.map((id) => ({
      customer: id,
      role: id === leaderId ? 'leader' : 'member',
    }));

    const payload = {
      name: formData.name,
      branchId: branchId || undefined,
      members,
      guaranteePolicy,
      notes: formData.notes || undefined,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/groups/${initialData._id}`, payload);
        toast.success('Group updated successfully');
      } else {
        await api.post('/groups', payload);
        toast.success('Group created successfully');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const message =
        err.response?.data?.message ||
        `Failed to ${isEdit ? 'update' : 'create'} group`;
      setError('root', { message });
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 sm:p-7 pb-5 flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Users />
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-500 mb-1.5">
              {isEdit ? 'Edit Group' : 'New Group'}
            </p>
            <DialogTitle>
              {isEdit ? 'Edit Lending Group' : 'Create Lending Group'}
            </DialogTitle>
            <DialogDescription className="mt-1">
              Joint-liability groups share responsibility for each loan cycle.
            </DialogDescription>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-7 pb-6 custom-scrollbar">
          {errors.root && (
            <div className="bg-rose-500/10 text-rose-500 p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-rose-500/20 mb-5 animate-in fade-in zoom-in-95">
              {errors.root.message}
            </div>
          )}

          <form
            id="add-group-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-5">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <Users className="w-3 h-3 text-primary" /> Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Block C Savings Circle"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50 capitalize"
                  {...register('name', { required: 'Group name is required' })}
                />
                {errors.name && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Branch & Guarantee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <Landmark className="w-3 h-3 text-blue-500" /> Branch
                    (Optional)
                  </label>
                  <Select
                    value={branchId || 'none'}
                    onValueChange={(value) =>
                      setBranchId(value === 'none' ? '' : value)
                    }
                  >
                    <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:ring-2 focus:ring-primary/20 capitalize">
                      <SelectValue placeholder="Choose a branch..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        value="none"
                        className="font-semibold text-slate-500 dark:text-slate-400"
                      >
                        No Branch
                      </SelectItem>
                      {branches.map((b) => (
                        <SelectItem
                          key={b._id}
                          value={b._id}
                          className="capitalize"
                        >
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Guarantee
                    Policy
                  </label>
                  <Select
                    value={guaranteePolicy}
                    onValueChange={setGuaranteePolicy}
                  >
                    <SelectTrigger className="w-full px-4 py-3 h-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:ring-2 focus:ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GUARANTEE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Members multi-select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <User className="w-3 h-3 text-indigo-500" /> Members ·{' '}
                  {Object.keys(selected).length} selected
                </label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                  Pick at least two customers. Tap the crown to set the group
                  leader.
                </p>
                <div className="mt-1 max-h-56 overflow-y-auto rounded-2xl border border-slate-100 dark:border-white/[0.06] divide-y divide-slate-100 dark:divide-white/[0.06] custom-scrollbar">
                  {customers.length === 0 && (
                    <p className="px-4 py-5 text-center text-[11px] font-semibold text-slate-400">
                      No customers available.
                    </p>
                  )}
                  {customers.map((c) => {
                    const isSelected = Boolean(selected[c._id]);
                    const isLeader = leaderId === c._id;
                    return (
                      <div
                        key={c._id}
                        className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                          isSelected
                            ? 'bg-primary/5'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleMember(c._id)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <span
                            className={`h-5 w-5 rounded-md border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-primary border-primary text-white'
                                : 'border-slate-200 dark:border-white/[0.12]'
                            }`}
                          >
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </span>
                          <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">
                            {capitalize(c.name || 'Unknown')}
                          </span>
                        </button>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => setLeaderId(c._id)}
                            title={isLeader ? 'Group leader' : 'Set as leader'}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors ${
                              isLeader
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'text-slate-400 hover:text-amber-600 hover:bg-amber-500/10'
                            }`}
                          >
                            <Crown size={12} />
                            {isLeader ? 'Leader' : 'Set'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Any context about this group..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400/50 resize-none"
                  {...register('notes')}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </button>
          <Button
            form="add-group-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
          >
            {!loading && <PlusCircle size={14} />}
            {isEdit ? 'Save Changes' : 'Create Group'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddGroupModal;
