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
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { validateEmail } from '@/lib/utils';

const EditStaffModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm();

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
      <DialogContent className="sm:max-w-[425px] max-h-[95vh] !p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              Edit Staff Member
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Update profile details for {staff?.name}.
            </p>
          </DialogHeader>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <form
            id="edit-staff-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Full Name
              </Label>
              <Input
                className="rounded-xl border-border/50"
                {...register('name', { required: 'Full name is required' })}
              />
              {errors.name && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Email Address
              </Label>
              <Input
                type="email"
                className="rounded-xl border-border/50"
                {...register('email', { required: 'Email is required' })}
              />
              {errors.email && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                New Password (Leave blank to keep current)
              </Label>
              <PasswordInput
                placeholder="Leave blank to keep current"
                className="rounded-xl border-border/50"
                {...register('password', {
                  minLength: { value: 8, message: 'Minimum 8 characters' },
                })}
              />
              {errors.password && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Assign Branch
              </Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Assign Role (Optional)
              </Label>
              <select
                className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t  z-10 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            Cancel
          </Button>
          <Button
            form="edit-staff-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="rounded-full text-[10px] font-black uppercase tracking-widest px-8"
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditStaffModal;
