import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  ShieldCheck,
  Eye,
  Loader2,
  FileText,
  Landmark,
  Save,
  Clock,
} from 'lucide-react';
import TablePagination from '@/components/ui/table-pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';
import {
  formatFullCurrency as formatCurrency,
  formatCompactValue,
  cn,
} from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const ROWS_PER_PAGE = 10;

const RegulatoryTab = () => {
  const [ifrs9Data, setIfrs9Data] = useState(null);
  const [basel3Data, setBasel3Data] = useState(null);
  const [regulatoryLoading, setRegulatoryLoading] = useState(false);
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [savedSnapshots, setSavedSnapshots] = useState([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [snapshotPage, setSnapshotPage] = useState(1);

  const fetchSavedSnapshots = async () => {
    try {
      setLoadingSnapshots(true);
      const { data } = await api.get('/reports/snapshots');
      setSavedSnapshots(data);
    } catch (error) {
      toast.error('Failed to fetch saved snapshots');
    } finally {
      setLoadingSnapshots(false);
    }
  };

  useEffect(() => {
    fetchSavedSnapshots();
  }, []);

  const generateIFRS9 = async () => {
    try {
      setRegulatoryLoading(true);
      const { data } = await api.get('/reports/ifrs9');
      setIfrs9Data(data);
      toast.success('IFRS 9 Report Generated');
    } catch (error) {
      toast.error('Failed to generate IFRS 9 Report');
    } finally {
      setRegulatoryLoading(false);
    }
  };

  const generateBasel3 = async () => {
    try {
      setRegulatoryLoading(true);
      const { data } = await api.get('/reports/basel3');
      setBasel3Data(data);
      toast.success('Basel III Report Generated');
    } catch (error) {
      toast.error('Failed to generate Basel III Report');
    } finally {
      setRegulatoryLoading(false);
    }
  };

  const handleSaveSnapshot = async (type) => {
    try {
      setSavingSnapshot(true);
      const isIfrs9 = type === 'ifrs9';
      const dataToSave = isIfrs9 ? ifrs9Data : basel3Data;

      const defaultTitle = `${isIfrs9 ? 'IFRS 9' : 'Basel III'} Snapshot - ${new Date().toLocaleDateString()}`;
      const title = prompt(`Enter a title for this snapshot:`, defaultTitle);

      if (!title) return;

      await api.post('/reports/snapshots', {
        title,
        reportType: type,
        snapshotData: dataToSave,
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
      });

      toast.success('Snapshot saved successfully');
      fetchSavedSnapshots();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save snapshot');
    } finally {
      setSavingSnapshot(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      {/* IFRS 9 Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="p-8 pb-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-1.5 mb-3 w-fit">
                  <FileText size={10} />
                  Risk Standard
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">
                  IFRS 9 Reporting
                </CardTitle>
                <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5">
                  Calculate Expected Credit Loss (ECL) based on Probability
                  of Default (PD) and Loss Given Default (LGD).
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={generateIFRS9}
                  isLoading={regulatoryLoading}
                  title="Generate Report"
                  className="rounded-full h-12 w-12 p-0 bg-indigo-500 hover:bg-indigo-600 shadow-xl shadow-indigo-500/20"
                >
                  <ShieldCheck className="h-5 w-5" />
                </Button>
                {ifrs9Data && (
                  <Button
                    onClick={() => handleSaveSnapshot('ifrs9')}
                    isLoading={savingSnapshot}
                    variant="outline"
                    title="Save Snapshot"
                    className="rounded-full h-12 w-12 p-0 border-indigo-500/30 text-indigo-500 hover:bg-indigo-500/10"
                  >
                    <Save className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 relative space-y-6">
            {regulatoryLoading ? (
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-24 rounded-[1.5rem]" />
                  <Skeleton className="h-24 rounded-[1.5rem]" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 rounded-full" />
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-16 rounded-2xl" />
                    ))}
                  </div>
                </div>
              </div>
            ) : ifrs9Data ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/70 mb-1">
                      Total Exposure
                    </div>
                    <div className="text-lg font-black text-indigo-700 dark:text-indigo-400">
                      {formatCurrency(ifrs9Data.meta.totalExposure)}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-500/70 mb-1">
                      Expected Credit Loss
                    </div>
                    <div className="text-lg font-black text-rose-600">
                      {formatCurrency(ifrs9Data.meta.totalECL)}
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                    Risk Breakdown
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(ifrs9Data.gradeBreakdown).map(
                      ([grade, metrics]) => (
                        <div
                          key={grade}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center text-xs font-black">
                              {grade}
                            </span>
                            <div>
                              <div className="text-xs font-bold">
                                {metrics.count} Application(s)
                              </div>
                              <div className="text-[10px] text-muted-foreground font-medium">
                                Exp: {formatCompactValue(metrics.exposure)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-rose-500">
                              {formatCompactValue(metrics.ecl)}
                            </div>
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                              ECL
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                <FileText size={48} strokeWidth={1} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">
                  No Report Generated
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Basel III Section */}
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="p-8 pb-4 relative">
            <div className="flex items-start justify-between">
              <div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] inline-flex items-center gap-1.5 mb-3 w-fit">
                  <Landmark size={10} />
                  Capital Logic
                </div>
                <CardTitle className="text-2xl font-black tracking-tight">
                  Basel III Adequacy
                </CardTitle>
                <CardDescription className="text-sm font-medium text-muted-foreground mt-1.5">
                  Assess capital adequacy ratios (CAR) and risk-weighted
                  assets (RWA) compliance.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={generateBasel3}
                  isLoading={regulatoryLoading}
                  title="Generate Report"
                  className="rounded-full h-12 w-12 p-0 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                >
                  <ShieldCheck className="h-5 w-5" />
                </Button>
                {basel3Data && (
                  <Button
                    onClick={() => handleSaveSnapshot('basel3')}
                    isLoading={savingSnapshot}
                    variant="outline"
                    title="Save Snapshot"
                    className="rounded-full h-12 w-12 p-0 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                  >
                    <Save className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 relative space-y-6">
            {regulatoryLoading ? (
              <div className="space-y-8">
                <Skeleton className="h-40 rounded-[2rem]" />
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-8 w-32 rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-3 w-24 rounded-full" />
                    <Skeleton className="h-8 w-32 rounded-xl" />
                  </div>
                </div>
              </div>
            ) : basel3Data ? (
              <div className="space-y-6 animate-in zoom-in-95 duration-500">
                <div className="p-5 rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                      Capital Adequacy Ratio
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">
                      {basel3Data.ratios.status}
                    </span>
                  </div>
                  <div className="text-4xl font-black tracking-tighter">
                    {basel3Data.ratios.capitalAdequacyRatio.toFixed(2)}%
                  </div>
                  <div className="mt-2 h-2 bg-emerald-500/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: `${Math.min(
                          basel3Data.ratios.capitalAdequacyRatio,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Risk Weighted Assets
                    </div>
                    <div className="text-sm font-black">
                      {formatCompactValue(basel3Data.assets.totalRWA)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Tier 1 Capital
                    </div>
                    <div className="text-sm font-black text-emerald-600">
                      {formatCompactValue(basel3Data.capital.tier1)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground opacity-50">
                <Landmark size={48} strokeWidth={1} className="mb-4" />
                <p className="text-xs font-black uppercase tracking-widest">
                  No Report Generated
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden transition-all duration-300">
          <CardHeader className="p-4 sm:p-6 pb-3 bg-muted/10 border-b border-border/30">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="p-3 rounded-2xl shrink-0 bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25">
                  <Clock size={20} className="text-white" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-base font-black tracking-tight truncate">
                    Snapshot History
                  </CardTitle>
                  <CardDescription className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70 mt-0.5 truncate">
                    Previously saved regulatory reports
                  </CardDescription>
                </div>
              </div>
              {savedSnapshots.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 shrink-0">
                  {savedSnapshots.length}{' '}
                  {savedSnapshots.length === 1 ? 'snapshot' : 'snapshots'}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loadingSnapshots ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
            ) : savedSnapshots.length > 0 ? (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/30 border-b border-border/50 text-[10px] uppercase tracking-wider text-muted-foreground font-black">
                      <tr>
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Generated By</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {savedSnapshots
                        .slice(
                          (snapshotPage - 1) * ROWS_PER_PAGE,
                          snapshotPage * ROWS_PER_PAGE,
                        )
                        .map((snap) => (
                          <tr
                            key={snap._id}
                            className="hover:bg-muted/10 transition-colors"
                          >
                            <td className="px-6 py-3 font-bold">
                              {snap.title}
                            </td>
                            <td className="px-6 py-3">
                              <span
                                className={cn(
                                  'inline-flex px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border',
                                  snap.reportType === 'ifrs9'
                                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                                )}
                              >
                                {snap.reportType === 'ifrs9'
                                  ? 'IFRS 9'
                                  : 'Basel III'}
                              </span>
                            </td>
                            <td className="px-6 py-3 font-medium">
                              {snap.generatedBy?.name || 'Unknown'}
                            </td>
                            <td className="px-6 py-3 text-muted-foreground tabular-nums text-xs">
                              {format(new Date(snap.createdAt), 'PPp')}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-full font-black text-[10px] uppercase tracking-widest px-4 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                                onClick={() => {
                                  if (snap.reportType === 'ifrs9')
                                    setIfrs9Data(snap.snapshotData);
                                  else setBasel3Data(snap.snapshotData);
                                  toast.success(`Loaded ${snap.title}`);
                                }}
                              >
                                <Eye className="w-3 h-3 mr-1.5" />
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                  {savedSnapshots
                    .slice(
                      (snapshotPage - 1) * ROWS_PER_PAGE,
                      snapshotPage * ROWS_PER_PAGE,
                    )
                    .map((snap) => (
                      <div
                        key={snap._id}
                        className="p-4 rounded-2xl bg-muted/5 border border-border/30 flex flex-col gap-3"
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{snap.title}</div>
                            <div className="text-[10px] text-muted-foreground font-medium mt-1 truncate">
                              {format(new Date(snap.createdAt), 'PPp')}
                            </div>
                          </div>
                          <span
                            className={cn(
                              'inline-flex px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border shrink-0',
                              snap.reportType === 'ifrs9'
                                ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
                            )}
                          >
                            {snap.reportType === 'ifrs9'
                              ? 'IFRS 9'
                              : 'Basel III'}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center border-t border-border/10 pt-3 mt-1">
                          <div className="text-xs">
                            <span className="text-muted-foreground">By: </span>
                            <span className="font-bold">{snap.generatedBy?.name || 'Unknown'}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full font-black text-[10px] uppercase tracking-widest px-4 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300"
                            onClick={() => {
                              if (snap.reportType === 'ifrs9')
                                setIfrs9Data(snap.snapshotData);
                              else setBasel3Data(snap.snapshotData);
                              toast.success(`Loaded ${snap.title}`);
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1.5" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
                <TablePagination
                  currentPage={snapshotPage}
                  totalPages={Math.ceil(
                    savedSnapshots.length / ROWS_PER_PAGE,
                  )}
                  onPageChange={setSnapshotPage}
                />
              </>
            ) : (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <Clock className="w-8 h-8 mb-3 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">
                  No Snapshots Saved
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Save a regulatory report to see it here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegulatoryTab;
