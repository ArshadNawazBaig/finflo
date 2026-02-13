import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  MapPin,
  DollarSign,
  UserPlus,
  ArrowLeft,
  Calendar,
  Clock,
  ChevronRight,
  User,
  Info,
  X,
  CreditCard,
  Briefcase,
  Layers,
  Wallet,
  PlusCircle,
  ShieldCheck,
  FileCheck,
  Download,
  FileBadge,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import RepayLoanModal from '@/components/RepayLoanModal';
import AddLoanModal from '@/components/AddLoanModal';
import api from '@/lib/axios';
import { formatPKR, capitalize } from '@/lib/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import ConvertToMemberModal from '@/components/ConvertToMemberModal';
import VaultTab from '@/components/VaultTab';

import { cn } from '@/lib/utils'; // Make sure to import cn

const CustomerProfileSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="flex justify-between items-center bg-card/30 p-8 rounded-[2.5rem] border border-border/50">
      <div className="space-y-4">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-4 w-48 rounded-lg" />
      </div>
      <Skeleton className="h-12 w-32 rounded-full" />
    </div>
    <div className="grid gap-6 md:grid-cols-3">
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-32 rounded-[2rem] border border-border/50 bg-card/50 shadow-sm" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
      <div className="h-[400px] rounded-[2.5rem] border border-border/50 bg-card/50 shadow-sm" />
    </div>
  </div>
);

const CustomerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showAddLoanModal, setShowAddLoanModal] = useState(false);
  const [selectedRepayLoan, setSelectedRepayLoan] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      const [customerRes, loansRes] = await Promise.all([
        api.get(`/customers/${id}`),
        api.get(`/loans?customerId=${id}`),
      ]);
      setCustomer(customerRes.data);
      setLoans(loansRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch customer data', error);
      toast.error('Failed to load customer profile');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCustomerData();
  }, [fetchCustomerData]);

  if (loading) return <CustomerProfileSkeleton />;
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900/50 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm relative overflow-hidden">
        {/* Decorative Background Icon */}
        <User className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />

        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('/customers')}
            className="p-3 rounded-full hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all group hidden sm:block"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-black tracking-tighter">
                {capitalize(customer.name)}
              </h1>
              {customer.isMember && (
                <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5">
                  <UserPlus size={10} />
                  Member
                </span>
              )}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20">
                <span className="text-amber-500">★</span>
                <span>{(customer.trustRating || 5).toFixed(1)}/10</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Mail className="w-4 h-4 text-primary" />
                {customer.email}
              </div>
              <div className="hidden sm:block w-1 h-1 bg-border rounded-full" />
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="w-4 h-4 text-primary" />
                {customer.phone}
              </div>
              {customer.address && (
                <>
                  <div className="hidden sm:block w-1 h-1 bg-border rounded-full" />
                  <div className="flex items-center gap-1.5 text-sm font-medium">
                    <MapPin className="w-4 h-4 text-primary" />
                    {customer.address}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-col-reverse sm:flex-row">
          {loans.some((l) => l.status === 'active') && (
            <button
              onClick={() => {
                const firstActive = loans.find((l) => l.status === 'active');
                if (firstActive) setSelectedRepayLoan(firstActive);
              }}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <Wallet className="w-3.5 h-3.5" />
              Pay Back Loan
            </button>
          )}
          <button
            onClick={() => setShowAddLoanModal(true)}
            className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Issue Loan
          </button>
          {!customer.isMember && (
            <Button
              onClick={() => setShowMemberForm(true)}
              variant="gradient"
              className="px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest w-full sm:w-auto justify-center gap-2"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Upgrade to Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3">
        <StatsCard
          title="Total Borrowed"
          amount={formatPKR(totalBorrowed)}
          icon={<DollarSign size={18} />}
          color="bg-primary text-primary border-primary/20"
          isGlass
        />
        <StatsCard
          title="Outstanding Balance"
          amount={formatPKR(totalOutstanding)}
          icon={<Briefcase size={18} />}
          color="bg-orange-500 text-orange-600 border-orange-500/20"
          isGlass
        />
        <StatsCard
          title="Total Repaid"
          amount={formatPKR(totalPaid)}
          icon={<Layers size={18} />}
          color="bg-emerald-500 text-emerald-600 border-emerald-500/20"
          isGlass
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/50 pb-1 overflow-x-auto mb-6">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap',
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          Overview & Loans
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={cn(
            'px-6 py-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap flex items-center gap-2',
            activeTab === 'vault'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground',
          )}
        >
          <ShieldCheck size={14} />
          Compliancy Vault
          {customer.documents?.length > 0 && (
            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px]">
              {customer.documents.length}
            </span>
          )}
        </button>
      </div>

      <div className="min-h-[500px]">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-10 animate-in fade-in slide-in-from-bottom-2">
            {/* Main Content Area */}
            <div className="lg:col-span-8 space-y-8">
              {/* Active Loans Registry */}
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6 sm:space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tighter">
                      Loan Portfolio
                    </h3>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">
                      Detailed history of all active and completed loans.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/30">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                </div>

                <div className="space-y-4">
                  {loans.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 dark:text-muted-foreground/80">
                        No Recorded Loans
                      </p>
                    </div>
                  ) : (
                    loans.map((loan) => (
                      <div
                        key={loan._id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 rounded-3xl border border-border/30 bg-muted/5 hover:bg-muted/10 transition-all group gap-4"
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                            <DollarSign size={22} />
                          </div>
                          <div>
                            <div className="text-sm font-black tracking-tight">
                              {formatPKR(loan.principal)}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                                <Clock size={10} />
                                {loan.duration} Months • {loan.rate}% Rate
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:block gap-4 text-right">
                          <div className="text-left md:text-right">
                            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              Remaining
                            </div>
                            <div className="text-base font-black text-orange-500">
                              {formatPKR(loan.remainingAmount)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                              Status
                            </div>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter mt-1 ${
                                loan.status === 'active'
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-muted/50 dark:bg-white/5 text-muted-foreground dark:text-muted-foreground/80'
                              }`}
                            >
                              {loan.status}
                            </span>
                          </div>
                        </div>

                        {loan.status === 'active' && (
                          <div className="flex md:flex-col justify-end gap-2">
                            <button
                              onClick={() => setSelectedRepayLoan(loan)}
                              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20"
                            >
                              <Wallet size={12} />
                              Pay Back
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar Components */}
            <div className="lg:col-span-4 space-y-8">
              {/* Quick Info Card */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 sm:p-10 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/30 relative overflow-hidden group">
                <Briefcase className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                      <Info className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight">
                      Account Insight
                    </h3>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                        Settlement Progress
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-black">
                          {totalBorrowed > 0
                            ? Math.round((totalPaid / totalBorrowed) * 100)
                            : 0}
                          %
                        </span>
                        <span className="text-[9px] font-bold opacity-60">
                          PAID SO FAR
                        </span>
                      </div>
                      <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-1000"
                          style={{
                            width: `${totalBorrowed > 0 ? (totalPaid / totalBorrowed) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-60">
                          Active Loans
                        </div>
                        <div className="text-sm font-black">
                          {loans.filter((l) => l.status === 'active').length}{' '}
                          Units
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[9px] font-black uppercase tracking-widest opacity-60">
                          Credit Rating
                        </div>
                        <div className="text-sm font-black text-emerald-300">
                          Positive
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional & Identity Section */}
              <div className="bg-white dark:bg-slate-900 border border-border/50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                  Professional & Identity
                  <ShieldCheck size={12} />
                </h3>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      National ID (CNIC)
                    </span>
                    <span className="text-sm font-black font-mono">
                      {customer.cnic || 'Not Provided'}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Wallet size={10} className="text-primary" />
                        Saving Account
                      </span>
                      <span className="text-sm font-black font-mono text-primary">
                        {customer.savingAccountNumber || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                        <Wallet size={10} className="text-indigo-500" />
                        Current Account
                      </span>
                      <span className="text-sm font-black font-mono text-indigo-500">
                        {customer.currentAccountNumber || 'Not Assigned'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Job / Role
                      </span>
                      <span className="text-xs font-bold truncate">
                        {customer.job || 'N/A'}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        Avg. Income
                      </span>
                      <span className="text-xs font-black text-emerald-600">
                        {customer.monthlyIncome
                          ? formatPKR(customer.monthlyIncome)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* {customer.documents && customer.documents.length > 0 && (
              <div className="pt-6 border-t border-border/50">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 block">
                  Vault Documents ({customer.documents.length})
                </span>
                <div className="space-y-2">
                  {customer.documents.map((doc, idx) => (
                    <a
                      key={idx}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-primary/5 hover:text-primary transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-card text-muted-foreground group-hover:text-primary transition-colors">
                        <FileCheck size={14} />
                      </div>
                      <span className="text-[10px] font-bold truncate flex-1">
                        {doc.name}
                      </span>
                      <Download
                        size={12}
                        className="opacity-0 group-hover:opacity-100"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )} */}
              </div>

              {/* Contact Details Card */}
              <div className="bg-white dark:bg-slate-900 border border-border/50 p-5 sm:p-8 rounded-[2.5rem] shadow-sm space-y-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-between">
                  Profile Metadata
                  <Mail size={12} />
                </h3>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                    <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Primary Email
                    </div>
                    <div className="text-sm font-bold truncate">
                      {customer.email}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                    <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                      Contact Phone
                    </div>
                    <div className="text-sm font-bold">{customer.phone}</div>
                  </div>
                  {customer.address && (
                    <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
                      <div className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">
                        Registered Address
                      </div>
                      <div className="text-sm font-bold">
                        {customer.address}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <VaultTab
              customerId={customer._id}
              documents={customer.documents}
              onUpdate={fetchCustomerData}
            />
          </div>
        )}
      </div>

      <RepayLoanModal
        isOpen={!!selectedRepayLoan}
        onClose={() => setSelectedRepayLoan(null)}
        loan={selectedRepayLoan}
        onSuccess={fetchCustomerData}
      />

      <AddLoanModal
        isOpen={showAddLoanModal}
        onClose={() => setShowAddLoanModal(false)}
        initialCustomerId={customer._id}
        onSuccess={fetchCustomerData}
      />

      <ConvertToMemberModal
        isOpen={showMemberForm}
        onClose={() => setShowMemberForm(false)}
        customer={customer}
        onSuccess={fetchCustomerData}
      />
    </div>
  );
};

export default CustomerProfile;
