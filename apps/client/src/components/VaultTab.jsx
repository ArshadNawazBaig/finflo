import { useState } from 'react';
import {
  Shield,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Eye,
  Trash2,
  Clock,
  Download,
  ShieldCheck,
  FileBadge,
  Loader2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const VaultTab = ({ customerId, documents = [], onUpdate }) => {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewDoc, setViewDoc] = useState(null);

  // Upload Form State
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState('Other');
  const [expiryDate, setExpiryDate] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size > 5 * 1024 * 1024) {
      toast.error('File too large (Max 5MB)');
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('documents', file); // API expects array field 'documents'
      formData.append('type', docType);
      formData.append('expiryDate', expiryDate);

      const { data } = await api.post(
        `/customers/${customerId}/documents`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        },
      );

      toast.success('Document secured in Vault');
      onUpdate();
      setIsUploadOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDocType('Other');
    setExpiryDate('');
  };

  const handleDelete = async (docId) => {
    try {
      await api.delete(`/customers/${customerId}/documents/${docId}`);
      toast.success('Document removed from Vault');
      onUpdate();
    } catch (error) {
      toast.error('Failed to remove document');
    }
  };

  const handleVerify = async (docId) => {
    try {
      await api.patch(`/customers/${customerId}/documents/${docId}`, {
        status: 'Verified',
      });
      toast.success('Document verified');
      onUpdate();
    } catch (error) {
      toast.error('Failed to verify document');
    }
  };

  const getStatusColor = (status, expiry) => {
    if (expiry && new Date(expiry) < new Date())
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    switch (status) {
      case 'Verified':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Rejected':
        return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'Expired':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getStatusIcon = (status, expiry) => {
    if (expiry && new Date(expiry) < new Date())
      return <AlertTriangle size={12} />;
    if (status === 'Verified') return <CheckCircle2 size={12} />;
    if (status === 'Rejected') return <X size={12} />;
    return <Clock size={12} />;
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 relative overflow-hidden">
      {/* Decorative Background */}
      <ShieldCheck className="absolute -right-6 -bottom-6 w-64 h-64 text-primary/5 pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-black tracking-tighter text-foreground flex items-center gap-2">
              KYC & AML Vault
            </h3>
            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest border border-primary/20">
              Encrypted
            </span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Secure storage for identity verification and compliance documents.
          </p>
        </div>
        <Button
          onClick={() => setIsUploadOpen(true)}
          variant="gradient"
          className="rounded-full px-6 py-2 h-10 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
        >
          <Upload size={14} className="mr-2" />
          Add Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {documents.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/5">
            <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 text-muted-foreground/50">
              <Shield size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">
              Vault is Empty
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-xs mt-2">
              Upload customer identity documents to ensure KYC compliance.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isExpired =
              doc.expiryDate && new Date(doc.expiryDate) < new Date();
            const statusStyle = getStatusColor(doc.status, doc.expiryDate);

            return (
              <div
                key={doc._id}
                className="group p-5 rounded-[2rem] bg-card border border-border/50 hover:border-primary/50 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10">
                      <FileBadge size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-tight text-foreground/80">
                        {doc.type || 'Document'}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[120px]">
                        {doc.name}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest',
                      statusStyle,
                    )}
                  >
                    {getStatusIcon(doc.status, doc.expiryDate)}
                    {isExpired ? 'Expired' : doc.status}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {doc.expiryDate && (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/80">
                      <Calendar size={12} />
                      Expires: {new Date(doc.expiryDate).toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60">
                    <Clock size={12} />
                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border/30">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/30 hover:bg-primary/10 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Eye size={14} />
                    View
                  </a>

                  {doc.status !== 'Verified' && (
                    <button
                      onClick={() => handleVerify(doc._id)}
                      className="px-3 py-2 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="Mark as Verified"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="px-3 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-md bg-slate-950 border-white/10 text-white rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-2 border-b border-white/5">
            <DialogTitle className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <Upload size={20} className="text-primary" />
              Secure Upload
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Document Type
                </label>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl">
                    <SelectItem value="CNIC">National ID (CNIC)</SelectItem>
                    <SelectItem value="Utility Bill">Utility Bill</SelectItem>
                    <SelectItem value="Tax Return">Tax Return / FBR</SelectItem>
                    <SelectItem value="Proof of Residence">
                      Proof of Residence
                    </SelectItem>
                    <SelectItem value="Other">Other Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Expiration Date (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full h-12 pl-12 pr-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-white/90 placeholder:text-muted-foreground/40" // native date picker
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  File Attachment
                </label>
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 text-center hover:bg-white/5 transition-colors cursor-pointer relative group">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.png,.jpeg"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    {file ? (
                      <>
                        <FileText size={24} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-400">
                          {file.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} />
                        <span className="text-xs font-bold">Tap to Browse</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={!file}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest"
            >
              Secure & Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VaultTab;
