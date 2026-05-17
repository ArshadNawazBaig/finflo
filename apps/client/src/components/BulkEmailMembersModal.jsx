import { useEffect, useState } from 'react';
import { Loader2, Mail, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';

const BulkEmailMembersModal = ({ isOpen, onClose }) => {
  const [scope, setScope] = useState('active');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/branches');
        if (!cancelled) setBranches(data?.branches || data || []);
      } catch {
        // Branch list is optional; the modal still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const reset = () => {
    setScope('active');
    setBranchId('');
    setSubject('');
    setBody('');
    setResult(null);
  };

  const handleClose = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Message body is required');
      return;
    }
    if (scope === 'branch' && !branchId) {
      toast.error('Pick a branch');
      return;
    }

    try {
      setSending(true);
      const payload = { scope, subject: subject.trim(), body };
      if (scope === 'branch') payload.branchId = branchId;
      const { data } = await api.post(
        '/communication/bulk-email-members',
        payload,
      );
      setResult(data);
      const { sent = 0, failed = 0, skipped = 0 } = data;
      let msg = `Sent ${sent} email${sent === 1 ? '' : 's'}`;
      if (failed > 0) msg += ` · ${failed} failed`;
      if (skipped > 0) msg += ` · ${skipped} skipped (no email)`;
      (failed > 0 ? toast.warning : toast.success)(msg);
    } catch (err) {
      console.error('Bulk email error:', err);
      toast.error(err?.response?.data?.message || 'Failed to send bulk email');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2rem]">
        <DialogHeader className="p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Mail size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                Bulk Email Members
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground/80 mt-0.5">
                Compose one message and send it to many members at once. Plain text is wrapped in your business-branded template.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-50/30 dark:bg-zinc-900/10">
          {/* Scope */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Recipients
            </Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">All active members</SelectItem>
                <SelectItem value="all">All members (incl. inactive)</SelectItem>
                <SelectItem value="branch">Members in a specific branch</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scope === 'branch' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Branch
              </Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label
              htmlFor="bulk-email-subject"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              Subject
            </Label>
            <input
              id="bulk-email-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="E.g. Reminder: monthly statement available"
              maxLength={200}
              disabled={sending}
              className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {subject.length}/200
            </div>
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label
              htmlFor="bulk-email-body"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              Message
            </Label>
            <Textarea
              id="bulk-email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your message here. Double newlines create paragraphs."
              maxLength={50000}
              disabled={sending}
              rows={10}
              className="resize-y"
            />
            <div className="text-[10px] text-muted-foreground text-right">
              {body.length.toLocaleString()} chars
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div className="p-3 rounded-2xl border border-border/50 bg-background">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Matched
                  </div>
                  <div className="text-lg font-black mt-1">{result.total}</div>
                </div>
                <div className="p-3 rounded-2xl border border-emerald-200/40 bg-emerald-500/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={9} />
                    Sent
                  </div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    {result.sent}
                  </div>
                </div>
                <div className="p-3 rounded-2xl border border-rose-200/40 bg-rose-500/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1">
                    <AlertCircle size={9} />
                    Failed
                  </div>
                  <div className="text-lg font-black text-rose-600 mt-1">
                    {result.failed}
                  </div>
                </div>
                <div className="p-3 rounded-2xl border border-amber-200/40 bg-amber-500/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-amber-600">
                    Skipped
                  </div>
                  <div className="text-lg font-black text-amber-600 mt-1">
                    {result.skipped}
                  </div>
                </div>
              </div>

              {result.results?.filter((r) => !r.ok).length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                  <div className="px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Failures
                  </div>
                  <div className="max-h-40 overflow-y-auto divide-y divide-border/40">
                    {result.results
                      .filter((r) => !r.ok)
                      .map((r, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 flex items-start gap-2 text-xs"
                        >
                          <span className="font-mono text-rose-500 shrink-0 truncate max-w-[200px]">
                            {r.email || '—'}
                          </span>
                          <span className="text-muted-foreground">
                            {r.reason || 'unknown error'}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em]"
          >
            {result ? 'Done' : 'Cancel'}
          </Button>
          <Button
            variant="gradient"
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em] text-white"
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={14} className="mr-2" />
                Send
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkEmailMembersModal;
