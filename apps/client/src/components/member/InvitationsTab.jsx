/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import { Mail, Send, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { formatDate } from '@/lib/formatters';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import { Button } from '@/components/ui/button';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import { capitalize } from '@/lib/utils';

/**
 * Lists email invitations for the current tenant with resend / revoke row
 * actions. Self-contained: owns its own fetch + pagination so the parent
 * Members page only needs to mount it (and bump `refreshKey` after a new
 * invite is sent to force a refetch).
 */
const InvitationsTab = ({ refreshKey = 0 }) => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [resendingId, setResendingId] = useState(null);
  const [revokeId, setRevokeId] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const fetchInvites = useCallback(
    async (page = currentPage) => {
      try {
        setLoading(true);
        const { data } = await api.get(
          `/members/invites?page=${page}&limit=${limit}`,
        );
        setInvites(data.data || []);
        setTotalEntries(data.totalEntries || 0);
        setTotalPages(data.totalPages || 0);
        setCurrentPage(data.currentPage || page);
      } catch (error) {
        toast.error(
          error.response?.data?.message || 'Failed to load invitations',
        );
      } finally {
        setLoading(false);
      }
    },
    [currentPage, limit],
  );

  useEffect(() => {
    fetchInvites(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, refreshKey]);

  const handleResend = async (id) => {
    try {
      setResendingId(id);
      await api.post(`/members/invites/${id}/resend`);
      toast.success('Invitation resent');
      fetchInvites();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to resend invitation',
      );
    } finally {
      setResendingId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeId) return;
    try {
      setIsRevoking(true);
      await api.delete(`/members/invites/${revokeId}`);
      toast.success('Invitation revoked');
      setRevokeId(null);
      fetchInvites();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to revoke invitation',
      );
    } finally {
      setIsRevoking(false);
    }
  };

  // An expired pending invite reads as "expired" for tone/label purposes.
  const displayStatus = (invite) =>
    invite.status === 'pending' && invite.isExpired ? 'expired' : invite.status;

  const columns = [
    {
      key: 'email',
      header: 'Email',
      className: 'font-medium',
      render: (row) => row.email,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={displayStatus(row)} />,
    },
    {
      key: 'invitedByName',
      header: 'Invited By',
      render: (row) => capitalize(row.invitedByName) || '—',
    },
    {
      key: 'createdAt',
      header: 'Sent',
      render: (row) => formatDate(row.createdAt),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (row) => formatDate(row.expiresAt),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => {
        const isPending = row.status === 'pending';
        if (!isPending) return null;
        return (
          <div className="flex items-center justify-end gap-2">
            {!row.isExpired && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleResend(row._id)}
                isLoading={resendingId === row._id}
                className="gap-1.5 text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10"
              >
                <Send size={14} />
                Resend
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRevokeId(row._id)}
              className="gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 dark:hover:text-rose-400"
            >
              <Trash2 size={14} />
              Revoke
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
      <DataTable
        columns={columns}
        data={invites}
        loading={loading}
        rowKey={(row) => row._id}
        emptyState={{
          icon: Mail,
          title: 'No Invitations Yet',
          description:
            'Invite members by email to send them a secure sign-up link.',
        }}
      />

      {!loading && totalEntries > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalEntries={totalEntries}
          limit={limit}
          onPageChange={(page) => fetchInvites(page)}
          onLimitChange={(newLimit) => setLimit(newLimit)}
        />
      )}

      <ConfirmActionModal
        isOpen={!!revokeId}
        onClose={() => setRevokeId(null)}
        onConfirm={handleRevoke}
        loading={isRevoking}
        title="Revoke Invitation"
        description="Are you sure you want to revoke this invitation? The sign-up link will stop working immediately."
        confirmText="Revoke Invitation"
        variant="danger"
      />
    </div>
  );
};

export default InvitationsTab;
