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
      <DialogContent className="sm:max-w-[600px] max-h-[95vh] p-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">
              Customer Details
            </DialogTitle>
            <DialogDescription className="text-sm font-medium">
              Complete information for{' '}
              <span className="text-foreground font-bold">
                {capitalize(customer.name)}
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <div className="space-y-6">
            {/* Member Status Badge */}
            {customer.isMember && (
              <div className="bg-primary/10 border border-primary/20 rounded-[1.5rem] p-4 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="p-2 bg-primary/20 rounded-xl">
                  <UserPlus className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-bold text-primary">
                  This customer is also a member
                </span>
              </div>
            )}

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-[1.5rem] bg-muted/30 border border-border/50 space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Contact Information
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 group">
                    <div className="p-1.5 rounded-lg bg-background border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                      <Mail className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium truncate">
                      {customer.email}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 group">
                    <div className="p-1.5 rounded-lg bg-background border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-sm font-medium">
                      {customer.phone}
                    </span>
                  </div>
                  {customer.address && (
                    <div className="flex items-center gap-2.5 group">
                      <div className="p-1.5 rounded-lg bg-background border border-border/50 text-muted-foreground group-hover:text-primary transition-colors">
                        <MapPin className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium">
                        {customer.address}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Loan Summary Mini Stats */}
              <div className="p-4 rounded-[1.5rem] bg-muted/30 border border-border/50 space-y-3">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Loan Overview
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Borrowed
                    </p>
                    <p className="text-sm font-black">
                      {formatCurrency(totalBorrowed)}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Outstanding
                    </p>
                    <p className="text-sm font-black text-orange-500">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Professional & Identity */}
            <div className="p-4 rounded-[1.5rem] bg-muted/30 border border-border/50 space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                Professional & Identity
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-b border-border/10 pb-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    CNIC Number
                  </p>
                  <p className="text-sm font-black font-mono">
                    {customer.cnic}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    Monthly Income
                  </p>
                  <p className="text-sm font-black text-emerald-600">
                    {customer.monthlyIncome
                      ? formatCurrency(customer.monthlyIncome)
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1 col-span-2 md:col-span-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    Occupation
                  </p>
                  <p className="text-sm font-black capitalize">
                    {customer.job || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter px-1">
                    Job Detail & Office Address
                  </p>
                  <p className="text-xs font-medium text-muted-foreground leading-relaxed px-1">
                    {customer.jobDetail || 'No details provided'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter px-1">
                    Customer Signature
                  </p>
                  <div className="relative h-48 w-full md:w-1/2 rounded-2xl border border-border/50 bg-background overflow-hidden group">
                    {customer.signature ? (
                      <img
                        src={customer.signature}
                        alt="Customer Signature"
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 bg-muted/10">
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          No Signature
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Loans Table-like view */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">
                Active Loans ({loans.length})
              </h3>
              {loading ? (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed text-muted-foreground text-sm font-medium animate-pulse">
                  Loading loans...
                </div>
              ) : loans.length === 0 ? (
                <div className="p-8 text-center bg-muted/20 rounded-2xl border border-dashed text-muted-foreground text-sm font-medium">
                  No active loans found
                </div>
              ) : (
                <div className="space-y-2">
                  {loans.map((loan) => (
                    <div
                      key={loan._id}
                      className="group flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 border border-border/50 rounded-2xl transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-background border border-border/50 text-indigo-500">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-black">
                            {formatCurrency(loan.principal)}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                            {loan.rate}% • {loan.duration} months
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                          Remaining
                        </p>
                        <p className="text-sm font-black text-orange-500">
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
              <div className="p-4 rounded-[1.5rem] bg-amber-500/5 border border-amber-500/20 space-y-3">
                <h3 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                  Nominee Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Nominee Name
                    </p>
                    <p className="text-sm font-black capitalize">
                      {customer.nominee?.name || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Nominee CNIC
                    </p>
                    <p className="text-sm font-black font-mono">
                      {customer.nominee?.cnic || 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Relation
                    </p>
                    <p className="text-sm font-black capitalize">
                      {customer.nominee?.relation || 'N/A'}
                    </p>
                  </div>
                </div>

                {customer.nominee?.cnicImage && (
                  <div className="pt-3 border-t border-amber-500/10 space-y-2">
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                      Nominee CNIC Image
                    </p>
                    <a
                      href={customer.nominee.cnicImage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block relative h-32 w-full rounded-xl border border-amber-500/20 bg-white overflow-hidden group/cnic"
                    >
                      <img
                        src={customer.nominee.cnicImage}
                        alt="Nominee CNIC"
                        className="w-full h-full object-contain p-2 group-hover/cnic:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/cnic:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-[10px] text-white font-black uppercase tracking-widest">
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
                variant="gradient"
                className="w-full px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em]"
              >
                <UserPlus className="w-4 h-4" />
                Upgrade to Member
              </Button>
            )}

            {showMemberForm && (
              <form
                onSubmit={handleMakeMember}
                className="space-y-5 p-6 border border-primary/20 rounded-[1.5rem] bg-primary/5 animate-in fade-in zoom-in-95 duration-500"
              >
                <h3 className="text-sm font-black uppercase tracking-widest text-primary">
                  Member Onboarding
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
                      className="w-full px-4 py-2.5 border border-border/50 rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
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
                      className="w-full px-4 py-2.5 border border-border/50 rounded-xl bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm font-medium transition-all"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowMemberForm(false)}
                    className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    variant="gradient"
                    disabled={memberLoading}
                    className="px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-2"
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
