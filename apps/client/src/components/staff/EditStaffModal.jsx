import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { capitalize, validateEmail } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';

const EditStaffModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch('password');

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const [branchRes, roleRes] = await Promise.allSettled([
          api.get('/branches'),
          api.get('/roles'),
        ]);
        if (branchRes.status === 'fulfilled') setBranches(branchRes.value.data);
        if (roleRes.status === 'fulfilled') setRoles(roleRes.value.data);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      }
    };
    fetchData();
  }, [isOpen]);

  useEffect(() => {
    if (staff) {
      reset({
        name: staff.name,
        email: staff.email,
        password: '',
        branchId: staff.branchId?._id || staff.branchId || '',
        roleRef: staff.roleRef?._id || staff.roleRef || '',
      });
    }
  }, [staff, reset]);

  const onSubmit = async (formData) => {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      return;
    }

    // Password is optional on edit (blank = keep current); only enforce the
    // policy when the user actually typed a new one.
    if (formData.password) {
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        setError('password', { message: passwordValidation.message });
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
      };
      if (!payload.password) delete payload.password;

      await api.put(`/staff/${staff._id}`, payload);
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update staff');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/[0.06] z-10">
          <DialogHeader>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
              Update profile
            </p>
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription className="mt-1">
              Update profile details for {capitalize(staff?.name)}.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          <form
            id="edit-staff-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Full Name
              </Label>
              <Input
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('name', { required: 'Full name is required' })}
              />
              {errors.name && (
                <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Email Address
              </Label>
              <Input
                type="email"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                New Password (Leave blank to keep current)
              </Label>
              <PasswordInput
                placeholder="Leave blank to keep current"
                className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('password')}
              />
              {password && <PasswordRequirements value={password} />}
              {errors.password && (
                <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Assign Branch
              </Label>
              <Controller
                control={control}
                name="branchId"
                render={({ field }) => (
                  <Select
                    value={field.value === '' ? '__none__' : field.value}
                    onValueChange={(v) =>
                      field.onChange(v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">
                        No Branch (Global Access)
                      </SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b._id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                Assign Role (Optional)
              </Label>
              <Controller
                control={control}
                name="roleRef"
                render={({ field }) => (
                  <Select
                    value={field.value === '' ? '__none__' : field.value}
                    onValueChange={(v) =>
                      field.onChange(v === '__none__' ? '' : v)
                    }
                  >
                    <SelectTrigger className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Standard Staff</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r._id} value={r._id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 sm:px-7 pb-6 sm:pb-7 pt-5 border-t border-slate-100 dark:border-white/[0.06] z-10 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="h-11 px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
          >
            Cancel
          </Button>
          <Button
            form="edit-staff-form"
            type="submit"
            isLoading={loading}
            className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditStaffModal;
