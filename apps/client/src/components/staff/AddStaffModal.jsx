import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2 } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { validateEmail } from '@/lib/utils';

const AddStaffModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
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
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] !p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {isSuccess ? 'Staff Member Created!' : 'Add Staff Member'}
            </DialogTitle>
            {!isSuccess && (
              <p className="text-xs text-muted-foreground">
                Create login credentials for a new team member.
              </p>
            )}
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isSuccess ? (
            <div className="space-y-6 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-in zoom-in-50 duration-500">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="font-black text-lg">Staff Member Created!</h3>
                <p className="text-xs text-muted-foreground px-4">
                  Please share these credentials with them. They will be forced
                  to change their password on first login.
                </p>
              </div>
              <div className="w-full space-y-3 px-2">
                <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                      Email Address
                    </Label>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-bold break-all">
                        {successData?.email}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-background"
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
                      Temporary Password
                    </Label>
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-bold break-all">
                        {successData?.password}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 hover:bg-background"
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
                variant="gradient"
                className="w-full rounded-full h-12 font-black text-[11px] uppercase tracking-widest"
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
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                >
                  Full Name
                </Label>
                <Input
                  id="name"
                  placeholder="Enter name"
                  className="rounded-xl border-border/50"
                  {...register('name', { required: 'Full name is required' })}
                />
                {errors.name && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                >
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  className="rounded-xl border-border/50"
                  {...register('email', { required: 'Email is required' })}
                />
                {errors.email && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                >
                  Password
                </Label>
                <PasswordInput
                  id="password"
                  placeholder="Create password"
                  className="rounded-xl border-border/50"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'Minimum 8 characters' },
                  })}
                />
                {errors.password && (
                  <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="branchId"
                  className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                >
                  Assign Branch
                </Label>
                <select
                  id="branchId"
                  className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('branchId')}
                >
                  <option value="">No Branch (Global Access)</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="roleRef"
                  className="text-[10px] font-black uppercase tracking-wider text-muted-foreground"
                >
                  Assign Role (Optional)
                </Label>
                <select
                  id="roleRef"
                  className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register('roleRef')}
                >
                  <option value="">Standard Staff</option>
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </form>
          )}
        </div>

        {/* Fixed Footer — only shown when in form state */}
        {!isSuccess && (
          <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-full px-6 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              form="add-staff-form"
              type="submit"
              variant="gradient"
              isLoading={loading}
              className="rounded-full px-8 text-xs font-black uppercase tracking-wider"
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
