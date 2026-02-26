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
import { Loader2, Upload, X, Trash2, UserCircle } from 'lucide-react';
import SignaturePad from '@/components/ui/SignaturePad';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCNIC, validateEmail } from '@/lib/utils';
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
    jobDetail: '',
    monthlyIncome: '',
    branchId: '',
    savingAccountNumber: '',
    currentAccountNumber: '',
    signature: '',
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
        jobDetail: customer.jobDetail || '',
        monthlyIncome: customer.monthlyIncome || '',
        branchId: customer.branchId || '',
        savingAccountNumber: customer.savingAccountNumber || '',
        currentAccountNumber: customer.currentAccountNumber || '',
        signature: customer.signature || '',
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

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
      setLoading(false);
      return;
    }

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
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <UserCircle className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Update Profile
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Modify details for{' '}
                  <span className="font-bold text-primary">
                    {customer?.name}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-10 custom-scrollbar">
          <form
            id="edit-customer-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    CNIC Number
                  </label>
                  <input
                    type="text"
                    name="cnic"
                    value={formData.cnic}
                    onChange={handleCNICChange}
                    required
                    placeholder="00000-0000000-0"
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Occupation
                  </label>
                  <input
                    type="text"
                    name="job"
                    value={formData.job}
                    onChange={(e) =>
                      setFormData({ ...formData, job: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Monthly Income
                  </label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={formData.monthlyIncome}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monthlyIncome: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Job Detail & Office Address
                </label>
                <textarea
                  name="jobDetail"
                  value={formData.jobDetail}
                  onChange={(e) =>
                    setFormData({ ...formData, jobDetail: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Residential Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Branch Selection
                </label>
                {user.role === 'staff' ? (
                  <div className="w-full px-4 py-3 rounded-2xl bg-muted/30 text-xs font-bold text-muted-foreground italic border border-border/50">
                    Assigned to your branch
                  </div>
                ) : (
                  <select
                    name="branchId"
                    value={formData.branchId}
                    onChange={(e) =>
                      setFormData({ ...formData, branchId: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-3xl bg-muted/30 border border-border/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Saving Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={formData.savingAccountNumber}
                      placeholder="Gen ->"
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black font-mono focus:outline-none"
                    />
                    {!formData.savingAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('savingAccountNumber')
                        }
                        className="rounded-2xl px-4 py-3"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Current Account
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={formData.currentAccountNumber}
                      placeholder="Gen ->"
                      className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black font-mono focus:outline-none"
                    />
                    {!formData.currentAccountNumber && (
                      <Button
                        type="button"
                        onClick={() =>
                          generateAccountNumber('currentAccountNumber')
                        }
                        className="rounded-2xl px-4 py-3"
                      >
                        Gen
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {existingDocs.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                    Existing Documents
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {existingDocs.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex items-center justify-between p-3 bg-muted/30 border border-border/50 rounded-2xl"
                      >
                        <span className="text-[10px] font-bold truncate pr-2">
                          {doc.originalName}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeExistingFile(doc._id)}
                          className="text-destructive hover:scale-110 transition-transform"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  New Documents (Max 5 Total)
                </label>
                <div className="relative p-6 border-2 border-dashed border-border/60 rounded-3xl text-center hover:bg-muted/10 transition-colors">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Click or drag files
                  </p>
                </div>
                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-full"
                      >
                        <span className="text-[10px] font-bold truncate max-w-[100px]">
                          {file.name}
                        </span>
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-destructive"
                          onClick={() => removeFile(idx)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 flex justify-between">
                  Signature <span>*</span>
                </label>
                {formData.signature &&
                  formData.signature.startsWith('http') && (
                    <div className="mb-2 p-2 bg-white rounded-2xl border border-border/20 flex flex-col items-center">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">
                        Current Signature
                      </p>
                      <img
                        src={formData.signature}
                        alt="Current Signature"
                        className="max-h-24 object-contain"
                      />
                    </div>
                  )}
                <SignaturePad
                  onSave={(dataUrl) =>
                    setFormData((prev) => ({ ...prev, signature: dataUrl }))
                  }
                  onClear={() =>
                    setFormData((prev) => ({ ...prev, signature: '' }))
                  }
                />
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="edit-customer-form"
            type="submit"
            disabled={loading || uploading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            {loading || uploading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerModal;
