import { useState, useEffect } from 'react';
import {
  X,
  Wallet,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  DollarSign,
  Pencil,
  Mail,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import api from '@/lib/axios';
import { formatPKR } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-transparent shadow-none">
        <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-[2.5rem] flex flex-col h-full overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-8 border-b border-border/50 flex justify-between items-center bg-muted/20">
            <div>
              <DialogTitle className="text-3xl font-black tracking-tight">
                {member.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1 text-muted-foreground font-medium">
                <Mail className="w-3.5 h-3.5" />
                <span className="text-sm">{member.email}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-[2rem] bg-muted/40 border border-border/50 space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
                  <Wallet className="w-12 h-12" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                  Current Balance
                </p>
                <p className="text-2xl font-black">
                  {formatPKR(member.currentBalance || 0)}
                </p>
              </div>
              <div className="p-5 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-12 h-12 text-emerald-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">
                  Total Earned
                </p>
                <p className="text-2xl font-black text-emerald-600">
                  {formatPKR(member.totalProfit || 0)}
                </p>
              </div>
              <div className="p-5 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/20 space-y-1 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                  <DollarSign className="w-12 h-12 text-indigo-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 px-1">
                  Total Invested
                </p>
                <p className="text-2xl font-black text-indigo-600">
                  {formatPKR(member.totalInvested || 0)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Actions & Configuration */}
              <div className="space-y-6">
                {/* Profit Rate Configuration */}
                <div className="p-6 rounded-[2rem] bg-muted/30 border border-border/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                      Profit Distribution
                    </h3>
                    {!showProfitRateForm && (
                      <button
                        onClick={() => setShowProfitRateForm(true)}
                        className="p-2 rounded-full hover:bg-background border border-transparent hover:border-border transition-all text-primary group"
                      >
                        <Pencil className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      </button>
                    )}
                  </div>

                  {!showProfitRateForm ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-primary">
                        {member.profitRate ? `${member.profitRate}%` : '0%'}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Monthly ROI
                      </span>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleProfitRateUpdate}
                      className="space-y-4 animate-in fade-in zoom-in-95 duration-500"
                    >
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                          Daily/Monthly Rate (%)
                        </label>
                        <input
                          type="number"
                          value={newProfitRate}
                          onChange={(e) => setNewProfitRate(e.target.value)}
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="e.g. 2.5"
                          className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setShowProfitRateForm(false);
                            setNewProfitRate(member.profitRate || '');
                          }}
                          className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <Button
                          type="submit"
                          variant="gradient"
                          className="px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest"
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
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={() => {
                          setInvestmentType('deposit');
                          setShowInvestmentForm(true);
                        }}
                        variant="success"
                        className="px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 h-auto"
                      >
                        <ArrowUpCircle className="w-5 h-5 mb-1" />
                        Deposit Funds
                      </Button>
                      <Button
                        onClick={() => {
                          setInvestmentType('withdrawal');
                          setShowInvestmentForm(true);
                        }}
                        variant="gradient"
                        className="px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest flex flex-col items-center gap-2 h-auto"
                      >
                        <ArrowDownCircle className="w-5 h-5 mb-1" />
                        Withdraw Funds
                      </Button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleInvestmentSubmit}
                      className="p-6 rounded-[2rem] bg-card border-2 border-primary/20 space-y-5 animate-in slide-in-from-bottom-2 duration-500"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-xl ${investmentType === 'deposit' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-indigo-500/20 text-indigo-500'}`}
                        >
                          {investmentType === 'deposit' ? (
                            <ArrowUpCircle className="w-4 h-4" />
                          ) : (
                            <ArrowDownCircle className="w-4 h-4" />
                          )}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest">
                          {investmentType === 'deposit'
                            ? 'Capital Deposit'
                            : 'Capital Withdrawal'}
                        </h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Amount (Rs.)
                          </label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-muted/20 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                            Transaction Note
                          </label>
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g. Q1 Investment"
                            className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-muted/20 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowInvestmentForm(false)}
                          className="px-8 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
                        >
                          Cancel
                        </button>
                        <Button
                          type="submit"
                          variant={
                            investmentType === 'deposit'
                              ? 'success'
                              : 'gradient'
                          }
                          className="px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-widest"
                        >
                          Process Transaction
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Right Column: History */}
              <div className="space-y-6">
                {/* Investment History */}
                <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50 flex flex-col h-[350px]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-4 flex items-center justify-between">
                    Transaction History
                    <Zap className="w-3 h-3" />
                  </h3>
                  <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                    {investments.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center opacity-50 grayscale">
                        <div className="p-4 rounded-full bg-muted mb-2">
                          <Wallet className="w-8 h-8" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-tighter">
                          No transactions recorded
                        </p>
                      </div>
                    ) : (
                      investments.map((inv) => (
                        <div
                          key={inv._id}
                          className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-background/50 hover:bg-background transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2.5 rounded-xl border border-border/50 ${inv.type === 'deposit' ? 'text-emerald-500' : 'text-indigo-500'}`}
                            >
                              {inv.type === 'deposit' ? (
                                <ArrowUpCircle className="w-4 h-4" />
                              ) : (
                                <ArrowDownCircle className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="text-[11px] font-black uppercase tracking-tight text-foreground truncate max-w-[120px]">
                                {inv.description || inv.type}
                              </div>
                              <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                {new Date(inv.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div
                            className={`text-sm font-black ${inv.type === 'deposit' ? 'text-emerald-600' : 'text-indigo-600'}`}
                          >
                            {inv.type === 'deposit' ? '+' : '-'}
                            {formatPKR(inv.amount)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Profit History */}
                <div className="p-6 rounded-[2rem] bg-muted/20 border border-border/50 flex flex-col h-[200px]">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-4">
                    Earnings Distributed
                  </h3>
                  <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                    {profits.length === 0 ? (
                      <p className="text-[10px] font-black text-muted-foreground text-center py-8 uppercase tracking-widest opacity-50">
                        No yields distributed yet
                      </p>
                    ) : (
                      profits.map((profit) => (
                        <div
                          key={profit._id}
                          className="flex items-center justify-between p-3 rounded-xl border border-border/10 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
                        >
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-tight text-emerald-700">
                              {profit.period}
                            </div>
                            <div className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">
                              {new Date(profit.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-sm font-black text-emerald-600">
                            +{formatPKR(profit.amount)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
