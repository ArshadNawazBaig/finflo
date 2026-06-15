import { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  PiggyBank,
  Landmark,
  Pause,
  Play,
  Trash2,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import StatusBadge from '@/components/ui/StatusBadge';

const MemberScheduledPayments = ({ member }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchPayments = async () => {
    try {
      const { data } = await api.get('/scheduled-payments');
      setPayments(data);
    } catch {
      // Silently fail on first load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handlePauseResume = async (id, currentStatus) => {
    setActionLoading(id);
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.put(`/scheduled-payments/${id}`, { status: newStatus });
      toast.success(
        `Schedule ${newStatus === 'active' ? 'resumed' : 'paused'}`,
      );
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm('Are you sure you want to cancel this scheduled payment?')
    )
      return;
    setActionLoading(id);
    try {
      await api.delete(`/scheduled-payments/${id}`);
      toast.success('Scheduled payment cancelled');
      fetchPayments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to cancel');
    } finally {
      setActionLoading(null);
    }
  };

  const activeCount = payments.filter((p) => p.status === 'active').length;

  return (
    <div className="rounded-[2rem] bg-card p-6 sm:p-8 border border-border/50 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl  text-white bg-gradient-to-br from-indigo-500 to-violet-600">
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Scheduled Payments
            </p>
            <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">
              {activeCount} active schedule{activeCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl text-[10px] font-black uppercase tracking-widest gap-1.5"
        >
          <Plus size={14} />
          New
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto">
            <CalendarClock size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">
            No scheduled payments yet
          </p>
          <p className="text-[10px] font-medium text-muted-foreground/60">
            Set up automatic monthly saving deposits or loan repayments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment) => {
            const Icon =
              payment.type === 'saving_deposit' ? PiggyBank : Landmark;
            const nextDate = payment.nextExecutionDate
              ? new Date(payment.nextExecutionDate).toLocaleDateString(
                  'en-PK',
                  {
                    day: 'numeric',
                    month: 'short',
                  },
                )
              : '—';

            return (
              <div
                key={payment._id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-border/40 hover:bg-muted/10 transition-all group"
              >
                <div
                  className={cn(
                    'p-2.5 rounded-xl',
                    payment.type === 'saving_deposit'
                      ? 'bg-teal-500/10 text-teal-600'
                      : 'bg-blue-500/10 text-blue-600',
                  )}
                >
                  <Icon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate">
                    {payment.type === 'saving_deposit'
                      ? 'Saving Deposit'
                      : 'Loan Repayment'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {formatCurrency(payment.amount)} / month
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground/50">
                      •
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar size={9} /> Day {payment.dayOfMonth}
                    </span>
                  </div>
                  {payment.failureReason && (
                    <p className="text-[9px] font-bold text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle size={9} />
                      {payment.failureReason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge
                    status={payment.status}
                    tone={
                      payment.status === 'completed' ? 'info' : undefined
                    }
                  />

                  {payment.status !== 'completed' && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(payment.status === 'active' ||
                        payment.status === 'paused' ||
                        payment.status === 'failed') && (
                        <Button
                          variant="ghost"
                          onClick={() =>
                            handlePauseResume(payment._id, payment.status)
                          }
                          disabled={actionLoading === payment._id}
                          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground transition-colors"
                          title={
                            payment.status === 'active' ? 'Pause' : 'Resume'
                          }
                        >
                          {actionLoading === payment._id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : payment.status === 'active' ? (
                            <Pause size={14} />
                          ) : (
                            <Play size={14} />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => handleDelete(payment._id)}
                        disabled={actionLoading === payment._id}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <CreateScheduleModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchPayments();
        }}
        member={member}
      />
    </div>
  );
};

const CreateScheduleModal = ({ isOpen, onClose, onSuccess, member }) => {
  const [type, setType] = useState('saving_deposit');
  const [amount, setAmount] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) return toast.error('Enter a valid amount');

    setLoading(true);
    try {
      await api.post(
        '/scheduled-payments',
        {
          type,
          amount: parseFloat(amount),
          sourceAccount: 'current',
          dayOfMonth: parseInt(dayOfMonth),
          description: `Monthly ${type === 'saving_deposit' ? 'saving deposit' : 'loan repayment'}`,
        },
        {},
      );
      toast.success('Scheduled payment created!');
      setAmount('');
      setDayOfMonth(1);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        <div className="p-6 border-b z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
                <CalendarClock className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  New Schedule
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Set up a monthly automatic payment.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <form
            id="create-schedule-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Type */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Payment Type
              </label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setType('saving_deposit')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    type === 'saving_deposit'
                      ? 'border-teal-500 bg-teal-500/5 text-teal-600'
                      : 'border-border/50 text-muted-foreground hover:bg-muted/30',
                  )}
                >
                  <PiggyBank size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Saving
                  </span>
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => setType('loan_repayment')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all',
                    type === 'loan_repayment'
                      ? 'border-blue-500 bg-blue-500/5 text-blue-600'
                      : 'border-border/50 text-muted-foreground hover:bg-muted/30',
                  )}
                >
                  <Landmark size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Loan
                  </span>
                </Button>
              </div>
            </div>

            {/* Amount */}
            <FormField label="Monthly Amount" htmlFor="schedule-amount">
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-lg">
                  Rs.
                </span>
                <Input
                  id="schedule-amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-14 rounded-2xl bg-background border-border/50 text-xl font-bold pl-14 pr-6 shadow-none"
                  min="1"
                />
              </div>
            </FormField>

            {/* Day of Month */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Day of Month (1–28)
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                  <Button
                    variant="ghost"
                    key={day}
                    type="button"
                    onClick={() => setDayOfMonth(day)}
                    className={cn(
                      'h-9 rounded-xl text-xs font-bold transition-all',
                      dayOfMonth === day
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-muted/20 text-muted-foreground hover:bg-muted/40',
                    )}
                  >
                    {day}
                  </Button>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="p-6 border-t  z-10 flex justify-end gap-3">
          <Button
            variant="ghost"
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </Button>
          <Button
            form="create-schedule-form"
            type="submit"
            isLoading={loading}
            disabled={!amount}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            <CheckCircle2 size={16} />
            Create Schedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberScheduledPayments;
