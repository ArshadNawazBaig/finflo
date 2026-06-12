import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  AlertTriangle,
  Crown,
  User,
  Star,
  Layers,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import { ProfilePageSkeleton } from '@/components/ui/PageSkeletons';
import { capitalize } from '@/lib/utils';
import GroupStatusBadge from '@/components/groups/GroupStatusBadge';
import GroupLoanCycleCard from '@/components/groups/GroupLoanCycleCard';
import CreateGroupLoanModal from '@/components/groups/CreateGroupLoanModal';
import GroupRepaymentModal from '@/components/groups/GroupRepaymentModal';
import RenewGroupLoanModal from '@/components/groups/RenewGroupLoanModal';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [repaymentLoan, setRepaymentLoan] = useState(null);
  const [renewLoan, setRenewLoan] = useState(null);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/groups/${id}`);
      setGroup(data.group || null);
      setLoans(data.loans || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleApprove = async (groupLoan) => {
    try {
      await api.post(`/groups/loans/${groupLoan._id}/approve`);
      toast.success('Loan cycle approved and disbursed');
      fetchGroup();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve cycle');
    }
  };

  if (loading) {
    return <ProfilePageSkeleton />;
  }

  if (!group) {
    return (
      <div className="p-6">
        <EmptyState
          icon={AlertTriangle}
          title="Group Not Found"
          description="This group does not exist or you do not have access to it."
        />
      </div>
    );
  }

  const isAtRisk = group.status === 'at_risk';
  const members = group.members || [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={capitalize(group.name || 'Group')}
        description="Joint-liability lending group"
        onBack={() => navigate('/groups')}
        badge={<GroupStatusBadge status={group.status} />}
      >
        <Tooltip
          content={
            isAtRisk
              ? 'New cycles are frozen while the group is at risk.'
              : 'Start a new loan cycle for this group'
          }
          position="bottom"
        >
          <span>
            <Button
              onClick={() => setCreateOpen(true)}
              disabled={isAtRisk}
              className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              <Plus size={14} strokeWidth={2.5} />
              New Group Loan
            </Button>
          </span>
        </Tooltip>
      </PageHeader>

      {isAtRisk && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-600 animate-in fade-in zoom-in-95">
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              Joint-Liability Freeze
            </p>
            <p className="text-[11px] font-medium text-red-600/80 leading-relaxed mt-0.5">
              One or more members have fallen behind. Under joint liability the
              whole group is responsible, so new loan cycles are frozen until the
              outstanding balances are brought current.
            </p>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-2xl p-5">
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <User size={15} /> Members · {members.length}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {members.map((m) => {
            const isLeader = m.role === 'leader';
            return (
              <div
                key={m.customer?._id || m.customer}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-background/40"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {isLeader ? <Crown size={15} /> : <User size={15} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold capitalize truncate">
                      {capitalize(m.customer?.name || 'Member')}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium capitalize">
                      {m.role || 'member'} · {m.status || 'active'}
                    </p>
                  </div>
                </div>
                {m.customer?.trustRating != null && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600 shrink-0">
                    <Star size={11} fill="currentColor" />
                    {m.customer.trustRating}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Loan cycles */}
      <div>
        <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
          <Layers size={15} /> Loan Cycles · {loans.length}
        </h2>
        {loans.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Loan Cycles Yet"
            description={
              isAtRisk
                ? 'This group is at risk, so new cycles are frozen.'
                : 'Start the first joint-liability loan cycle for this group.'
            }
            className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem]"
          />
        ) : (
          <div className="space-y-4">
            {loans.map((gl, i) => (
              <GroupLoanCycleCard
                key={gl._id}
                groupLoan={gl}
                index={loans.length - i}
                onApprove={handleApprove}
                onRecordPayment={setRepaymentLoan}
                onRenew={setRenewLoan}
              />
            ))}
          </div>
        )}
      </div>

      <CreateGroupLoanModal
        isOpen={createOpen}
        group={group}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchGroup}
      />

      <GroupRepaymentModal
        isOpen={!!repaymentLoan}
        groupLoan={repaymentLoan}
        onClose={() => setRepaymentLoan(null)}
        onSuccess={fetchGroup}
      />

      <RenewGroupLoanModal
        isOpen={!!renewLoan}
        groupLoan={renewLoan}
        onClose={() => setRenewLoan(null)}
        onSuccess={fetchGroup}
      />
    </div>
  );
};

export default GroupDetail;
