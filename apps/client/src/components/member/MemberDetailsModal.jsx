import { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Pencil,
  Mail,
  Zap,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { formatCurrency, capitalize, cn } from '@/lib/utils';
import { isCreditType } from '@/lib/transactionDirection';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FormField from '@/components/ui/FormField';

const MemberDetailsModal = ({ member, isOpen, onClose, onUpdate }) => {
  const [investments, setInvestments] = useState([]);
  const [profits, setProfits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvestmentForm, setShowInvestmentForm] = useState(false);
  const [showProfitRateForm, setShowProfitRateForm] = useState(false);
  const [investmentType, setInvestmentType] = useState('deposit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [newProfitRate, setNewProfitRate] = useState('');
  const [recalcLoading, setRecalcLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      fetchMemberData();
      setNewProfitRate(member.profitRate || '');
    }
  }, [isOpen, member]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      const [investmentsRes, profitsRes] = await Promise.all([
        api.get(`/members/${member._id}/investments`),
        api.get(`/members/${member._id}/profits`),
      ]);
      setInvestments(investmentsRes.data || []);
      setProfits(profitsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch member data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvestmentSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = investmentType === 'deposit' ? 'invest' : 'withdraw';
      await api.post(`/members/${member._id}/${endpoint}`, {
        amount: parseFloat(amount),
        description,
      });
      toast.success(
        `${investmentType === 'deposit' ? 'Investment added' : 'Withdrawal processed'} successfully`,
      );
      setAmount('');
      setDescription('');
      setShowInvestmentForm(false);
      fetchMemberData();
      onUpdate();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleProfitRateUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/members/${member._id}`, {
        profitRate: parseFloat(newProfitRate) || 0,
      });
      toast.success('Profit rate updated successfully');
      setShowProfitRateForm(false);
      onUpdate();
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to update profit rate',
      );
    }
  };

  const handleRecalcBalance = async () => {
    try {
      setRecalcLoading(true);
      const res = await api.post('/members/recalculate-balance', {
        memberId: member._id,
      });
      const result = res.data.results?.[0];
      if (result) {
        toast.success(
          `Balance reconciled: ${formatCurrency(result.oldBalance)} → ${formatCurrency(result.newBalance)}`,
        );
      } else {
        toast.success('Balance recalculated successfully');
      }
      onUpdate();
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Failed to recalculate balance',
      );
    } finally {
      setRecalcLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px]">
        {/* Header */}
        <div className="pr-8">
          <DialogTitle className="text-2xl sm:text-3xl">
            {member.name ? capitalize(member.name) : 'Member Profile'}
          </DialogTitle>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" />
              <span className="text-sm font-mono">{member.cnic}</span>
            </div>
            {member.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary" />
                <span className="text-sm">{member.email}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                <Wallet className="w-10 h-10" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1.5">
                Current Balance
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(member.currentBalance || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                <TrendingUp className="w-10 h-10 text-emerald-500" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-600 dark:text-emerald-400 mb-1.5">
                Total Earned
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(member.totalProfit || 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                <DollarSign className="w-10 h-10 text-indigo-500" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400 mb-1.5">
                Total Invested
              </p>
              <p className="text-2xl font-extrabold tracking-tight tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatCurrency(member.totalInvested || 0)}
              </p>
            </div>
          </div>

          {/* Professional & Identity */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-5 space-y-5">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
              Professional & Identity
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5 border-b border-slate-100 dark:border-white/[0.06] pb-5">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  CNIC Number
                </p>
                <p className="text-base font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white font-mono">
                  {member.cnic}
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Monthly Income
                </p>
                <p className="text-base font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                  {member.monthlyIncome
                    ? formatCurrency(member.monthlyIncome)
                    : 'N/A'}
                </p>
              </div>
              <div className="space-y-1.5 col-span-2 md:col-span-1">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Occupation
                </p>
                <p className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white capitalize line-clamp-1">
                  {member.job || 'N/A'}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Job Detail & Office Address
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {member.jobDetail || 'No details provided'}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Member Signature
                </p>
                <div className="relative h-48 w-full md:w-1/2 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden group">
                  {member.signature ? (
                    <img
                      src={member.signature}
                      alt="Member Signature"
                      className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-600">
                      <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                        No Signature Found
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Actions & Configuration */}
            <div className="space-y-5">
              {/* Profit Rate Configuration */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Profit Distribution
                  </h3>
                  {!showProfitRateForm && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowProfitRateForm(true)}
                      className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all group"
                    >
                      <Pencil className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    </Button>
                  )}
                </div>

                {!showProfitRateForm ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold tracking-tight tabular-nums text-primary">
                      {member.profitRate ? `${member.profitRate}%` : '0%'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Monthly ROI
                    </span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleProfitRateUpdate}
                    className="space-y-4 animate-in fade-in zoom-in-95 duration-500"
                  >
                    <FormField
                      label="Daily/Monthly Rate (%)"
                      htmlFor="member-profit-rate"
                      labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                    >
                      <Input
                        id="member-profit-rate"
                        type="number"
                        value={newProfitRate}
                        onChange={(e) => setNewProfitRate(e.target.value)}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="e.g. 2.5"
                        className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                      />
                    </FormField>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setShowProfitRateForm(false);
                          setNewProfitRate(member.profitRate || '');
                        }}
                        className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                      >
                        Update Rate
                      </Button>
                    </div>
                  </form>
                )}
              </div>

              {/* Investment Actions */}
              <div className="space-y-3">
                {!showInvestmentForm ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          setInvestmentType('deposit');
                          setShowInvestmentForm(true);
                        }}
                        className="px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 h-auto bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <ArrowUpCircle className="w-5 h-5 mb-1" />
                        Deposit Funds
                      </Button>
                      <Button
                        onClick={() => {
                          setInvestmentType('withdrawal');
                          setShowInvestmentForm(true);
                        }}
                        className="px-4 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-1 h-auto bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                      >
                        <ArrowDownCircle className="w-5 h-5 mb-1" />
                        Withdraw Funds
                      </Button>
                    </div>
                    {/* Balance Reconciliation */}
                    <Button
                      variant="ghost"
                      onClick={handleRecalcBalance}
                      disabled={recalcLoading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-primary/30 text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <RefreshCw
                        size={13}
                        className={recalcLoading ? 'animate-spin' : ''}
                      />
                      {recalcLoading
                        ? 'Syncing...'
                        : 'Sync Balance from Ledger'}
                    </Button>
                  </>
                ) : (
                  <form
                    onSubmit={handleInvestmentSubmit}
                    className="rounded-2xl border border-primary/20 bg-white dark:bg-white/[0.02] p-5 space-y-4 animate-in slide-in-from-bottom-2 duration-500"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5',
                          investmentType === 'deposit'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-indigo-500/10 text-indigo-500',
                        )}
                      >
                        {investmentType === 'deposit' ? (
                          <ArrowUpCircle />
                        ) : (
                          <ArrowDownCircle />
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {investmentType === 'deposit'
                          ? 'Capital Deposit'
                          : 'Capital Withdrawal'}
                      </h3>
                    </div>

                    <div className="space-y-3">
                      <FormField
                        label="Amount"
                        htmlFor="member-investment-amount"
                        labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                      >
                        <Input
                          id="member-investment-amount"
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-extrabold tracking-tight tabular-nums focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                        />
                      </FormField>
                      <FormField
                        label="Transaction Note"
                        htmlFor="member-investment-note"
                        labelClassName="normal-case tracking-normal px-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400"
                      >
                        <Input
                          id="member-investment-note"
                          type="text"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="e.g. Q1 Investment"
                          className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 font-medium focus:ring-2 focus:ring-primary/20 transition-all h-auto"
                        />
                      </FormField>
                    </div>

                    <div className="border-t border-slate-100 dark:border-white/[0.06] pt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowInvestmentForm(false)}
                        className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className={cn(
                          'h-11 px-7 rounded-full font-bold text-sm text-white hover:-translate-y-0.5 transition-all duration-300',
                          investmentType === 'deposit'
                            ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_10px_30px_-10px_rgba(16,185,129,0.5)]'
                            : 'bg-primary hover:bg-primary/90 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)]',
                        )}
                      >
                        Process Transaction
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Right Column: History */}
            <div className="space-y-5">
              {/* Investment History */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-5 flex flex-col h-[350px]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-4 flex items-center justify-between">
                  Transaction History
                  <Zap className="w-3 h-3" />
                </h3>
                <div className="flex-1 space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
                  {investments.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center mb-2 [&_svg]:w-3.5 [&_svg]:h-3.5 text-slate-500 dark:text-slate-400">
                        <Wallet />
                      </div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                        No transactions recorded
                      </p>
                    </div>
                  ) : (
                    investments.map((inv) => {
                      const isCredit = isCreditType(inv.type);
                      return (
                      <div
                        key={inv._id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'h-8 w-8 rounded-full flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5',
                              isCredit
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-indigo-500/10 text-indigo-500',
                            )}
                          >
                            {isCredit ? <ArrowUpCircle /> : <ArrowDownCircle />}
                          </div>
                          <div>
                            <div className="text-xs font-extrabold tracking-tight text-slate-900 dark:text-white truncate max-w-[120px]">
                              {inv.description || inv.type}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                              {new Date(inv.date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div
                          className={cn(
                            'text-sm font-extrabold tracking-tight tabular-nums',
                            isCredit
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-indigo-600 dark:text-indigo-400',
                          )}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(inv.amount)}
                        </div>
                      </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Profit History */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-5 flex flex-col h-[200px]">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-4">
                  Earnings Distributed
                </h3>
                <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                  {profits.length === 0 ? (
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 text-center py-8 uppercase tracking-[0.15em]">
                      No yields distributed yet
                    </p>
                  ) : (
                    profits.map((profit) => (
                      <div
                        key={profit._id}
                        className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                      >
                        <div>
                          <div className="text-xs font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
                            {profit.period}
                          </div>
                          <div className="text-[10px] font-bold text-emerald-600/60 dark:text-emerald-400/70 uppercase tracking-[0.15em]">
                            {new Date(profit.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-sm font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(profit.amount)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDetailsModal;
