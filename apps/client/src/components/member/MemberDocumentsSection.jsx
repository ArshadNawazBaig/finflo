/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useEffect, useRef, useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Upload,
  FileText,
  FileBadge,
  Eye,
  Trash2,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
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
import { DatePicker } from '@/components/ui/date-picker';
import FormField from '@/components/ui/FormField';

const DOC_TYPES = [
  'CNIC',
  'Selfie',
  'Utility Bill',
  'Tax Return',
  'Proof of Residence',
  'Other',
];

const STATUS_STYLES = {
  Pending: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  Verified: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
  Rejected: 'text-rose-600 bg-rose-500/10 border-rose-500/20',
  Expired: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
};

const statusIconFor = (key) => {
  if (key === 'Verified') return <CheckCircle2 size={12} />;
  if (key === 'Rejected') return <X size={12} />;
  if (key === 'Expired') return <AlertTriangle size={12} />;
  return <Clock size={12} />;
};

const MemberDocumentsSection = ({ memberId, documents = [], onChange }) => {
  const fileInputRef = useRef(null);
  const [docs, setDocs] = useState(documents);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [type, setType] = useState('CNIC');
  const [expiryDate, setExpiryDate] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    setDocs(documents || []);
  }, [documents]);

  const resetForm = () => {
    setFiles([]);
    setType('CNIC');
    setExpiryDate('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePick = (e) => {
    const selected = Array.from(e.target.files || []).slice(0, 5);
    setFiles(selected);
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Pick at least one file');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      files.forEach((f) => fd.append('documents', f));
      fd.append('type', type);
      if (expiryDate) fd.append('expiryDate', expiryDate);
      const { data } = await api.post(`/members/${memberId}/documents`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocs(data.documents || []);
      onChange?.(data.documents || []);
      toast.success(
        `Uploaded ${files.length} document${files.length === 1 ? '' : 's'}`,
      );
      setIsUploadOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStatus = async (docId, status) => {
    try {
      setActionId(`${docId}:${status}`);
      let rejectionReason = '';
      if (status === 'Rejected') {
        // Native prompt is acceptable here — it's a low-frequency action and
        // a full modal would be overkill for an optional reason field.
        rejectionReason =
          window.prompt('Reason for rejection (optional):') || '';
      }
      const { data } = await api.patch(
        `/members/${memberId}/documents/${docId}`,
        { status, rejectionReason },
      );
      const updated = docs.map((d) =>
        d._id === docId ? { ...d, ...data.document } : d,
      );
      setDocs(updated);
      onChange?.(updated);
      toast.success(`Marked as ${status}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      setActionId(`${docId}:delete`);
      await api.delete(`/members/${memberId}/documents/${docId}`);
      const updated = docs.filter((d) => d._id !== docId);
      setDocs(updated);
      onChange?.(updated);
      toast.success('Document deleted');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 relative overflow-hidden mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Decorative Background */}
      <ShieldCheck className="absolute -right-6 -bottom-6 w-64 h-64 text-primary/5 pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-black tracking-tighter text-foreground">
              KYC &amp; AML Vault
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

      {/* Documents grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {docs.length === 0 ? (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/5">
            <div className="w-16 h-16 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 text-muted-foreground/50">
              <Shield size={32} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">
              Vault is Empty
            </p>
            <p className="text-xs text-muted-foreground/60 max-w-xs mt-2">
              Upload identity documents to ensure KYC compliance.
            </p>
          </div>
        ) : (
          docs.map((doc) => {
            const exp = doc.expiryDate ? new Date(doc.expiryDate) : null;
            const isExpired = exp && exp < new Date();
            const expiresSoon =
              exp &&
              !isExpired &&
              exp.getTime() - Date.now() < 30 * 24 * 3600 * 1000 &&
              doc.status !== 'Expired';
            const statusKey = isExpired ? 'Expired' : doc.status || 'Pending';
            const statusStyle = STATUS_STYLES[statusKey] || STATUS_STYLES.Pending;

            return (
              <div
                key={doc._id}
                className="group flex flex-col p-5 rounded-[2rem] bg-card border border-border/50 hover:border-primary/50 transition-all shadow-sm hover:shadow-md relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shrink-0">
                      <FileBadge size={20} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight text-foreground/80 truncate">
                        {doc.type || 'Document'}
                      </p>
                      <p className="text-[10px] font-bold text-muted-foreground truncate max-w-[140px]">
                        {doc.name || 'Document'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'px-2.5 py-1 rounded-lg border flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest shrink-0',
                      statusStyle,
                    )}
                  >
                    {statusIconFor(statusKey)}
                    {statusKey}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {exp && (
                    <div
                      className={cn(
                        'flex items-center gap-2 text-[10px] font-bold',
                        expiresSoon
                          ? 'text-amber-600'
                          : 'text-muted-foreground/80',
                      )}
                    >
                      {expiresSoon ? (
                        <AlertTriangle size={12} />
                      ) : (
                        <Calendar size={12} />
                      )}
                      {isExpired ? 'Expired: ' : 'Expires: '}
                      {exp.toLocaleDateString()}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60">
                    <Clock size={12} />
                    Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                  </div>
                  {doc.status === 'Rejected' && doc.rejectionReason && (
                    <p className="text-[10px] text-rose-600 italic">
                      Reason: {doc.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-border/30 mt-auto">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/30 hover:bg-primary/10 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Eye size={14} />
                      View
                    </a>
                  )}

                  {doc.status !== 'Verified' && (
                    <Button
                      onClick={() => handleStatus(doc._id, 'Verified')}
                      isLoading={actionId === `${doc._id}:Verified`}
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-colors"
                      title="Mark as Verified"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                  )}

                  {doc.status !== 'Rejected' && (
                    <Button
                      onClick={() => handleStatus(doc._id, 'Rejected')}
                      isLoading={actionId === `${doc._id}:Rejected`}
                      variant="ghost"
                      size="icon"
                      className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-colors"
                      title="Reject Document"
                    >
                      <XCircle size={14} />
                    </Button>
                  )}

                  <Button
                    onClick={() => handleDelete(doc._id)}
                    isLoading={actionId === `${doc._id}:delete`}
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                    title="Delete Document"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload modal */}
      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden">
          <DialogHeader className="p-8 pb-2 border-b border-border/60">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-3">
              <Upload size={20} className="text-primary" />
              Secure Upload
            </DialogTitle>
          </DialogHeader>

          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <FormField
                label="Document Type"
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
              >
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="h-12 rounded-2xl bg-muted/40 dark:bg-white/[0.04] border-border font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Expiration Date (Optional)"
                htmlFor="doc-expiry"
                labelClassName="normal-case tracking-normal px-0 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60"
              >
                <DatePicker
                  id="doc-expiry"
                  value={expiryDate}
                  onChange={setExpiryDate}
                  placeholder="Select date"
                  disabled={uploading}
                  className="h-12 rounded-2xl bg-muted/40 dark:bg-white/[0.04] border-border font-bold focus-visible:ring-primary/50"
                />
              </FormField>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  File Attachment
                </label>
                <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:bg-muted/40 dark:hover:bg-white/5 transition-colors cursor-pointer relative group">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handlePick}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                    {files.length > 0 ? (
                      <>
                        <FileText size={24} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-500">
                          {files.length === 1
                            ? files[0].name
                            : `${files.length} files selected`}
                        </span>
                      </>
                    ) : (
                      <>
                        <Upload size={24} />
                        <span className="text-xs font-bold">Tap to Browse</span>
                        <span className="text-[10px] text-muted-foreground/60">
                          Images or PDF · up to 5 files
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={files.length === 0}
              className="w-full h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest"
            >
              Secure &amp; Upload
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDocumentsSection;
