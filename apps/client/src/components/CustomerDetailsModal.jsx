import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { formatPKR } from '@/lib/utils';
import { Mail, Phone, MapPin, DollarSign, UserPlus } from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';

const CustomerDetailsModal = ({ isOpen, onClose, customer, onUpdate }) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [memberData, setMemberData] = useState({
    initialInvestment: '',
    profitRate: '',
  });

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
      <DialogContent className="sm:max-w-[600px] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black">
            Customer Details
          </DialogTitle>
          <DialogDescription className="text-sm font-medium">
            Complete information for{' '}
            <span className="text-foreground font-bold">{customer.name}</span>
          </DialogDescription>
        </DialogHeader>

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
                  <span className="text-sm font-medium">{customer.phone}</span>
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
                    {formatPKR(totalBorrowed)}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">
                    Outstanding
                  </p>
                  <p className="text-sm font-black text-orange-500">
                    {formatPKR(totalOutstanding)}
                  </p>
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
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
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
                          {formatPKR(loan.principal)}
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
                        {formatPKR(loan.remainingAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Make Member Section */}
          {!customer.isMember && !showMemberForm && (
            <button
              onClick={() => setShowMemberForm(true)}
              className="w-full bg-gradient-to-r from-primary to-indigo-600 text-white shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:brightness-110 px-8 py-4 rounded-full text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all duration-300 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              Upgrade to Member
            </button>
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
                    placeholder="Rs. 0.00"
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
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:brightness-110 px-8 py-3 rounded-full text-[11px] font-black uppercase tracking-widest transition-all active:scale-95"
                >
                  Confirm Membership
                </button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDetailsModal;
