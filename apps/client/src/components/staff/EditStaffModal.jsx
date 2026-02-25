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
import api from '@/lib/axios';
import { toast } from 'sonner';
import { validateEmail } from '@/lib/utils';

const EditStaffModal = ({ isOpen, onClose, staff, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '', // Optional
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

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name,
        email: staff.email,
        password: '',
        branchId: staff.branchId?._id || staff.branchId || '',
        roleRef: staff.roleRef?._id || staff.roleRef || '',
      });
    }
  }, [staff]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
      return;
    }
    setLoading(true);
    try {
      // Create payload. Only include password if it's not empty.
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
        <DialogHeader>
          <DialogTitle className="text-xl font-black">
            Edit Staff Member
          </DialogTitle>
          <DialogDescription>
            Update profile details for {staff?.name}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Full Name
            </Label>
            <Input
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="rounded-xl border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Email Address
            </Label>
            <Input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="rounded-xl border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              New Password (Leave blank to keep current)
            </Label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              minLength={8}
              className="rounded-xl border-border/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Assign Branch
            </Label>
            <select
              value={formData.branchId}
              onChange={(e) =>
                setFormData({ ...formData, branchId: e.target.value })
              }
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
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
              Assign Role (Optional)
            </Label>
            <select
              value={formData.roleRef}
              onChange={(e) =>
                setFormData({ ...formData, roleRef: e.target.value })
              }
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
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="rounded-full text-[10px] font-black uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="gradient"
              className="rounded-full text-[10px] font-black uppercase tracking-widest px-8"
            >
              {loading ? (
                <Loader2 className="animate-spin w-4 h-4" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditStaffModal;
