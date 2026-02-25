import { useState, useEffect } from 'react';
import {
  Loader2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
  Building2,
  X,
  Plus,
  Trash2,
  Briefcase,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Upload,
  FileBadge,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { formatCNIC, validateEmail } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const AddCustomerModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    branchId: '',
    savingAccountNumber: '',
    currentAccountNumber: '',
    cnic: '',
    job: '',
    monthlyIncome: '',
  });
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (isOpen) {
      if (user.role === 'staff' && user.branchId) {
        setFormData((prev) => ({ ...prev, branchId: user.branchId }));
      } else {
        const fetchBranches = async () => {
          setFetchingBranches(true);
          try {
            const { data } = await api.get('/branches');
            setBranches(data);
          } catch (err) {
            console.error('Failed to fetch branches', err);
          } finally {
            setFetchingBranches(false);
          }
        };
        fetchBranches();
      }
    }
  }, [isOpen, user.role, user.branchId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generateAccountNumber = (type = 'savingAccountNumber') => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 14; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, [type]: result }));
    toast.success(
      `${type === 'savingAccountNumber' ? 'Saving' : 'Current'} number generated`,
    );
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = [];

    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed total');
      return;
    }

    selectedFiles.forEach((file) => {
      if (file.size > 1 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 1MB limit`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCNICChange = (e) => {
    setFormData({ ...formData, cnic: formatCNIC(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError(emailValidation.message);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const payload = {
      ...formData,
      name: formData.name.trim().toLowerCase(),
      email: formData.email.trim().toLowerCase(),
      monthlyIncome: formData.monthlyIncome
        ? Number(formData.monthlyIncome)
        : undefined,
      savingAccountNumber: formData.savingAccountNumber || undefined,
      currentAccountNumber: formData.currentAccountNumber || undefined,
      cnic: formData.cnic || undefined,
      job: formData.job || undefined,
      address: formData.address || undefined,
      branchId: formData.branchId || undefined,
    };

    try {
      const { data: newCustomer } = await api.post('/customers', payload);

      // Upload Documents if any
      if (files.length > 0) {
        setUploading(true);
        const data = new FormData();
        files.forEach((file) => {
          data.append('documents', file);
        });
        await api.post(`/customers/${newCustomer._id}/documents`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Customer registered successfully');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        branchId: '',
        savingAccountNumber: '',
        currentAccountNumber: '',
        cnic: '',
        job: '',
        monthlyIncome: '',
      });
      setFiles([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add customer');
      toast.error(err.response?.data?.message || 'Failed to add customer');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="p-0">
          <div className="flex items-center gap-3 mb-2 p-0 sm:p-0">
            <div className="p-2 sm:p-3 rounded-2xl bg-primary/10 text-primary shrink-0">
              <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-2xl font-black">
                Add New Customer
              </DialogTitle>
              <DialogDescription className="text-[11px] sm:text-sm font-medium">
                Create a new profile to start lending.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 animate-in fade-in zoom-in-95">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-5 max-h-[60vh] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-primary/10">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                name="name"
                placeholder="e.g. Arshad Nawaz"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Mail className="w-3 h-3" /> Email Address{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="name@nexus.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Phone Number
                </Label>
                <Input
                  name="phone"
                  placeholder="+92 300 1234567"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <Building2 className="w-3 h-3" /> Branch Selection
              </Label>
              {user.role === 'staff' ? (
                <div className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-muted/30 text-sm font-medium text-muted-foreground ">
                  Automatically assigned to your branch
                </div>
              ) : (
                <select
                  name="branchId"
                  required
                  value={formData.branchId}
                  onChange={handleChange}
                  disabled={fetchingBranches}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>
                    Select a branch...
                  </option>
                  {branches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Physical Address
              </Label>
              <Textarea
                name="address"
                placeholder="Enter complete street address..."
                required
                value={formData.address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="pt-4 border-t border-border/50">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">
                Professional & Financial Details
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 h-4 flex items-center">
                    CNIC / ID Number{' '}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input
                    name="cnic"
                    placeholder="42101-XXXXXXX-X"
                    required
                    value={formData.cnic}
                    onChange={handleCNICChange}
                    className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 h-4 flex items-center justify-between">
                    <span>Occupation</span>
                    <Briefcase className="w-3 h-3 opacity-50" />
                  </Label>
                  <Input
                    name="job"
                    placeholder="e.g. Software Engineer"
                    value={formData.job}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 h-4 flex items-center justify-between">
                    <span>Monthly Income</span>
                    <Wallet className="w-3 h-3 opacity-50" />
                  </Label>
                  <Input
                    name="monthlyIncome"
                    type="number"
                    placeholder="e.g. 75000"
                    value={formData.monthlyIncome}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 h-4 flex items-center justify-between">
                    <span>Saving Account</span>
                    <Wallet className="w-3 h-3 opacity-50" />
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      name="savingAccountNumber"
                      readOnly
                      value={formData.savingAccountNumber}
                      placeholder="Generate..."
                      className={`flex-1 px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 text-sm font-black font-mono transition-all ${
                        formData.savingAccountNumber
                          ? 'bg-muted/30 text-muted-foreground w-full'
                          : 'bg-muted/5'
                      }`}
                    />
                    {!formData.savingAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('savingAccountNumber')
                        }
                        variant="outline"
                        className="rounded-2xl py-2.5 sm:py-3 h-auto border-dashed border-primary/40 text-[10px] font-black uppercase px-6"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 h-4 flex items-center justify-between">
                    <span>Current Account</span>
                    <Wallet className="w-3 h-3 opacity-50" />
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      name="currentAccountNumber"
                      readOnly
                      value={formData.currentAccountNumber}
                      placeholder="Generate..."
                      className={`flex-1 px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 text-sm font-black font-mono transition-all ${
                        formData.currentAccountNumber
                          ? 'bg-muted/30 text-muted-foreground w-full'
                          : 'bg-muted/5'
                      }`}
                    />
                    {!formData.currentAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('currentAccountNumber')
                        }
                        variant="outline"
                        className="rounded-2xl py-2.5 sm:py-3 h-auto border-dashed border-primary/40 text-[10px] font-black uppercase px-6"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-border/50">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Supporting Documents (Max 5, 1MB each)
              </Label>
              <div className="border-2 border-dashed border-border/40 rounded-[2rem] p-6 text-center bg-muted/5 hover:bg-muted/10 transition-all group relative">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileChange}
                  disabled={files.length >= 5}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload
                    size={20}
                    className="text-primary group-hover:scale-110 transition-transform"
                  />
                  <p className="text-[11px] font-bold">
                    {files.length >= 5
                      ? 'Max reached'
                      : 'Click to upload files'}
                  </p>
                </div>
              </div>

              {files.length > 0 && (
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-3 py-2 bg-muted/20 border border-border/30 rounded-xl group shrink-0"
                    >
                      <FileBadge
                        size={20}
                        className="text-muted-foreground shrink-0"
                      />
                      <span className="text-xs font-medium truncate max-w-[100px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:text-destructive transition-colors shrink-0"
                        title="Remove Upload"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading || uploading}
              variant="gradient"
              className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest flex items-center gap-2.5 sm:gap-3"
            >
              {loading || uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <UserPlus size={14} />
              )}
              Register Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCustomerModal;
