import { useEffect, useRef, useState } from 'react';
import {
  FileBadge,
  ShieldCheck,
  Upload,
  Loader2,
  XCircle,
  Clock,
  ExternalLink,
  Trash2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormField from '@/components/ui/FormField';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  'CNIC',
  'Selfie',
  'Utility Bill',
  'Tax Return',
  'Proof of Residence',
  'Other',
];

const STATUS_STYLES = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
  Expired: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
};

const MemberDocumentsSection = ({ memberId, documents = [], onChange }) => {
  const fileInputRef = useRef(null);
  const [docs, setDocs] = useState(documents);
  const [type, setType] = useState('CNIC');
  const [expiryDate, setExpiryDate] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [actionId, setActionId] = useState(null);

  useEffect(() => {
    setDocs(documents || []);
  }, [documents]);

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
      setFiles([]);
      setExpiryDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success(
        `Uploaded ${files.length} document${files.length === 1 ? '' : 's'}`,
      );
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
        rejectionReason = window.prompt('Reason for rejection (optional):') || '';
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
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-black tracking-tighter text-primary">
            Document Vault
          </h3>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            KYC documents with expiry tracking. New uploads enter the verification queue.
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-primary/10">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Upload row */}
      <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-muted/10 p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Document Type">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Expiry Date (optional)" htmlFor="doc-expiry">
            <div className="relative">
              <Calendar
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                id="doc-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={uploading}
                className="pl-9 pr-3 py-2 rounded-xl border border-border/60 bg-background focus:ring-2 focus:ring-primary/30 h-auto"
              />
            </div>
          </FormField>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Files
            </label>
            <Button
              variant="ghost"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-xl border border-border/60 bg-background hover:bg-primary/[0.04] hover:border-primary/40 transition-colors font-bold text-muted-foreground"
            >
              <Upload size={14} />
              {files.length > 0 ? `${files.length} selected` : 'Pick files'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              onChange={handlePick}
              className="hidden"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="rounded-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest px-5"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={12} className="mr-1.5" />
                Upload
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Documents list */}
      {docs.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-border/50 bg-muted/10">
          <p className="text-xs text-muted-foreground">No documents on file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => {
            const exp = doc.expiryDate ? new Date(doc.expiryDate) : null;
            const expiresSoon =
              exp && exp.getTime() - Date.now() < 30 * 24 * 3600 * 1000 && doc.status !== 'Expired';
            return (
              <div
                key={doc._id}
                className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <FileBadge size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase tracking-wider truncate">
                        {doc.type || 'Other'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {doc.name || 'Document'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border shrink-0',
                      STATUS_STYLES[doc.status] || STATUS_STYLES.Pending,
                    )}
                  >
                    {doc.status || 'Pending'}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <Clock size={10} />
                  Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
                {exp && (
                  <div
                    className={cn(
                      'flex items-center gap-1 text-[10px] font-bold',
                      expiresSoon ? 'text-amber-600' : 'text-muted-foreground',
                    )}
                  >
                    {expiresSoon ? <AlertTriangle size={10} /> : <Calendar size={10} />}
                    {doc.status === 'Expired' ? 'Expired ' : 'Expires '}
                    {exp.toLocaleDateString()}
                  </div>
                )}
                {doc.status === 'Rejected' && doc.rejectionReason && (
                  <p className="text-[10px] text-rose-600 italic">
                    Reason: {doc.rejectionReason}
                  </p>
                )}

                <div className="flex items-center gap-1.5 pt-2 border-t border-border/40 mt-auto">
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="View"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                  {doc.status !== 'Verified' && (
                    <Button
                      size="sm"
                      onClick={() => handleStatus(doc._id, 'Verified')}
                      disabled={actionId === `${doc._id}:Verified`}
                      className="h-7 rounded-lg px-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest"
                    >
                      <ShieldCheck size={11} className="mr-1" />
                      Verify
                    </Button>
                  )}
                  {doc.status !== 'Rejected' && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleStatus(doc._id, 'Rejected')}
                      disabled={actionId === `${doc._id}:Rejected`}
                      className="h-7 rounded-lg px-2 text-[10px] font-black uppercase tracking-widest"
                    >
                      <XCircle size={11} className="mr-1" />
                      Reject
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => handleDelete(doc._id)}
                    disabled={actionId === `${doc._id}:delete`}
                    className="ml-auto p-1.5 rounded-lg text-rose-500/70 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    title="Delete"
                  >
                    {actionId === `${doc._id}:delete` ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Trash2 size={13} />
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberDocumentsSection;
