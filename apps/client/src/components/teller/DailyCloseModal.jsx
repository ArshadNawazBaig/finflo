import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Lock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Download,
  FileText,
  Banknote,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';

// Denominations are shown high-to-low so tellers stack the largest notes
// first (matches counter-top muscle memory).
const DENOMS = [5000, 1000, 500, 100, 50, 20, 10, 5, 2, 1];

const DailyCloseModal = ({
  isOpen,
  onClose,
  cashSummary,
  cashbookDate,
  denomCounts: initialDenoms,
  branchId = null,
  branchName = null,
  cashTransactions = [],
  user = null,
  onClosed,
}) => {
  const [denoms, setDenoms] = useState(initialDenoms || {});
  const [notes, setNotes] = useState('');
  const [closing, setClosing] = useState(false);
  const [existingClose, setExistingClose] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  // Two-step submit when the count looks like a "forgot to count" mistake:
  // first click flips this flag and surfaces the inline warning; second
  // click actually submits. Cleared whenever the count changes so the
  // teller doesn't accidentally bypass with stale confirmation.
  const [confirmZeroCount, setConfirmZeroCount] = useState(false);

  // Seed denominations from the parent each time the modal opens — keeps
  // the form in sync with the cash-counter screen the teller just used.
  useEffect(() => {
    if (isOpen) {
      setDenoms(initialDenoms || {});
      setNotes('');
    }
  }, [isOpen, initialDenoms]);

  // Check if this day already has a close on file so the teller knows
  // they're recording a re-close (supersede). When one exists, seed the
  // form from the stored values so the variance display reflects the
  // *recorded* close — not a fresh count against zero, which would falsely
  // alarm "CASH SHORT" by the full expected balance.
  useEffect(() => {
    if (!isOpen || !cashbookDate) return;
    let cancelled = false;
    (async () => {
      try {
        setLoadingExisting(true);
        const params = { date: cashbookDate.toISOString() };
        if (branchId) params.branchId = branchId;
        const { data } = await api.get('/ledger/daily-close', { params });
        if (cancelled) return;
        const close = data?.close || null;
        setExistingClose(close);
        if (close) {
          setDenoms(close.denominations || {});
          setNotes(close.notes || '');
        }
      } catch {
        if (!cancelled) setExistingClose(null);
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, cashbookDate, branchId]);

  const countedTotal = useMemo(
    () => DENOMS.reduce((sum, d) => sum + d * Number(denoms[`d${d}`] || 0), 0),
    [denoms],
  );
  const expected = cashSummary?.closingCash ?? 0;
  const variance = countedTotal - expected;
  const varianceState =
    variance === 0 ? 'balanced' : variance > 0 ? 'over' : 'short';

  const updateDenom = (d, value) => {
    const n = Math.max(0, Math.floor(Number(value) || 0));
    setDenoms((prev) => ({ ...prev, [`d${d}`]: n }));
    // Any edit invalidates a pending zero-count confirmation.
    if (confirmZeroCount) setConfirmZeroCount(false);
  };

  // True when the form looks like a "forgot to count" mistake: no notes
  // counted, but the system expects real cash on hand.
  const looksLikeUncountedSubmission =
    countedTotal === 0 && expected !== 0;

  const handleClose = () => {
    if (closing) return;
    onClose();
  };

  const handleCloseDay = async () => {
    if (looksLikeUncountedSubmission && !confirmZeroCount) {
      // First click on a zero-count submission: warn and require a second
      // click to confirm. Prevents the "I closed but it still shows short"
      // foot-gun we hit when the form is empty on first open.
      setConfirmZeroCount(true);
      return;
    }
    try {
      setClosing(true);
      const payload = {
        date: cashbookDate.toISOString(),
        denominations: denoms,
        countedClosing: countedTotal,
        notes,
      };
      if (branchId) payload.branchId = branchId;
      const { data } = await api.post('/ledger/daily-close', payload);
      toast.success(
        variance === 0
          ? 'Day closed — cash drawer balanced'
          : `Day closed — ${variance > 0 ? 'over' : 'short'} by ${formatCurrency(
              Math.abs(variance),
            )}`,
      );
      onClosed?.(data.close);
      // Auto-generate the close report. Best-effort — failure doesn't undo
      // the close, since the record is already persisted on the server.
      try {
        const { exportEndOfDayReport } = await import('@/lib/pdfExportUtils');
        await exportEndOfDayReport({
          close: data.close,
          transactions: cashTransactions,
          branchName,
          user,
        });
      } catch (pdfErr) {
        console.error('EOD PDF generation failed:', pdfErr);
        toast.error('Close saved, but PDF export failed');
      }
      onClose();
    } catch (err) {
      console.error('closeDay error:', err);
      toast.error(err?.response?.data?.message || 'Failed to close day');
    } finally {
      setClosing(false);
    }
  };

  const handleReprint = async () => {
    if (!existingClose) return;
    try {
      const { exportEndOfDayReport } = await import('@/lib/pdfExportUtils');
      await exportEndOfDayReport({
        close: existingClose,
        transactions: cashTransactions,
        branchName,
        user,
      });
    } catch (err) {
      console.error('Re-print failed:', err);
      toast.error('Failed to re-print EOD report');
    }
  };

  const varianceColor =
    varianceState === 'balanced'
      ? 'text-emerald-600'
      : varianceState === 'over'
        ? 'text-blue-600'
        : 'text-rose-600';
  const varianceBg =
    varianceState === 'balanced'
      ? 'bg-emerald-500/10 border-emerald-500/20'
      : varianceState === 'over'
        ? 'bg-blue-500/10 border-blue-500/20'
        : 'bg-rose-500/10 border-rose-500/20';

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2rem]">
        <DialogHeader className="p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Lock size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                End-of-Day Close
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground/80 mt-0.5">
                {format(cashbookDate || new Date(), 'EEEE, MMMM dd, yyyy')}
                {branchName ? ` · ${branchName}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-50/30 dark:bg-zinc-900/10">
          {/* Existing close banner — surfaces the recorded variance so the
              teller immediately understands the prior close state. */}
          {existingClose && !loadingExisting && (() => {
            const recordedVariance = Math.round(existingClose.variance ?? 0);
            const recordedState =
              recordedVariance === 0
                ? 'balanced'
                : recordedVariance > 0
                  ? 'over'
                  : 'short';
            const recordedLabel =
              recordedState === 'balanced'
                ? 'Balanced'
                : recordedState === 'over'
                  ? `Over by ${formatCurrency(Math.abs(recordedVariance))}`
                  : `Short by ${formatCurrency(Math.abs(recordedVariance))}`;
            return (
              <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/[0.06]">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-700">
                    Day already closed — {recordedLabel}
                  </p>
                  <p className="text-[11px] text-amber-700/80">
                    Closed by{' '}
                    <span className="font-bold">
                      {existingClose.closedByName ||
                        existingClose.closedBy?.name ||
                        'unknown'}
                    </span>{' '}
                    on{' '}
                    {format(
                      new Date(existingClose.closedAt),
                      'MMM dd, yyyy hh:mm a',
                    )}
                    . The counts below are seeded from that close — update
                    them and submit again to supersede the prior record.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprint}
                  className="shrink-0 rounded-full text-[10px] font-black uppercase tracking-widest gap-1.5"
                >
                  <Download size={11} />
                  Re-print
                </Button>
              </div>
            );
          })()}

          {/* Cash position summary */}
          <div className="rounded-2xl border border-border/50 bg-background p-5 space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Cash Position
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Opening', value: cashSummary?.openingCash || 0, tone: 'text-amber-600' },
                { label: 'Cash In', value: cashSummary?.cashIn || 0, tone: 'text-emerald-600' },
                { label: 'Cash Out', value: cashSummary?.cashOut || 0, tone: 'text-rose-600' },
                { label: 'Expected', value: expected, tone: 'text-indigo-600' },
              ].map((row) => (
                <div key={row.label} className="space-y-1.5">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    {row.label}
                  </div>
                  <div className={`text-base font-extrabold tabular-nums ${row.tone}`}>
                    {formatCurrency(row.value)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Denomination input grid */}
          <div className="rounded-2xl border border-border/50 bg-background p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Banknote size={12} />
                Count by Denomination
              </div>
              <div className="text-xs font-bold tabular-nums">
                Total: <span className="text-foreground">{formatCurrency(countedTotal)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {DENOMS.map((d) => {
                const count = Number(denoms[`d${d}`] || 0);
                const subtotal = count * d;
                return (
                  <div
                    key={d}
                    className="rounded-xl border border-border/50 bg-muted/20 p-3 space-y-1.5"
                  >
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Rs. {d.toLocaleString()}
                    </div>
                    <Input
                      type="number"
                      min={0}
                      value={count || ''}
                      onChange={(e) => updateDenom(d, e.target.value)}
                      disabled={closing}
                      className="h-auto bg-transparent text-base font-extrabold tabular-nums border-0 px-0 py-0 rounded-none"
                      placeholder="0"
                    />
                    <div className="text-[10px] font-bold text-muted-foreground tabular-nums">
                      = {formatCurrency(subtotal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variance display */}
          <div
            className={`flex items-center justify-between gap-4 p-5 rounded-2xl border ${varianceBg}`}
          >
            <div className="flex items-center gap-3">
              {varianceState === 'balanced' ? (
                <CheckCircle2 size={22} className="text-emerald-600" />
              ) : varianceState === 'over' ? (
                <TrendingUp size={22} className="text-blue-600" />
              ) : (
                <TrendingDown size={22} className="text-rose-600" />
              )}
              <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${varianceColor}`}>
                  {varianceState === 'balanced'
                    ? 'Balanced'
                    : varianceState === 'over'
                      ? 'Cash Over'
                      : 'Cash Short'}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  Counted − Expected
                </div>
              </div>
            </div>
            <div className={`text-2xl font-black tabular-nums ${varianceColor}`}>
              {variance > 0 ? '+' : variance < 0 ? '−' : ''}
              {formatCurrency(Math.abs(variance))}
            </div>
          </div>

          {/* Zero-count confirmation banner */}
          {confirmZeroCount && (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/[0.06]">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-rose-700">
                  Did you forget to count?
                </p>
                <p className="text-[11px] text-rose-700/80">
                  The drawer count is Rs.&nbsp;0 but the system expects{' '}
                  <span className="font-bold">{formatCurrency(expected)}</span>.
                  Submitting will record a variance of{' '}
                  <span className="font-bold">
                    −{formatCurrency(expected)}
                  </span>{' '}
                  (full short). Either enter the denominations above, or click{' '}
                  <span className="font-bold">Confirm Close</span> again if
                  the drawer really is empty.
                </p>
              </div>
            </div>
          )}

          {/* Variance notes */}
          <div className="space-y-2">
            <Label
              htmlFor="close-notes"
              className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              Notes {varianceState !== 'balanced' && '(recommended for variance)'}
            </Label>
            <Textarea
              id="close-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                varianceState === 'balanced'
                  ? 'Optional remarks about the close.'
                  : 'Explain the over/short — e.g. miscounted change, unrecorded petty cash, etc.'
              }
              maxLength={1000}
              disabled={closing}
              rows={3}
              className="resize-y"
            />
          </div>
        </div>

        <div className="p-6 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={closing}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em]"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            onClick={handleCloseDay}
            disabled={closing}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em] text-white"
          >
            {closing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Closing...
              </>
            ) : confirmZeroCount ? (
              <>
                <AlertTriangle size={14} className="mr-2" />
                Confirm Close
              </>
            ) : (
              <>
                <FileText size={14} className="mr-2" />
                {existingClose ? 'Re-Close & Re-Print' : 'Close & Export PDF'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCloseModal;
