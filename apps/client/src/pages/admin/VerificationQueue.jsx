import { useState, useEffect } from 'react';
import api from '@/lib/axios';
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import {
  ShieldCheck,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  Loader2,
  FileCheck2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const statusColor = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const VerificationQueue = () => {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchQueue = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/customers/documents/pending');
      setQueue(data);
    } catch (err) {
      toast.error('Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleAction = async (customerId, docId, status) => {
    const key = `${customerId}-${docId}`;
    try {
      setActionLoading((p) => ({ ...p, [key]: true }));
      await api.patch(`/customers/${customerId}/documents/${docId}`, {
        status,
      });
      toast.success(
        `Document ${status === 'Verified' ? 'verified' : 'rejected'} successfully`,
      );
      // Remove from queue
      setQueue((prev) =>
        prev.filter(
          (e) => !(e.customerId === customerId && e.doc._id === docId),
        ),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Verification Center"
        subtitle="Review and verify customer KYC documents"
        icon={<FileCheck2 className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground bg-card rounded-3xl border border-border/50">
            <ShieldCheck
              size={48}
              strokeWidth={1}
              className="mb-4 text-emerald-500"
            />
            <p className="text-sm font-black uppercase tracking-widest">
              All Clear
            </p>
            <p className="text-xs mt-1">
              No documents are pending verification.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              {queue.length} document{queue.length !== 1 ? 's' : ''} awaiting
              review
            </p>
            {queue.map((entry) => {
              const key = `${entry.customerId}-${entry.doc._id}`;
              const isActing = actionLoading[key];
              return (
                <div
                  key={key}
                  className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in"
                >
                  {/* Customer Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm capitalize truncate">
                        {entry.customerName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {entry.customerEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.customerPhone}
                      </p>
                    </div>
                  </div>

                  {/* Document Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {entry.doc.name}
                      </p>
                      <span
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                          statusColor[entry.doc.status],
                        )}
                      >
                        {entry.doc.type}
                      </span>
                    </div>
                  </div>

                  {/* Meta */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock size={12} />
                    {new Date(entry.doc.uploadedAt).toLocaleDateString()}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.doc.url && (
                      <a
                        href={entry.doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="View document"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                    <Button
                      size="sm"
                      disabled={isActing}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 px-3"
                      onClick={() =>
                        handleAction(
                          entry.customerId,
                          entry.doc._id,
                          'Verified',
                        )
                      }
                    >
                      {isActing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <ShieldCheck size={13} />
                      )}
                      <span className="ml-1 text-xs">Verify</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={isActing}
                      className="rounded-xl h-8 px-3"
                      onClick={() =>
                        handleAction(
                          entry.customerId,
                          entry.doc._id,
                          'Rejected',
                        )
                      }
                    >
                      {isActing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <XCircle size={13} />
                      )}
                      <span className="ml-1 text-xs">Reject</span>
                    </Button>
                    <Link
                      to={`/customers/${entry.customerId}`}
                      className="p-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Open customer profile"
                    >
                      Profile
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationQueue;
