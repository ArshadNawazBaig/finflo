import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Inbox,
  Send,
  Loader2,
  Calendar,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn, formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from 'sonner';

const DISPUTE_STATUS_TONE = {
  open: 'info',
  in_progress: 'warning',
  awaiting_member: 'info',
  resolved: 'success',
  closed: 'neutral',
};
const PRIORITY_COLORS = {
  urgent: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  high: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  medium: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  low: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};
const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  awaiting_member: 'Awaiting member',
  resolved: 'Resolved',
  closed: 'Closed',
};

const StatTile = ({ icon: Icon, label, value, tone = 'neutral' }) => {
  const t = {
    open: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    inProgress: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    awaiting: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    resolved: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    breach: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    neutral: 'bg-slate-500/10 text-slate-600',
  }[tone];
  return (
    <Card className="border-slate-100 dark:border-white/[0.06]">
      <CardContent className="p-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
        <div className={cn('rounded-2xl p-3 shrink-0', t)}>
          <Icon size={18} />
        </div>
      </CardContent>
    </Card>
  );
};

const Disputes = () => {
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [activeDispute, setActiveDispute] = useState(null);
  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      const [{ data: list }, { data: s }] = await Promise.all([
        api.get(`/disputes?${params.toString()}`),
        api.get('/disputes/stats/summary'),
      ]);
      setDisputes(list.disputes || []);
      setStats(s);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openDispute = async (id) => {
    try {
      const { data } = await api.get(`/disputes/${id}`);
      setActiveDispute(data);
      setReply('');
      setResolutionDraft(data.resolution || '');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load dispute');
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmittingReply(true);
    try {
      const { data } = await api.post(`/disputes/${activeDispute._id}/reply`, {
        body: reply.trim(),
      });
      setActiveDispute(data);
      setReply('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  const updateStatus = async (status) => {
    setUpdatingStatus(true);
    try {
      const body = { status };
      if (status === 'resolved') body.resolution = resolutionDraft;
      const { data } = await api.patch(`/disputes/${activeDispute._id}`, body);
      setActiveDispute(data);
      load();
      toast.success(`Status updated to ${STATUS_LABEL[status]}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Member Disputes"
        description="Track and resolve member-filed grievances with SLA-aware deadlines and a full conversation audit trail."
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatTile icon={Inbox} label="Open" value={stats?.open ?? '—'} tone="open" />
        <StatTile icon={Clock} label="In progress" value={stats?.inProgress ?? '—'} tone="inProgress" />
        <StatTile icon={MessageSquare} label="Awaiting member" value={stats?.awaitingMember ?? '—'} tone="awaiting" />
        <StatTile icon={CheckCircle2} label="Resolved (mo)" value={stats?.resolvedThisMonth ?? '—'} tone="resolved" />
        <StatTile icon={AlertTriangle} label="SLA breached" value={stats?.slaBreached ?? '—'} tone="breach" />
      </div>

      <Card className="border-slate-100 dark:border-white/[0.06]">
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="text-base font-extrabold tracking-tight">
            All disputes
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="awaiting_member">Awaiting member</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : disputes.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No disputes"
              description="No tickets match your filters."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {disputes.map((d) => (
                <li
                  key={d._id}
                  className="py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl px-3 transition-colors"
                  onClick={() => openDispute(d._id)}
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {d.ticketNumber}
                    </Badge>
                    <StatusBadge
                      status={d.status}
                      label={STATUS_LABEL[d.status]}
                      tone={DISPUTE_STATUS_TONE[d.status]}
                      className="font-bold"
                    />
                    <Badge className={cn('font-bold', PRIORITY_COLORS[d.priority])}>
                      {d.priority}
                    </Badge>
                    {d.slaBreached && (
                      <Badge className="bg-rose-500 text-white font-bold">SLA breached</Badge>
                    )}
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {d.subject}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {d.member?.name || 'Member'} · filed {formatDate(d.createdAt)} · SLA {formatDate(d.slaDeadline)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!activeDispute} onOpenChange={(o) => !o && setActiveDispute(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {activeDispute && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-500">{activeDispute.ticketNumber}</span>
                  {activeDispute.subject}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <StatusBadge
                    status={activeDispute.status}
                    label={STATUS_LABEL[activeDispute.status]}
                    tone={DISPUTE_STATUS_TONE[activeDispute.status]}
                    className="font-bold"
                  />
                  <Badge className={cn('font-bold', PRIORITY_COLORS[activeDispute.priority])}>
                    {activeDispute.priority}
                  </Badge>
                  <span className="text-xs">
                    {activeDispute.member?.name} · {activeDispute.member?.accountNumber}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="text-xs flex items-center gap-2 text-slate-500">
                  <Calendar size={12} />
                  Filed {formatDate(activeDispute.createdAt)} · SLA deadline {formatDate(activeDispute.slaDeadline)}
                  {activeDispute.slaBreached && (
                    <span className="text-rose-600 font-bold ml-1">· BREACHED</span>
                  )}
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {(activeDispute.messages || []).map((m, i) => (
                    <div
                      key={i}
                      className={cn(
                        'p-3 rounded-2xl border max-w-[85%]',
                        m.authorType === 'staff'
                          ? 'ml-auto bg-primary/5 border-primary/20'
                          : 'bg-slate-50 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]',
                      )}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                        {m.authorName || m.authorType} · {formatDate(m.createdAt)}
                      </p>
                      <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                        {m.body}
                      </p>
                    </div>
                  ))}
                </div>

                {activeDispute.status !== 'closed' && (
                  <div className="space-y-2">
                    <Textarea
                      rows={3}
                      placeholder="Reply to member…"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleReply} disabled={submittingReply || !reply.trim()}>
                        {submittingReply && <Loader2 className="animate-spin mr-2" size={14} />}
                        <Send size={14} className="mr-2" /> Send reply
                      </Button>
                    </div>
                  </div>
                )}

                {activeDispute.status !== 'resolved' && activeDispute.status !== 'closed' && (
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                      Resolve
                    </p>
                    <Textarea
                      rows={2}
                      placeholder="Resolution notes (visible to member)…"
                      value={resolutionDraft}
                      onChange={(e) => setResolutionDraft(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button variant="outline" disabled={updatingStatus} onClick={() => updateStatus('awaiting_member')}>
                        Wait for member
                      </Button>
                      <Button variant="outline" disabled={updatingStatus} onClick={() => updateStatus('in_progress')}>
                        Mark in progress
                      </Button>
                      <Button disabled={updatingStatus} onClick={() => updateStatus('resolved')}>
                        <CheckCircle2 size={14} className="mr-2" /> Mark resolved
                      </Button>
                    </div>
                  </div>
                )}

                {activeDispute.status === 'resolved' && (
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                    <Button variant="outline" disabled={updatingStatus} onClick={() => updateStatus('closed')}>
                      Close ticket
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Disputes;
