import { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Plus,
  Loader2,
  Send,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import api from '@/lib/axios';
import { cn, formatDate } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'wrong_charge', label: 'Wrong charge / fee' },
  { value: 'missing_credit', label: 'Missing credit / deposit' },
  { value: 'loan_dispute', label: 'Loan dispute' },
  { value: 'statement_error', label: 'Statement error' },
  { value: 'service_complaint', label: 'Service complaint' },
  { value: 'other', label: 'Other' },
];
const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  awaiting_member: 'Awaiting your reply',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_TONE = {
  open: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  in_progress: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  awaiting_member: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  resolved: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  closed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
};

const MemberDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);

  const [active, setActive] = useState(null);
  const [reply, setReply] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/disputes/portal');
      setDisputes(data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load disputes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e) => {
    e?.preventDefault?.();
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/disputes/portal', {
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
      });
      toast.success('Dispute filed. We will get back to you shortly.');
      setIsNewOpen(false);
      setSubject('');
      setDescription('');
      setCategory('other');
      setPriority('medium');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  const openDispute = async (id) => {
    try {
      const { data } = await api.get(`/disputes/portal/${id}`);
      setActive(data);
      setReply('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load dispute');
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmittingReply(true);
    try {
      const { data } = await api.post(`/disputes/portal/${active._id}/reply`, {
        body: reply.trim(),
      });
      setActive(data);
      setReply('');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setSubmittingReply(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="Disputes"
        description="Raise a concern about a charge, transaction, or service. Our team responds within the SLA window."
      >
        <Button onClick={() => setIsNewOpen(true)}>
          <Plus size={14} className="mr-2" /> New dispute
        </Button>
      </PageHeader>

      <Card className="border-slate-100 dark:border-white/[0.06]">
        <CardHeader>
          <CardTitle className="text-base font-extrabold tracking-tight">
            Your tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : disputes.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No disputes yet"
              description="Use 'New dispute' to raise a concern. We track every ticket against an SLA."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/[0.06]">
              {disputes.map((d) => (
                <li
                  key={d._id}
                  className="py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] rounded-xl px-3 transition-colors"
                  onClick={() => openDispute(d._id)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {d.ticketNumber}
                    </Badge>
                    <Badge className={cn('font-bold', STATUS_TONE[d.status])}>
                      {STATUS_LABEL[d.status]}
                    </Badge>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {d.subject}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Filed {formatDate(d.createdAt)}
                    {d.resolvedAt ? ` · Resolved ${formatDate(d.resolvedAt)}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>File a new dispute</DialogTitle>
            <DialogDescription>
              Describe what happened in detail. Reference dates, amounts, and account numbers where possible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Wrong fee on my saving account"
                maxLength={200}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="On Mar 12 I was charged Rs. 500 as a service fee on my saving account. I believe this is incorrect because…"
                maxLength={5000}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="animate-spin mr-2" size={14} />}
                Submit dispute
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {active && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-slate-500">{active.ticketNumber}</span>
                  {active.subject}
                </DialogTitle>
                <DialogDescription>
                  <Badge className={cn('font-bold', STATUS_TONE[active.status])}>
                    {STATUS_LABEL[active.status]}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {(active.messages || []).map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-3 rounded-2xl border max-w-[85%]',
                      m.authorType === 'member'
                        ? 'ml-auto bg-primary/5 border-primary/20'
                        : 'bg-slate-50 dark:bg-white/[0.03] border-slate-100 dark:border-white/[0.06]',
                    )}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {m.authorType === 'member' ? 'You' : (m.authorName || 'Support')} · {formatDate(m.createdAt)}
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-100">
                      {m.body}
                    </p>
                  </div>
                ))}
              </div>

              {active.status === 'resolved' && active.resolution && (
                <div className="p-3 rounded-2xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-500/10 dark:border-emerald-500/30">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Resolution
                  </p>
                  <p className="mt-1 text-sm text-emerald-900 dark:text-emerald-100 whitespace-pre-wrap">
                    {active.resolution}
                  </p>
                </div>
              )}

              {active.status !== 'closed' && active.status !== 'resolved' && (
                <div className="space-y-2 pt-2">
                  <Textarea
                    rows={3}
                    placeholder="Reply…"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleReply} disabled={submittingReply || !reply.trim()}>
                      {submittingReply && <Loader2 className="animate-spin mr-2" size={14} />}
                      <Send size={14} className="mr-2" /> Send
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDisputes;
