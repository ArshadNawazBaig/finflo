import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  FileBadge,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import MemberGuarantorsSkeleton from '@/components/member/MemberGuarantorsSkeleton';
import api from '@/lib/axios';
import { formatCurrency, formatCNIC, capitalize } from '@/lib/utils';
import { toast } from 'sonner';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'completed', label: 'Completed' },
];

const MemberGuarantors = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchMember = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/members/${id}`);
      setMember(data);
    } catch (error) {
      toast.error('Failed to load member details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMember();
  }, [fetchMember]);

  const guarantors = member?.guarantors || [];
  const actingAsGrantor = member?.actingAsGrantor || [];

  // Filter by active tab
  const filteredGuarantors = useMemo(() => {
    if (activeTab === 'all') return guarantors;
    if (activeTab === 'approved') return guarantors.filter((g) => g.status === 'approved');
    if (activeTab === 'pending') return guarantors.filter((g) => g.status === 'pending');
    return guarantors.filter((g) => g.loanStatus === activeTab);
  }, [guarantors, activeTab]);

  const filteredActingAs = useMemo(() => {
    if (activeTab === 'all') return actingAsGrantor;
    if (activeTab === 'approved') return actingAsGrantor.filter((g) => g.status === 'approved');
    if (activeTab === 'pending') return actingAsGrantor.filter((g) => g.status === 'pending');
    return actingAsGrantor.filter((g) => g.loanStatus === activeTab);
  }, [actingAsGrantor, activeTab]);

  // Count for each tab
  const tabCounts = useMemo(() => {
    const allItems = [...guarantors, ...actingAsGrantor];
    return {
      all: allItems.length,
      active: allItems.filter((g) => g.loanStatus === 'active').length,
      pending: allItems.filter((g) => g.status === 'pending').length,
      approved: allItems.filter((g) => g.status === 'approved').length,
      completed: allItems.filter((g) => g.loanStatus === 'completed').length,
    };
  }, [guarantors, actingAsGrantor]);

  if (loading) {
    return <MemberGuarantorsSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      <PageHeader
        title={
          <>
            Guarantor <span className="text-primary">Details</span>
          </>
        }
        description={`Guarantor information for ${capitalize(member?.name || 'member')}`}
        onBack={() => navigate(`/members/${id}`)}
      />

      <div className="space-y-8">
          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-slate-50/40 dark:bg-white/[0.02] text-slate-500 hover:bg-slate-50 dark:hover:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06]'
                }`}
              >
                {tab.label}
                {tabCounts[tab.key] > 0 && (
                  <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[8px] ${
                    activeTab === tab.key
                      ? 'bg-white/20'
                      : 'bg-primary/10 text-primary'
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Guarantors Section */}
          {(filteredGuarantors.length > 0 || activeTab === 'all') && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-blue-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Guarantors
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Members who guarantee this person's loans
                  </p>
                </div>
                <div className="ml-auto px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                  {filteredGuarantors.length}
                </div>
              </div>

              {filteredGuarantors.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGuarantors.map((g, idx) => (
                    <div
                      key={g._id}
                      onClick={() => navigate(`/members/${g._id}`)}
                      className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-blue-500/30 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 font-black text-lg group-hover:bg-blue-500 group-hover:text-white transition-all shadow-sm">
                            {(g.name || '?')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-black capitalize group-hover:text-blue-600 transition-colors">
                              {g.name || 'Unknown'}
                            </h3>
                            <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">
                              {formatCNIC?.(g.cnic) || g.cnic || 'No CNIC'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground/30 group-hover:text-blue-500 transition-colors mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Loan Amount
                          </span>
                          <span className="text-sm font-black">
                            {formatCurrency(g.loanAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              g.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : g.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}
                          >
                            {g.status || 'pending'}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              g.loanStatus === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : g.loanStatus === 'completed'
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 border border-slate-100 dark:border-white/[0.06]'
                            }`}
                          >
                            {g.loanStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/5 flex items-center justify-center">
                    <ShieldCheck size={20} className="text-blue-500/20" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                    {activeTab === 'all'
                      ? "No guarantors assigned to this member's loans"
                      : `No guarantors with "${activeTab}" status`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Acting as Guarantor Section */}
          {(filteredActingAs.length > 0 || activeTab === 'all') && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                  <FileBadge size={20} className="text-purple-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight">
                    Acting as Guarantor
                  </h2>
                  <p className="text-xs text-muted-foreground font-medium">
                    Loans where this member guarantees for others
                  </p>
                </div>
                <div className="ml-auto px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-600 text-[10px] font-black uppercase tracking-widest">
                  {filteredActingAs.length}
                </div>
              </div>

              {filteredActingAs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredActingAs.map((g, idx) => (
                    <div
                      key={g.loanId}
                      onClick={() => navigate(`/loans/${g.loanId}`)}
                      className="p-6 rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] hover:border-purple-500/30 hover:shadow-[0_20px_40px_-20px_rgba(15,23,42,0.15)] transition-all cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 font-black text-lg group-hover:bg-purple-500 group-hover:text-white transition-all shadow-sm">
                            {(g.customerName || '?')[0]?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-sm font-black capitalize group-hover:text-purple-600 transition-colors">
                              {g.customerName}
                            </h3>
                            <p className="text-xs text-muted-foreground/60 mt-0.5 font-medium">
                              Loan Principal
                            </p>
                          </div>
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-muted-foreground/30 group-hover:text-purple-500 transition-colors mt-1"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">
                            Loan Amount
                          </span>
                          <span className="text-sm font-black">
                            {formatCurrency(g.loanAmount)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              g.status === 'approved'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : g.status === 'rejected'
                                  ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                  : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            }`}
                          >
                            {g.status || 'pending'}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                              g.loanStatus === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : g.loanStatus === 'completed'
                                  ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                  : g.loanStatus === 'defaulted'
                                    ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                                    : 'bg-slate-50 dark:bg-white/[0.04] text-slate-500 border border-slate-100 dark:border-white/[0.06]'
                            }`}
                          >
                            {g.loanStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-purple-500/5 flex items-center justify-center">
                    <FileBadge size={24} className="text-purple-500/20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
                    {activeTab === 'all'
                      ? 'This member is not acting as guarantor for any loans'
                      : `No loans with "${activeTab}" status`}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No results at all for current filter */}
          {filteredGuarantors.length === 0 && filteredActingAs.length === 0 && activeTab !== 'all' && (
            <div className="p-16 rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center">
                <ShieldCheck size={28} className="text-muted-foreground/15" />
              </div>
              <div>
                <p className="text-sm font-black text-muted-foreground/60 mb-1">
                  No Results
                </p>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
                  No guarantor records match the "{activeTab}" filter
                </p>
              </div>
              <button
                onClick={() => setActiveTab('all')}
                className="mt-2 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 border border-primary/10 transition-all"
              >
                Show All
              </button>
            </div>
          )}
        </div>
    </div>
  );
};

export default MemberGuarantors;
