import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import PasswordInput from '@/components/ui/PasswordInput';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { validateEmail } from '@/lib/utils';

const AddStaffModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    branchId: '',
    roleRef: '',
  });
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchRes, roleRes] = await Promise.all([
          api.get('/branches'),
          api.get('/roles'),
        ]);
        setBranches(branchRes.data);
        setRoles(roleRes.data);
      } catch (error) {
        console.error('Failed to fetch initial data', error);
      }
    };
    fetchData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
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
      setFormData({ name: '', email: '', password: '', branchId: '' });
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            Add Team Member
          </DialogTitle>
          <DialogDescription className="text-xs">
            Create a sub-account for your staff member. They will be able to
            manage customers and create loans.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
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
              value={formData.name}
              onChange={handleChange}
              required
              className="rounded-xl border-border/50"
            />
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
              value={formData.email}
              onChange={handleChange}
              required
              className="rounded-xl border-border/50"
            />
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
              value={formData.password}
              onChange={handleChange}
              required
              minLength={8}
            />
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
              value={formData.branchId}
              onChange={handleChange}
              className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
              value={formData.roleRef}
              onChange={handleChange}
              className="flex h-10 w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Standard Staff</option>
              {roles.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-full px-6 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              isLoading={loading}
              className="rounded-full px-8 text-xs font-black uppercase tracking-wider"
            >
              Create Staff
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddStaffModal;
