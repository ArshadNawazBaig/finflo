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
import { Copy, CheckCircle2 } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordRequirements from '@/components/ui/PasswordRequirements';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { validateEmail } from '@/lib/utils';
import { validatePassword } from '@/lib/passwordPolicy';

const AddStaffModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
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
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      branchId: '',
      roleRef: '',
    },
  });

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

  const onSubmit = async (formData) => {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      return;
    }

    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      setError('password', { message: passwordValidation.message });
      return;
    }

    setLoading(true);
    const payload = {
      ...formData,
      name: formData.name.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
    };
    try {
      await api.post('/staff', payload);
      setSuccessData({ email: payload.email, password: payload.password });
      setIsSuccess(true);
      reset();
      onSuccess();
    } catch (error) {
      const message =
        error.response?.data?.message || 'Failed to create staff member';
      toast.error(message);
      console.error(error);
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
              {isSuccess ? 'Account ready' : 'New staff'}
            </p>
            <DialogTitle>
              {isSuccess ? 'Staff Member Created!' : 'Add Staff Member'}
            </DialogTitle>
            {!isSuccess && (
              <DialogDescription className="mt-1">
                Create login credentials for a new team member.
              </DialogDescription>
            )}
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          {isSuccess ? (
            <div className="space-y-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-extrabold tracking-tight text-lg text-slate-900 dark:text-white">Staff Member Created!</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-4">
                  Please share these credentials with them. They will be forced
                  to change their password on first login.
                </p>
              </div>
              <div className="w-full space-y-3 px-2">
                <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Email Address
                    </Label>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-bold break-all text-slate-900 dark:text-white">
                        {successData?.email}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-white dark:hover:bg-white/[0.04]"
                        onClick={() => {
                          navigator.clipboard.writeText(successData?.email);
                          toast.success('Email copied');
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Temporary Password
                    </Label>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-bold break-all text-slate-900 dark:text-white">
                        {successData?.password}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-white dark:hover:bg-white/[0.04]"
                        onClick={() => {
                          navigator.clipboard.writeText(successData?.password);
                          toast.success('Password copied');
                        }}
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  onClose();
                }}
                className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                Done &amp; Close
              </Button>
            </div>
          ) : (
            <form
              id="add-staff-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div>
                <Label
                  htmlFor="name"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter name"
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
                <Label
                  htmlFor="email"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
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
                <Label
                  htmlFor="password"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block"
                >
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Create a password"
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  {...register('password', {
                    required: 'Password is required',
                  })}
                />
                <PasswordRequirements value={password} />
                {errors.password && (
                  <p className="text-rose-500 text-[10px] font-bold pl-1 mt-1 animate-in fade-in slide-in-from-top-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="branchId"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block"
                >
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
                      <SelectTrigger
                        id="branchId"
                        className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      >
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
                <Label
                  htmlFor="roleRef"
                  className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block"
                >
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
                      <SelectTrigger
                        id="roleRef"
                        className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 h-auto text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      >
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
          )}
        </div>

        {/* Fixed Footer — only shown when in form state */}
        {!isSuccess && (
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
              form="add-staff-form"
              type="submit"
              isLoading={loading}
              className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Create Staff
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffModal;
