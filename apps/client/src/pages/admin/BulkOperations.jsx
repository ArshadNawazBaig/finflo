import { useEffect, useState } from 'react';
import {
  Layers,
  CheckCircle2,
  Send,
  AlertTriangle,
  Loader2,
  Bell,
  Wand2,
} from 'lucide-react';
import api from '@/lib/axios';
import { formatCurrency, cn } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const OPERATIONS = [
  {
    key: 'approve_loans',
    title: 'Bulk Approve Loans',
    description: 'Approve all pending loan requests matching your filter. Each loan is disbursed and the borrower notified.',
    icon: CheckCircle2,
    tone: 'emerald',
  },
  {
    key: 'notify_members',
    title: 'Bulk Notify Members',
    description: 'Push an in-app announcement to a segment of members. Free, instant, no SMTP quota.',
    icon: Bell,
    tone: 'sky',
  },
];

const toneClasses = (tone) => ({
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
}[tone] || 'bg-slate-500/10 text-slate-600');

const BulkOperations = () => {
  const [branches, setBranches] = useState([]);
  const [activeOp, setActiveOp] = useState(null);

  // Approve loans state
  const [scope, setScope] = useState('all');
  const [branchId, setBranchId] = useState('');
  const [maxPrincipal, setMaxPrincipal] = useState('');

  // Notify members state
  const [notifyScope, setNotifyScope] = useState('active');
  const [notifyBranchId, setNotifyBranchId] = useState('');
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [notifyType, setNotifyType] = useState('info');

  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/branches');
        setBranches(data?.branches || data || []);
      } catch {
        // optional
      }
    })();
  }, []);

  const resetState = () => {
    setPreview(null);
    setLastResult(null);
  };

  const handlePreview = async () => {
    setPreviewing(true);
    setPreview(null);
    setLastResult(null);
    try {
      let payload;
      if (activeOp === 'approve_loans') {
        const filter = {};
        if (scope === 'branch' && branchId) filter.branchId = branchId;
        if (maxPrincipal) filter.maxPrincipal = Number(maxPrincipal);
        payload = { operation: 'approve_loans', filter };
      } else if (activeOp === 'notify_members') {
        const filter = { scope: notifyScope };
        if (notifyScope === 'branch' && notifyBranchId) filter.branchId = notifyBranchId;
        payload = { operation: 'notify_members', filter };
      }
      const { data } = await api.post('/bulk-ops/preview', payload);
      setPreview(data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const handleCommit = async () => {
    setCommitting(true);
    try {
      let resp;
      if (activeOp === 'approve_loans') {
        const filter = {};
        if (scope === 'branch' && branchId) filter.branchId = branchId;
        if (maxPrincipal) filter.maxPrincipal = Number(maxPrincipal);
        resp = await api.post('/bulk-ops/approve-loans', { filter, confirm: true });
      } else if (activeOp === 'notify_members') {
        if (!notifyTitle.trim() || !notifyMessage.trim()) {
          toast.error('Title and message are required');
          setCommitting(false);
          return;
        }
        const filter = { scope: notifyScope };
        if (notifyScope === 'branch' && notifyBranchId) filter.branchId = notifyBranchId;
        resp = await api.post('/bulk-ops/notify-members', {
          filter,
          title: notifyTitle.trim(),
          message: notifyMessage.trim(),
          type: notifyType,
          confirm: true,
        });
      }
      setLastResult(resp.data);
      setConfirmOpen(false);
      setPreview(null);
      toast.success('Bulk operation completed');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Operation failed');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Operations"
        description="High-leverage batch actions with preview-before-commit. Pick an operation, configure the scope, review the preview, then commit."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {OPERATIONS.map((op) => {
          const Icon = op.icon;
          const isActive = activeOp === op.key;
          return (
            <Button
              key={op.key}
              variant="ghost"
              onClick={() => {
                setActiveOp(op.key);
                resetState();
              }}
              className={cn(
                'text-left p-5 rounded-2xl border transition-all',
                isActive
                  ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20'
                  : 'border-slate-100 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/[0.1] bg-white dark:bg-white/[0.02]',
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('rounded-2xl p-3 shrink-0', toneClasses(op.tone))}>
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {op.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {op.description}
                  </p>
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {activeOp === 'approve_loans' && (
        <Card className="border-slate-100 dark:border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Wand2 size={16} className="text-primary" /> Configure: Bulk Approve Loans
            </CardTitle>
            <CardDescription>
              Loans with missing terms (rate/duration/EMI) are skipped — fix them individually first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Scope</Label>
                <Select value={scope} onValueChange={(v) => { setScope(v); resetState(); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All branches</SelectItem>
                    <SelectItem value="branch">Specific branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope === 'branch' && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={branchId} onValueChange={(v) => { setBranchId(v); resetState(); }}>
                    <SelectTrigger><SelectValue placeholder="Pick a branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Max principal (optional)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={maxPrincipal}
                  onChange={(e) => { setMaxPrincipal(e.target.value); resetState(); }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeOp === 'notify_members' && (
        <Card className="border-slate-100 dark:border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
              <Wand2 size={16} className="text-primary" /> Configure: Bulk Notify Members
            </CardTitle>
            <CardDescription>
              Members receive an in-app push notification. Cap: 500 per batch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Audience</Label>
                <Select value={notifyScope} onValueChange={(v) => { setNotifyScope(v); resetState(); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">All active members</SelectItem>
                    <SelectItem value="all">All members</SelectItem>
                    <SelectItem value="branch">Specific branch</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {notifyScope === 'branch' && (
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={notifyBranchId} onValueChange={(v) => { setNotifyBranchId(v); resetState(); }}>
                    <SelectTrigger><SelectValue placeholder="Pick a branch" /></SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b._id} value={b._id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={notifyType} onValueChange={setNotifyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={notifyTitle}
                onChange={(e) => setNotifyTitle(e.target.value)}
                placeholder="Office closed Friday"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={notifyMessage}
                onChange={(e) => setNotifyMessage(e.target.value)}
                placeholder="Branches will be closed for Eid on Friday. Online services remain available."
                maxLength={2000}
                rows={5}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeOp && (
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={handlePreview}
            disabled={previewing}
          >
            {previewing ? (
              <Loader2 className="animate-spin mr-2" size={14} />
            ) : (
              <Layers className="mr-2" size={14} />
            )}
            Preview
          </Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!preview || preview.count === 0}
          >
            <Send className="mr-2" size={14} />
            Commit
          </Button>
        </div>
      )}

      {preview && (
        <Card className="border-slate-100 dark:border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-tight flex items-center gap-2">
              Preview
              <Badge variant="secondary" className="ml-2">
                {preview.totalCount.toLocaleString()} matched
              </Badge>
              {preview.capExceeded && (
                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  Cap exceeded — first 500 will be processed
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeOp === 'approve_loans' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PreviewMetric label="Loans to approve" value={preview.count.toLocaleString()} />
                <PreviewMetric label="Total disbursement" value={formatCurrency(preview.totals?.disbursement || 0)} />
              </div>
            )}
            {activeOp === 'notify_members' && (
              <PreviewMetric label="Recipients" value={preview.count.toLocaleString()} />
            )}

            {preview.sample?.length > 0 && (
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 mb-2">
                  Sample ({preview.sample.length})
                </p>
                <ul className="space-y-2">
                  {preview.sample.map((s) => (
                    <li
                      key={s._id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/[0.06]"
                    >
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {s.customerName || s.name || s.accountNumber || s._id}
                      </span>
                      {s.principal != null && (
                        <Badge variant="secondary">{formatCurrency(s.principal)}</Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {lastResult && (
        <Card className="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base font-extrabold tracking-tight text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 size={16} /> Last run result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap break-words">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              Commit this bulk operation?
            </DialogTitle>
            <DialogDescription>
              {activeOp === 'approve_loans' && (
                <>
                  You're about to approve <strong>{preview?.count}</strong> loan(s) and disburse{' '}
                  <strong>{formatCurrency(preview?.totals?.disbursement || 0)}</strong>. This action cannot be batch-reversed.
                </>
              )}
              {activeOp === 'notify_members' && (
                <>
                  Push notification to <strong>{preview?.count}</strong> member(s). They'll be notified instantly.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={committing}>
              Cancel
            </Button>
            <Button onClick={handleCommit} disabled={committing}>
              {committing && <Loader2 className="animate-spin mr-2" size={14} />}
              Yes, commit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const PreviewMetric = ({ label, value }) => (
  <div className="p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.01]">
    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
      {label}
    </p>
    <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
      {value}
    </p>
  </div>
);

export default BulkOperations;
