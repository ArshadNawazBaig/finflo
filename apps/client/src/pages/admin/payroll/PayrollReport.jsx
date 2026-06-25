/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect } from 'react';
import {
  Download,
  Wallet,
  Receipt,
  Users,
  TrendingDown,
  Building2,
  BarChart3,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  renderPdfHeader,
  renderPdfFooter,
  getBusinessContext,
  renderPdfSignatures,
} from '@/lib/pdfExportUtils';
import { PDF_FONT, registerJakartaFonts } from '@/lib/pdfFonts';
import { savePdf, saveFile } from '@/lib/nativeDownload';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import PillSelect from '@/components/ui/PillSelect';
import { Button } from '@/components/ui/button';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import {
  cn,
  capitalize,
  formatCompactValue,
  formatFullCurrency as formatCurrency,
} from '@/lib/utils';
import { toast } from 'sonner';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

const STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid (actuals)' },
  { value: 'approved', label: 'Approved' },
  { value: 'draft', label: 'Draft' },
  { value: 'all', label: 'All runs' },
];

// Deduction lines → label + accent colour for the breakdown bars.
const DEDUCTION_META = [
  { key: 'tax', label: 'Income Tax', color: 'bg-rose-500' },
  { key: 'providentFund', label: 'Provident Fund', color: 'bg-indigo-500' },
  { key: 'eobi', label: 'EOBI', color: 'bg-amber-500' },
  { key: 'loanEMI', label: 'Loan EMI', color: 'bg-blue-500' },
  { key: 'savingsContribution', label: 'Savings', color: 'bg-emerald-500' },
  { key: 'otherDeductions', label: 'Other / Ad-hoc', color: 'bg-slate-400' },
];

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-100 dark:border-white/[0.08] bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
      <p className="text-[11px] font-bold text-slate-900 dark:text-white mb-1">
        {label}
      </p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 capitalize"
        >
          {p.dataKey}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

const PayrollReport = () => {
  const now = new Date();
  const me = JSON.parse(localStorage.getItem('user') || '{}') || {};

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState('paid');

  useEffect(() => {
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, status]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/payroll/report', {
        params: { year, status },
      });
      setReport(data);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to load payroll report',
      );
    } finally {
      setLoading(false);
    }
  };

  const summary = report?.summary || {};
  const monthly = report?.monthly || [];
  const byDepartment = report?.byDepartment || [];
  const byEmployee = report?.byEmployee || [];
  const deductionBreakdown = report?.deductionBreakdown || {};
  const hasData = summary.payslipCount > 0;

  const chartData = monthly.map((m) => ({
    name: MONTHS_SHORT[m.month - 1],
    net: m.net,
    gross: m.gross,
  }));

  const deductionRows = DEDUCTION_META.map((d) => ({
    ...d,
    amount: deductionBreakdown[d.key] || 0,
  })).filter((d) => d.amount > 0);
  const maxDeduction = deductionRows.reduce(
    (max, d) => Math.max(max, d.amount),
    0,
  );
  const maxDeptGross = byDepartment.reduce(
    (max, d) => Math.max(max, d.gross || 0),
    0,
  );

  const yearOptions = (
    report?.availableYears?.length
      ? report.availableYears
      : [now.getFullYear()]
  ).map((y) => ({ value: String(y), label: String(y) }));

  const periodLabel = `${year}`;

  // ── Exports ──────────────────────────────────────────────────────
  const handleCsvExport = async () => {
    if (!hasData) return;
    try {
      setExporting(true);
      const lines = [];
      lines.push(`Payroll Report,${periodLabel},${capitalize(status)}`);
      lines.push('');
      lines.push('Month,Payslips,Gross,Deductions,Net');
      monthly.forEach((m) => {
        lines.push(
          `${MONTHS[m.month - 1]},${m.count},${m.gross},${m.deductions},${m.net}`,
        );
      });
      lines.push('');
      lines.push('Employee,Employee ID,Department,Payslips,Gross,Deductions,Net');
      byEmployee.forEach((e) => {
        lines.push(
          `"${e.name}",${e.employeeId},"${e.department}",${e.payslips},${e.gross},${e.deductions},${e.net}`,
        );
      });
      const blob = new Blob([lines.join('\n')], {
        type: 'text/csv;charset=utf-8;',
      });
      await saveFile(blob, `payroll_report_${periodLabel}.csv`);
      toast.success('CSV exported');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = async () => {
    if (!hasData) return;
    try {
      setExporting(true);
      const doc = new jsPDF();
      await registerJakartaFonts(doc);
      const ctx = getBusinessContext();

      const startY = await renderPdfHeader(doc, {
        businessContext: ctx,
        title: 'Payroll Report',
        leftDetails: [
          { label: 'Generated By', value: me?.name || 'Administrator' },
          { label: 'Status Filter', value: capitalize(status) },
        ],
        rightDetails: [
          { label: 'Period', value: `Year ${periodLabel}` },
          { label: 'Generated On', value: new Date().toLocaleDateString() },
        ],
      });

      doc.setFontSize(12);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(64, 53, 100);
      doc.text('Summary', 14, startY + 12);

      autoTable(doc, {
        startY: startY + 18,
        head: [['Metric', 'Value']],
        body: [
          ['Total Net Paid', formatCurrency(summary.totalNet)],
          ['Total Gross', formatCurrency(summary.totalGross)],
          ['Total Deductions', formatCurrency(summary.totalDeductions)],
          ['Payroll Runs', String(summary.runCount)],
          ['Employees Paid', String(summary.employeeCount)],
          ['Payslips', String(summary.payslipCount)],
          ['Average Net / Payslip', formatCurrency(summary.avgNet)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
        styles: { font: PDF_FONT, fontSize: 9, cellPadding: 5 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
      });

      const monthsY = (doc.lastAutoTable?.finalY || 100) + 12;
      doc.setFontSize(11);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(64, 53, 100);
      doc.text('Monthly Breakdown', 14, monthsY);
      autoTable(doc, {
        startY: monthsY + 6,
        head: [['Month', 'Payslips', 'Gross', 'Deductions', 'Net']],
        body: monthly
          .filter((m) => m.count > 0)
          .map((m) => [
            MONTHS[m.month - 1],
            String(m.count),
            formatCurrency(m.gross),
            formatCurrency(m.deductions),
            formatCurrency(m.net),
          ]),
        theme: 'striped',
        headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
        styles: { font: PDF_FONT, fontSize: 8, cellPadding: 4 },
        columnStyles: {
          2: { halign: 'right' },
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
      });

      const empY = (doc.lastAutoTable?.finalY || 150) + 12;
      doc.setFontSize(11);
      doc.setFont(PDF_FONT, 'bold');
      doc.setTextColor(64, 53, 100);
      doc.text('By Employee', 14, empY);
      autoTable(doc, {
        startY: empY + 6,
        head: [['Employee', 'Department', 'Payslips', 'Gross', 'Net']],
        body: byEmployee.map((e) => [
          capitalize(e.name),
          capitalize(e.department),
          String(e.payslips),
          formatCurrency(e.gross),
          formatCurrency(e.net),
        ]),
        theme: 'grid',
        headStyles: { fillColor: [64, 53, 100], textColor: [255, 255, 255] },
        styles: { font: PDF_FONT, fontSize: 8, cellPadding: 4 },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right', fontStyle: 'bold' },
        },
      });

      const finalY = (doc.lastAutoTable?.finalY || 200) + 16;
      await renderPdfSignatures(doc, { startY: finalY, businessContext: ctx });
      renderPdfFooter(doc, { businessContext: ctx });

      await savePdf(doc, `Payroll_Report_${periodLabel}.pdf`);
      toast.success('Payroll report generated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Payroll Report"
        description="Year-to-date payroll spend, deductions, and per-employee totals."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleCsvExport}
              disabled={exporting || !hasData}
              className="rounded-full h-11 px-5 font-bold gap-2"
            >
              <FileText size={14} strokeWidth={2.5} />
              CSV
            </Button>
            <Button
              onClick={handlePdfExport}
              isLoading={exporting}
              disabled={!hasData}
              className="rounded-full h-11 px-6 font-bold gap-2"
            >
              {!exporting && <Download size={14} strokeWidth={2.5} />}
              Export PDF
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Year
          </label>
          <PillSelect
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
            options={yearOptions}
            className="w-36"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Status
          </label>
          <PillSelect
            value={status}
            onValueChange={setStatus}
            options={STATUS_OPTIONS}
            className="w-44"
          />
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <CardsSkeleton />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <StatsCard
            title="Total Net Paid"
            amount={formatCurrency(summary.totalNet || 0)}
            subtitle={`${summary.payslipCount || 0} payslips`}
            icon={<Wallet size={20} />}
            color="bg-emerald-500 shadow-emerald-500/20"
            sensitive
          />
          <StatsCard
            title="Total Gross"
            amount={formatCurrency(summary.totalGross || 0)}
            subtitle="Before deductions"
            icon={<BarChart3 size={20} />}
            color="bg-primary shadow-primary/20"
            sensitive
          />
          <StatsCard
            title="Total Deductions"
            amount={formatCurrency(summary.totalDeductions || 0)}
            subtitle="Tax, PF, EOBI, EMI…"
            icon={<TrendingDown size={20} />}
            color="bg-rose-500 shadow-rose-500/20"
            sensitive
          />
          <StatsCard
            title="Employees Paid"
            amount={summary.employeeCount || 0}
            subtitle={`${summary.runCount || 0} payroll runs`}
            icon={<Users size={20} />}
            color="bg-blue-500 shadow-blue-500/20"
          />
        </div>
      )}

      {!loading && !hasData ? (
        <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-12 flex flex-col items-center justify-center text-center gap-3">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400">
            <Receipt size={26} />
          </span>
          <h3 className="text-lg font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white">
            No payroll for {periodLabel}
          </h3>
          <p className="text-sm font-medium text-slate-400 dark:text-slate-500 max-w-sm">
            There are no{' '}
            {status === 'all' ? '' : `${status} `}payslips in {periodLabel}. Try
            a different year or status filter.
          </p>
        </div>
      ) : (
        <>
          {/* Monthly trend */}
          <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Trend
              </p>
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                Net pay by month
              </h3>
            </div>
            {loading ? (
              <Skeleton className="h-[300px] w-full rounded-2xl" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted/50"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={10}
                      stroke="hsl(var(--muted-foreground))"
                      tickFormatter={(v) => formatCompactValue(v)}
                      width={48}
                    />
                    <Tooltip
                      content={<ChartTooltip />}
                      cursor={{ fill: 'hsl(var(--primary)/0.05)' }}
                    />
                    <Bar
                      dataKey="net"
                      fill="hsl(var(--primary))"
                      radius={[6, 6, 0, 0]}
                      animationDuration={1200}
                    >
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fillOpacity={0.7 + (index / 12) * 0.3}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Deduction breakdown */}
            <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Breakdown
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Deductions
                </h3>
              </div>
              {deductionRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2">
                  <TrendingDown size={26} className="opacity-40" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em]">
                    No deductions
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {deductionRows.map((d) => (
                    <div key={d.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {d.label}
                        </span>
                        <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(d.amount)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700', d.color)}
                          style={{
                            width: `${
                              maxDeduction > 0
                                ? Math.max(6, (d.amount / maxDeduction) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Department breakdown */}
            <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-5 sm:p-6">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                  Distribution
                </p>
                <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                  Spend by department
                </h3>
              </div>
              {byDepartment.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 gap-2">
                  <Building2 size={26} className="opacity-40" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.15em]">
                    No departments
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {byDepartment.map((d) => (
                    <div key={d.department}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 capitalize">
                          {capitalize(d.department) || 'Unassigned'}
                          <span className="ml-1.5 text-[10px] font-semibold text-slate-400">
                            ({d.count})
                          </span>
                        </span>
                        <span className="text-xs font-extrabold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(d.gross)}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-700"
                          style={{
                            width: `${
                              maxDeptGross > 0
                                ? Math.max(6, (d.gross / maxDeptGross) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per-employee table */}
          <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
            <div className="p-5 sm:p-6 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Detail
              </p>
              <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                By employee
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="text-left px-5 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Employee
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden sm:table-cell">
                      Department
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden md:table-cell">
                      Slips
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden sm:table-cell">
                      Gross
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 hidden lg:table-cell">
                      Deductions
                    </th>
                    <th className="text-right px-5 sm:px-6 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                      Net
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byEmployee.map((e) => (
                    <tr
                      key={e.employee}
                      className="border-b border-slate-50 dark:border-white/[0.04] last:border-0 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 sm:px-6 py-3.5">
                        <p className="font-bold text-slate-900 dark:text-white capitalize leading-tight">
                          {capitalize(e.name)}
                        </p>
                        {e.employeeId && (
                          <p className="text-[11px] font-medium text-slate-400">
                            {e.employeeId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 capitalize hidden sm:table-cell">
                        {capitalize(e.department) || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 text-center tabular-nums text-slate-500 dark:text-slate-400 hidden md:table-cell">
                        {e.payslips}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-700 dark:text-slate-300 hidden sm:table-cell">
                        {formatCurrency(e.gross)}
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-rose-500 hidden lg:table-cell">
                        {formatCurrency(e.deductions)}
                      </td>
                      <td className="px-5 sm:px-6 py-3.5 text-right tabular-nums font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(e.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {exporting && (
        <div className="fixed bottom-6 right-6 flex items-center gap-2 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 text-sm font-bold shadow-xl z-50">
          <Loader2 size={14} className="animate-spin" />
          Preparing export…
        </div>
      )}
    </div>
  );
};

export default PayrollReport;
