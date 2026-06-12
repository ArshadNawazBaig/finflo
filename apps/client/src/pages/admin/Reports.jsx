import { useState } from 'react';
import {
  Download,
  TrendingUp,
  FileText,
  ShieldCheck,
  FileSpreadsheet,
  Activity,
  Layers,
  Landmark,
  Banknote,
  Scale,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { subMonths, format, startOfDay, endOfDay } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  renderPdfHeader,
  renderPdfFooter,
  getBusinessContext,
  renderPdfSignatures,
} from '@/lib/pdfExportUtils';
import { PDF_FONT, registerJakartaFonts } from '@/lib/pdfFonts';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { toast } from 'sonner';
import { savePdf, saveFile } from '@/lib/nativeDownload';
import api from '@/lib/axios';
import { cn, formatFullCurrency as formatCurrency } from '@/lib/utils';

// Import Tab Components
import PerformanceTab from '@/components/reports/PerformanceTab';
import RegulatoryTab from '@/components/reports/RegulatoryTab';
import TrialBalanceTab from '@/components/reports/TrialBalanceTab';
import ProfitLossTab from '@/components/reports/ProfitLossTab';
import BalanceSheetTab from '@/components/reports/BalanceSheetTab';
import ReconciliationTab from '@/components/reports/ReconciliationTab';
import BranchAnalyticsTab from '@/components/reports/BranchAnalyticsTab';

const Reports = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}') || {};
  const isAdmin = ['admin', 'super_admin'].includes(user.role);

  const [activeTab, setActiveTab] = useState('performance');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingModal, setIsExportingModal] = useState(false);
  const [reportDateRange, setReportDateRange] = useState({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  const handleExport = () => {
    setIsExportModalOpen(true);
  };

  const handleCsvExport = async () => {
    try {
      setIsExportingModal(true);
      const { data: reportData } = await api.get('/reports/stats', {
        params: {
          startDate: startOfDay(reportDateRange.from).toISOString(),
          endDate: endOfDay(reportDateRange.to).toISOString(),
        },
      });

      const csvString =
        'Month,Value\n' +
        reportData.charts.monthlyLoans
          .map((e) => `${e.name},${e.value}`)
          .join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      await saveFile(
        blob,
        `loan_performance_${format(reportDateRange.from, 'yyyyMMdd')}_${format(reportDateRange.to, 'yyyyMMdd')}.csv`,
      );
      setIsExportModalOpen(false);
      toast.success('CSV Exported successfully');
    } catch (error) {
      console.error('CSV Export failed:', error);
      toast.error('Failed to export CSV');
    } finally {
      setIsExportingModal(false);
    }
  };

  // Accounting-software-compatible CSV export (server-generated from the ledger).
  const handleAccountingExport = async (acctFormat) => {
    try {
      setIsExportingModal(true);
      const res = await api.get('/ledger/accounting-export', {
        params: {
          format: acctFormat,
          startDate: startOfDay(reportDateRange.from).toISOString(),
          endDate: endOfDay(reportDateRange.to).toISOString(),
        },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      await saveFile(
        blob,
        `accounting_${acctFormat}_${format(reportDateRange.from, 'yyyyMMdd')}_${format(reportDateRange.to, 'yyyyMMdd')}.csv`,
      );
      setIsExportModalOpen(false);
      toast.success('Accounting export downloaded');
    } catch (error) {
      console.error('Accounting export failed:', error);
      toast.error('Failed to export — please try again');
    } finally {
      setIsExportingModal(false);
    }
  };

  // Position/schedule exports (loans receivable, member balances, customers).
  const handleEntityExport = async (entityType) => {
    try {
      setIsExportingModal(true);
      const res = await api.get('/ledger/entity-export', {
        params: { type: entityType },
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      await saveFile(blob, `${entityType}_${format(new Date(), 'yyyyMMdd')}.csv`);
      setIsExportModalOpen(false);
      toast.success('Export downloaded');
    } catch (error) {
      console.error('Entity export failed:', error);
      toast.error('Failed to export — please try again');
    } finally {
      setIsExportingModal(false);
    }
  };

  const handleExecutiveSummaryExport = async () => {
    try {
      setIsExportingModal(true);
      const { data: reportData } = await api.get('/reports/stats', {
        params: {
          startDate: startOfDay(reportDateRange.from).toISOString(),
          endDate: endOfDay(reportDateRange.to).toISOString(),
        },
      });

      const pdfSummary = reportData.summary;
      const pdfCharts = reportData.charts;

      const doc = new jsPDF();
      await registerJakartaFonts(doc);
      const ctx = getBusinessContext();

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Executive Performance Summary',
        leftDetails: [
          { label: 'Generated By', value: user?.name || 'Administrator' },
          { label: 'Report Type', value: 'System Insights' },
        ],
        rightDetails: [
          {
            label: 'Report Period',
            value: `${format(startOfDay(reportDateRange.from), 'MMM dd, yyyy')} - ${format(endOfDay(reportDateRange.to), 'MMM dd, yyyy')}`,
          },
          { label: 'Generated On', value: new Date().toLocaleDateString() },
        ],
      });

      // Overview Stats
      doc.setFontSize(12);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(64, 53, 100);
      doc.text('Performance KPI Overview', 14, startY + 12);

      autoTable(doc, {
        startY: startY + 18,
        head: [['Key Performance Indicator', 'Current Value', 'Trend']],
        body: [
          ['Total Loan Volume', formatCurrency(pdfSummary.totalVolume), pdfSummary.totalVolumeChange],
          ['Avg Interest Rate', `${pdfSummary.avgInterest}%`, pdfSummary.avgInterestChange],
          ['Collection Rate', `${pdfSummary.collectionRate}%`, pdfSummary.collectionRateChange],
          ['Growth Rate', `${pdfSummary.growth}%`, pdfSummary.growthChange],
        ],
        theme: 'grid',
        headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
        styles: { font: PDF_FONT, fontSize: 9, cellPadding: 5 },
        columnStyles: {
          1: { fontStyle: 'bold', halign: 'right' },
          2: { fontStyle: 'bold', halign: 'center' },
        },
      });

      // Monthly Performance Data
      const chartY = (doc.lastAutoTable?.finalY || 100) + 15;
      doc.setFontSize(11);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(64, 53, 100);
      doc.text('Monthly Lending Velocity', 14, chartY);

      autoTable(doc, {
        startY: chartY + 6,
        head: [['Month', 'Volume (Value)']],
        body: pdfCharts.monthlyLoans.map((d) => [d.name, formatCurrency(d.value)]),
        theme: 'striped',
        headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
        styles: { font: PDF_FONT, fontSize: 8 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      });

      // Portfolio Overview
      const pdfPortfolio = reportData.portfolioOverview;
      if (pdfPortfolio) {
        const portfolioY = (doc.lastAutoTable?.finalY || 150) + 15;
        doc.setFontSize(11);
        doc.setFont(PDF_FONT, 'bold');
        doc.setTextColor(64, 53, 100);
        doc.text('Portfolio Overview', 14, portfolioY);

        autoTable(doc, {
          startY: portfolioY + 6,
          head: [['Metric', 'Value']],
          body: [
            ['Total Members', String(pdfPortfolio.members.total)],
            ['Active Members', String(pdfPortfolio.members.active)],
            ['Inactive Members', String(pdfPortfolio.members.inactive)],
            ['Defaulter Members', String(pdfPortfolio.members.defaulters)],
            ['', ''],
            ['Total Loans', String(pdfPortfolio.loans.total)],
            ['Active Loans', `${pdfPortfolio.loans.active} (${formatCurrency(pdfPortfolio.loans.activeLoanAmount)})`],
            ['Overdue Loans', `${pdfPortfolio.loans.overdue} (${formatCurrency(pdfPortfolio.loans.overdueAmount)})`],
            ['Defaulted Loans', `${pdfPortfolio.loans.defaulted} (${formatCurrency(pdfPortfolio.loans.defaultedAmount)})`],
            ['Completed Loans', `${pdfPortfolio.loans.completed} (${formatCurrency(pdfPortfolio.loans.completedAmount)})`],
            ['Pending Loans', String(pdfPortfolio.loans.pending)],
            ['', ''],
            ['Total Outstanding', formatCurrency(pdfPortfolio.financials.totalOutstanding)],
            ['Total Recovered', formatCurrency(pdfPortfolio.financials.totalRepaid)],
            ['Late Fees Accrued', formatCurrency(pdfPortfolio.financials.totalLateFees)],
          ],
          theme: 'grid',
          headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
          styles: { font: PDF_FONT, fontSize: 8, cellPadding: 4 },
          columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        });
      }

      const finalY = (doc.lastAutoTable?.finalY || 200) + 20;
      await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
      renderPdfFooter(doc, { businessContext: ctx });

      await savePdf(doc, `Executive_Summary_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toast.success('Executive summary generated successfully');
      setIsExportModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsExportingModal(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={<>Insight & <span className="text-primary ">Analytics</span></>}
        description="Deep dive into your lending performance and regulatory compliance."
      >
        <Button
          onClick={handleExport}
          className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
        >
          <Download size={14} strokeWidth={2.5} />
          Export Insights
        </Button>
      </PageHeader>

      {/* Tab Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:flex items-center gap-1.5 sm:gap-2 p-1.5 bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-full w-full">
        <button
          onClick={() => setActiveTab('performance')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'performance' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-primary' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><Activity size={16} />Performance</button>
        <button
          onClick={() => setActiveTab('regulatory')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'regulatory' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-primary' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><ShieldCheck size={16} />Regulatory Center</button>
        <button
          onClick={() => setActiveTab('trial-balance')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'trial-balance' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-emerald-500' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><Layers size={16} />Trial Balance</button>
        <button
          onClick={() => setActiveTab('profit-loss')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'profit-loss' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-indigo-500' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><FileText size={16} />Profit & Loss</button>
        <button
          onClick={() => setActiveTab('balance-sheet')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'balance-sheet' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-teal-500' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><Landmark size={16} />Balance Sheet</button>
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={cn(
            'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
            activeTab === 'reconciliation' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-cyan-500' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
          )}
        ><Scale size={16} />Reconciliation</button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('branch-analytics')}
            className={cn(
              'px-2 sm:px-5 py-2 sm:py-2 rounded-full text-[10px] sm:text-[12px] font-bold capitalize transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full xl:w-auto',
              activeTab === 'branch-analytics' ? 'bg-white dark:bg-white/[0.08] text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-white/[0.06] [&>svg]:text-purple-500' : 'bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white border border-transparent',
            )}
          ><Banknote size={16} />Branch Analytics</button>
        )}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'performance' && <PerformanceTab />}
        {activeTab === 'regulatory' && <RegulatoryTab />}
        {activeTab === 'trial-balance' && <TrialBalanceTab />}
        {activeTab === 'profit-loss' && <ProfitLossTab />}
        {activeTab === 'balance-sheet' && <BalanceSheetTab />}
        {activeTab === 'reconciliation' && <ReconciliationTab />}
        {activeTab === 'branch-analytics' && isAdmin && <BranchAnalyticsTab />}
      </div>

      {/* Export Report Modal */}
      <Dialog open={isExportModalOpen} onOpenChange={setIsExportModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2.5rem] border-border/50 shadow-2xl bg-background">
          <div className="p-8 border-b bg-background z-10 shrink-0 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0"><TrendingUp size={24} /></div>
              <div className="text-left">
                <DialogTitle className="text-2xl font-black tracking-tight">Export Analytics</DialogTitle>
                <DialogDescription className="text-sm font-medium text-muted-foreground/80 mt-1">Select the format and period for your executive insights report.</DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-zinc-50/30 dark:bg-zinc-900/10">
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4 block text-center">Select Report Period</label>
                <div className="flex justify-center">
                  <DateRangePicker date={reportDateRange} setDate={setReportDateRange} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button variant="outline" className="h-16 rounded-2xl justify-between px-6 border-border/50 hover:border-primary/50 group transition-all bg-background/50" onClick={handleExecutiveSummaryExport} disabled={isExportingModal}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors"><FileText size={18} /></div>
                    <div className="text-left"><p className="text-sm font-black tracking-tight">Executive Summary</p><p className="text-[10px] text-muted-foreground font-medium">Standard High-Fidelity PDF</p></div>
                  </div>
                  {isExportingModal ? (<Loader2 className="animate-spin text-primary" size={16} />) : (<div className="w-2 h-2 rounded-full bg-emerald-500" />)}
                </Button>
                <Button variant="outline" className="h-16 rounded-2xl justify-between px-6 border-border/50 hover:border-emerald-500/50 group transition-all bg-background/50" onClick={handleCsvExport} disabled={isExportingModal}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors"><FileSpreadsheet size={18} /></div>
                    <div className="text-left"><p className="text-sm font-black tracking-tight">Raw Data Export</p><p className="text-[10px] text-muted-foreground font-medium">Monthly Stats in CSV</p></div>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-muted" />
                </Button>
              </div>

              {/* Accounting-software export — CSVs for QuickBooks / Xero etc. */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block text-center">
                  Accounting Software
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'generic', label: 'Ledger CSV', desc: 'Full ledger', icon: FileSpreadsheet },
                    { key: 'quickbooks', label: 'QuickBooks', desc: 'Bank CSV', icon: Banknote },
                    { key: 'xero', label: 'Xero', desc: 'Bank CSV', icon: Landmark },
                    { key: 'journal', label: 'Journal', desc: 'Double-entry', icon: Layers },
                  ].map((opt) => (
                    <Button
                      key={opt.key}
                      variant="outline"
                      className="h-16 rounded-2xl justify-start px-4 border-border/50 hover:border-primary/50 group transition-all bg-background/50"
                      onClick={() => handleAccountingExport(opt.key)}
                      disabled={isExportingModal}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <opt.icon size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black tracking-tight">{opt.label}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">{opt.desc}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Position schedules — loans receivable, member balances, customers */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 block text-center">
                  Schedules (CSV)
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { key: 'loans', label: 'Outstanding Loans', desc: 'Receivables / aging', icon: Banknote },
                    { key: 'members', label: 'Member Balances', desc: 'Deposit liabilities', icon: Scale },
                    { key: 'customers', label: 'Customers', desc: 'Borrowers & KYC', icon: FileText },
                  ].map((opt) => (
                    <Button
                      key={opt.key}
                      variant="outline"
                      className="h-14 rounded-2xl justify-start px-4 border-border/50 hover:border-primary/50 group transition-all bg-background/50"
                      onClick={() => handleEntityExport(opt.key)}
                      disabled={isExportingModal}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <opt.icon size={16} />
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-black tracking-tight">{opt.label}</p>
                          <p className="text-[9px] text-muted-foreground font-medium">{opt.desc}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 border-t bg-background shrink-0">
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)} className="w-full rounded-[1.25rem] h-14 font-black text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground" disabled={isExportingModal}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
