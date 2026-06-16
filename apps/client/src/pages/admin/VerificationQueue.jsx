import { useState } from 'react';
import api from '@/lib/axios';
import useApi from '@/hooks/useApi';
import PageHeader from '@/components/PageHeader';
import { RegistryPageSkeleton } from '@/components/ui/PageSkeletons';
import { toast } from 'sonner';
import {
  ShieldCheck,
  XCircle,
  FileText,
  Clock,
  ExternalLink,
  FileCheck2,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const statusColor = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const VerificationQueue = () => {
  // useApi owns the GET-on-mount lifecycle (loading + AbortController cleanup,
  // which this page previously lacked); setData backs the optimistic removal
  // in handleAction. The endpoint returns the array directly as the body.
  const {
    data: queueData,
    loading,
    setData: setQueue,
  } = useApi('/customers/documents/pending', {
    errorMessage: 'Failed to load verification queue',
  });
  const queue = queueData ?? [];
  const [actionLoading, setActionLoading] = useState({});

  const handleAction = async (entry, status) => {
    const docId = entry.doc._id;
    const key = `${entry.entityId || entry.customerId}-${docId}`;
    // Route to the correct controller based on which entity owns the doc.
    // Member docs uploaded directly via the member portal aren't mirrored
    // onto a Customer record, so the customer endpoint would 404 on them.
    const basePath =
      entry.entityType === 'member' ? '/members' : '/customers';
    const entityId = entry.entityId || entry.customerId;
    try {
      setActionLoading((p) => ({ ...p, [key]: true }));
      await api.patch(`${basePath}/${entityId}/documents/${docId}`, {
        status,
      });
      toast.success(
        `Document ${status === 'Verified' ? 'verified' : 'rejected'} successfully`,
      );
      setQueue((prev) =>
        prev.filter(
          (e) =>
            !(
              (e.entityId || e.customerId) === entityId &&
              e.doc._id === docId
            ),
        ),
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading((p) => ({ ...p, [key]: false }));
    }
  };

  if (loading && queue.length === 0) {
    return <RegistryPageSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Verification Center"
        description="Review and verify customer KYC documents, identity proofs, and account applications to maintain system integrity."
        icon={<FileCheck2 className="w-5 h-5 text-primary" />}
      />

      <div className="flex-1 p-6 space-y-4 overflow-auto">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center bg-white dark:bg-white/[0.02] rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
            <ShieldCheck
              size={40}
              strokeWidth={1.5}
              className="mb-4 text-emerald-500"
            />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Status
            </p>
            <p className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mt-1">
              All Clear
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
              No documents are pending verification.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {queue.length} document{queue.length !== 1 ? 's' : ''} awaiting
              review
            </p>
            {queue.map((entry) => {
              const entityId = entry.entityId || entry.customerId;
              const key = `${entityId}-${entry.doc._id}`;
              const isActing = actionLoading[key];
              const isMember = entry.entityType === 'member';
              const expiry = entry.doc.expiryDate
                ? new Date(entry.doc.expiryDate)
                : null;
              const expirySoon =
                expiry && expiry.getTime() - Date.now() < 30 * 24 * 3600 * 1000;
              return (
                <div
                  key={key}
                  className="bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] rounded-[1.5rem] p-5 flex flex-col sm:flex-row sm:items-center gap-4 animate-in fade-in"
                >
                  {/* Customer Info */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm capitalize truncate">
                          {entry.customerName}
                        </p>
                        <span
                          className={cn(
                            'text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border',
                            isMember
                              ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                              : 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                          )}
                        >
                          {isMember ? 'Member' : 'Customer'}
                        </span>
                      </div>
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
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      Uploaded{' '}
                      {new Date(entry.doc.uploadedAt).toLocaleDateString()}
                    </div>
                    {expiry && (
                      <div
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border',
                          expirySoon
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-slate-500/10 text-slate-600 border-slate-500/20',
                        )}
                      >
                        Expires {expiry.toLocaleDateString()}
                      </div>
                    )}
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
                      isLoading={isActing}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-8 px-3"
                      onClick={() => handleAction(entry, 'Verified')}
                    >
                      <ShieldCheck size={13} />
                      <span className="ml-1 text-xs">Verify</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      isLoading={isActing}
                      className="rounded-xl h-8 px-3"
                      onClick={() => handleAction(entry, 'Rejected')}
                    >
                      <XCircle size={13} />
                      <span className="ml-1 text-xs">Reject</span>
                    </Button>
                    <Link
                      to={
                        isMember
                          ? `/members/${entityId}`
                          : `/customers/${entityId}`
                      }
                      className="p-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title={
                        isMember ? 'Open member profile' : 'Open customer profile'
                      }
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
