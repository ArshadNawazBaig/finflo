import { useState } from 'react';
import {
  Upload,
  File,
  Trash2,
  ExternalLink,
  Loader2,
  Download,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

const DocumentManager = ({ loanId, documents = [], onUpdate }) => {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max size 5MB.');
      return;
    }

    const formData = new FormData();
    formData.append('document', file);
    formData.append('name', file.name);

    try {
      setUploading(true);
      const { data } = await api.post(`/loans/${loanId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Document uploaded successfully');
      if (onUpdate) onUpdate(data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await api.delete(`/loans/${loanId}/documents/${docId}`);
      toast.success('Document deleted');
      if (onUpdate) {
        // Optimistic UI or just fetch fresh data
        const { data } = await api.get(`/loans/${loanId}`);
        onUpdate(data);
      }
    } catch (error) {
      toast.error('Failed to delete document');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border/50 pb-4 flex-col sm:flex-row gap-4">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-foreground/70">
            Internal Documents
          </h4>
          <p className="text-[10px] text-muted-foreground font-medium mt-1">
            Secure storage for IDs and signed contracts
          </p>
        </div>
        <label className="relative cursor-pointer group w-full sm:w-auto">
          <input
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 disabled:opacity-50 w-full sm:w-auto justify-center">
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Upload size={14} />
            )}
            {uploading ? 'Uploading...' : 'Upload New'}
          </div>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-10 bg-muted/20 rounded-[2rem] border border-dashed border-border/50">
            <File size={32} className="text-muted-foreground/30 mb-2" />
            <p className="text-xs font-bold text-muted-foreground">
              No documents uploaded
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc._id}
              className="group flex items-center justify-between p-4 bg-card/40 border border-border/50 rounded-2xl hover:bg-primary/5 hover:border-primary/20 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <Download size={18} />
                </div>
                <div>
                  <h5 className="text-xs font-bold truncate max-w-[180px]">
                    {doc.name}
                  </h5>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-medium">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${doc.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={() => handleDelete(doc._id)}
                  className="p-2 text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DocumentManager;
