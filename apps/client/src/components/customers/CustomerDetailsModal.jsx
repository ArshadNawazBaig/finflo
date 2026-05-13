import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatCurrency, capitalize } from '@/lib/utils';
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  UserPlus,
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const CustomerDetailsModal = ({ isOpen, onClose, customer, onUpdate }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberData, setMemberData] = useState({
    initialInvestment: '',
    profitRate: '',
  });
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    const fetchCustomerLoans = async () => {
      if (!customer) return;

      setLoading(true);
      try {
        // Fetch loans for this specific customer using query parameter
        const { data } = await api.get(`/loans?customerId=${customer._id}`);
        setLoans(data.data || []);
      } catch (error) {
        console.error('Failed to fetch loans', error);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchCustomerLoans();
      setShowMemberForm(false);
      setMemberData({ initialInvestment: '', profitRate: '' });
    }
  }, [customer, isOpen]);

  const handleMakeMember = async (e) => {
    e.preventDefault();
    setMemberLoading(true);
    try {
      await api.post('/members', {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        initialInvestment: parseFloat(memberData.initialInvestment) || 0,
        profitRate: parseFloat(memberData.profitRate) || 0,
        customerId: customer._id,
      });
      toast.success('Customer converted to member successfully!');
      setShowMemberForm(false);
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create member');
    } finally {
      setMemberLoading(false);
    }
  };

  if (!customer) return null;

  const totalBorrowed = loans.reduce((sum, loan) => sum + loan.totalAmount, 0);
  const totalPaid = loans.reduce(
    (sum, loan) => sum + (loan.paidAmount || 0),
    0,
  );
  const totalOutstanding = loans.reduce(
    (sum, loan) => sum + loan.remainingAmount,
    0,
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 sm:p-7 pb-5 border-b border-slate-100 dark:border-white/[0.06] z-10">
          <DialogHeader>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-1.5">
              Customer profile
            </p>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription className="mt-1">
              Complete information for{' '}
              <span className="text-slate-900 dark:text-white font-bold">
                {capitalize(customer.name)}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-7 custom-scrollbar">
          <div className="space-y-5">
            {/* Member Status Badge */}
            {customer.isMember && (
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-primary/5 p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
                  <UserPlus />
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary">
                  This customer is also a member
                </span>
              </div>
            )}

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Contact Information
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 group">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 group-hover:text-primary flex items-center justify-center transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <Mail />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {customer.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 group">
                    <div className="h-8 w-8 rounded-full bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 group-hover:text-primary flex items-center justify-center transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5">
                      <Phone />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {customer.phone}
                    </span>
                  </div>
                  {customer.address && (
                    <div className="flex items-center gap-2.5 group">
                      <div className="h-8 w-8 rounded-full bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 group-hover:text-primary flex items-center justify-center transition-colors [&_svg]:w-3.5 [&_svg]:h-3.5">
                        <MapPin />
                      </div>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {customer.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Summary Mini Stats */}
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                  Loan Overview
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Borrowed
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(totalBorrowed)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Outstanding
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums text-amber-500 dark:text-amber-400">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional & Identity */}
            <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-4 space-y-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1">
                Professional & Identity
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-slate-100 dark:border-white/[0.06] pb-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    CNIC Number
                  </p>
                  <p className="text-sm font-extrabold tracking-tight tabular-nums font-mono text-slate-900 dark:text-white">
                    {customer.cnic}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Monthly Income
                  </p>
                  <p className="text-sm font-extrabold tracking-tight tabular-nums text-emerald-500 dark:text-emerald-400">
                    {customer.monthlyIncome
                      ? formatCurrency(customer.monthlyIncome)
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                    Occupation
                  </p>
                  <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
                    {customer.job || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1">
                    Job Detail & Office Address
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed px-1">
                    {customer.jobDetail || 'No details provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1">
                    Customer Signature
                  </p>
                  <div className="relative h-48 w-full md:w-1/2 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden group">
                    {customer.signature ? (
                      <img
                        src={customer.signature}
                        alt="Customer Signature"
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                        <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
                          No Signature
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Loans Table-like view */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 px-1">
                Active Loans ({loans.length})
              </h3>
              {loading ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 text-sm font-medium animate-pulse">
                  Loading loans...
                </div>
              ) : loans.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 text-sm font-medium">
                  No active loans found
                </div>
              ) : (
                <div className="space-y-2">
                  {loans.map((loan) => (
                    <div
                      key={loan._id}
                      className="group flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.04] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center [&_svg]:w-3.5 [&_svg]:h-3.5">
                          <DollarSign />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                            {formatCurrency(loan.principal)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                            {loan.rate}% • {loan.duration} months
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.15em]">
                          Remaining
                        </p>
                        <p className="text-sm font-extrabold tracking-tight tabular-nums text-amber-500 dark:text-amber-400">
                          {formatCurrency(loan.remainingAmount)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nominee Details */}
            {(customer.nominee?.name ||
              customer.nominee?.cnic ||
              customer.nominee?.relation) && (
              <div className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-amber-500/5 p-4 space-y-3">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                  Nominee Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Nominee Name
                    </p>
                    <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
                      {customer.nominee?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Nominee CNIC
                    </p>
                    <p className="text-sm font-extrabold tracking-tight tabular-nums font-mono text-slate-900 dark:text-white">
                      {customer.nominee?.cnic || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Relation
                    </p>
                    <p className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white capitalize">
                      {customer.nominee?.relation || 'N/A'}
                    </p>
                  </div>
                </div>

                {customer.nominee?.cnicImage && (
                  <div className="pt-3 border-t border-amber-500/10 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                      Nominee CNIC Image
                    </p>
                    <a
                      href={customer.nominee.cnicImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative h-32 w-full rounded-2xl border border-amber-500/20 bg-white overflow-hidden group/cnic"
                    >
                      <img
                        src={customer.nominee.cnicImage}
                        alt="Nominee CNIC"
                        className="w-full h-full object-contain p-2 group-hover/cnic:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cnic:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] text-white font-bold uppercase tracking-[0.15em]">
                          View Full Image
                        </p>
                      </div>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Make Member Section */}
            {!customer.isMember && !showMemberForm && (
              <Button
                onClick={() => setShowMemberForm(true)}
                className="w-full h-11 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
              >
                <UserPlus className="w-4 h-4" />
                Upgrade to Member
              </Button>
            )}

            {showMemberForm && (
              <form
                onSubmit={handleMakeMember}
                className="space-y-5 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-primary/5 animate-in fade-in zoom-in-95 duration-500"
              >
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Member Onboarding
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Initial Investment
                    </label>
                    <input
                      type="number"
                      value={memberData.initialInvestment}
                      onChange={(e) =>
                        setMemberData({
                          ...memberData,
                          initialInvestment: e.target.value,
                        })
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 block">
                      Profit Rate (%)
                    </label>
                    <input
                      type="number"
                      value={memberData.profitRate}
                      onChange={(e) =>
                        setMemberData({
                          ...memberData,
                          profitRate: e.target.value,
                        })
                      }
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 2.5"
                      className="w-full rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-slate-100 dark:border-white/[0.06] pt-5">
                  <button
                    type="button"
                    onClick={() => setShowMemberForm(false)}
                    className="px-5 py-3 rounded-full text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-all"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    disabled={memberLoading}
                    className="h-11 px-7 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2"
                  >
                    {memberLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Membership'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsModal;
