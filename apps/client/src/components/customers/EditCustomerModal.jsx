import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2,
  FileBadge,
  Upload,
  X,
  Plus,
  Trash2,
  Briefcase,
  Wallet,
  CheckCircle2,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCNIC } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const EditCustomerModal = ({ isOpen, onClose, customer, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    cnic: '',
    job: '',
    monthlyIncome: '',
    branchId: '',
    savingAccountNumber: '',
    currentAccountNumber: '',
  });
  const [branches, setBranches] = useState([]);
  const [fetchingBranches, setFetchingBranches] = useState(false);
  const [files, setFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [docsToDelete, setDocsToDelete] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (isOpen) {
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
  }, [isOpen]);

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        cnic: customer.cnic || '',
        job: customer.job || '',
        monthlyIncome: customer.monthlyIncome || '',
        branchId: customer.branchId || '',
        savingAccountNumber: customer.savingAccountNumber || '',
        currentAccountNumber: customer.currentAccountNumber || '',
      });
      setFiles([]);
      setExistingDocs(customer.documents || []);
      setDocsToDelete([]);
    }
  }, [customer]);

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
    const totalCurrentFiles = existingDocs.length + files.length;

    if (totalCurrentFiles + selectedFiles.length > 5) {
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

  const removeExistingFile = (docId) => {
    setExistingDocs((prev) => prev.filter((doc) => doc._id !== docId));
    setDocsToDelete((prev) => [...prev, docId]);
  };

  if (!customer) return null;

  const handleCNICChange = (e) => {
    setFormData({ ...formData, cnic: formatCNIC(e.target.value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Process Deletions First
      if (docsToDelete.length > 0) {
        await Promise.all(
          docsToDelete.map((docId) =>
            api.delete(`/customers/${customer._id}/documents/${docId}`),
          ),
        );
      }

      // 2. Update Core Details
      const payload = {
        ...formData,
        name: formData.name.trim().toLowerCase(),
        email: formData.email.trim().toLowerCase(),
      };
      await api.put(`/customers/${customer._id}`, payload);

      // 3. Upload New Documents if any
      if (files.length > 0) {
        setUploading(true);
        const data = new FormData();
        files.forEach((file) => {
          data.append('documents', file);
        });
        await api.post(`/customers/${customer._id}/documents`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      toast.success('Customer profile updated');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
        <DialogHeader className="p-0 border-b border-border/10 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black tracking-tight">
                Update Profile
              </DialogTitle>
              <DialogDescription className="text-sm font-medium">
                Comprehensive profile management for{' '}
                <span className="text-primary font-bold">{customer?.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 sm:space-y-6 p-0 sm:px-0 sm:pb-0"
        >
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="phone"
                  className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
                >
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="branchId"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                <Building2 className="w-3 h-3" /> Branch Selection
              </Label>
              <select
                id="branchId"
                name="branchId"
                required
                value={formData.branchId}
                onChange={(e) =>
                  setFormData({ ...formData, branchId: e.target.value })
                }
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
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="address"
                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-2"
              >
                Physical Address
              </Label>
              <Textarea
                id="address"
                placeholder="Street Address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="w-full px-4 py-2.5 sm:py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
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
                    onChange={(e) =>
                      setFormData({ ...formData, job: e.target.value })
                    }
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
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyIncome: e.target.value,
                      })
                    }
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
                  disabled={existingDocs.length + files.length >= 5}
                  className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex flex-col items-center gap-2">
                  <Upload
                    size={20}
                    className="text-primary group-hover:scale-110 transition-transform"
                  />
                  <p className="text-[11px] font-bold">
                    {existingDocs.length + files.length >= 5
                      ? 'Max reached'
                      : 'Click to upload files'}
                  </p>
                </div>
              </div>

              {(existingDocs.length > 0 || files.length > 0) && (
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {/* Existing Documents */}
                  {existingDocs.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl group shrink-0"
                    >
                      <div className="relative">
                        <FileBadge
                          size={20}
                          className="text-indigo-600 shrink-0"
                        />
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border border-white"></div>
                      </div>
                      <span className="text-xs font-medium truncate max-w-[100px]">
                        {doc.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeExistingFile(doc._id)}
                        className="p-1 hover:text-destructive transition-colors shrink-0"
                        title="Delete Document"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}

                  {/* New Files to Upload */}
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
              disabled={loading}
              className="px-6 sm:px-8 py-2.5 sm:py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading || uploading}
              variant="gradient"
              className="px-8 sm:px-10 py-2.5 sm:py-3.5 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-widest"
            >
              {loading || uploading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                'Save Profile'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;
