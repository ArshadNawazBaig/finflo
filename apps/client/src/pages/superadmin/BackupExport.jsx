import { useState } from 'react';
import {
  Download,
  Users,
  CreditCard,
  UserCircle,
  Receipt,
  ScrollText,
  Database,
  FileJson,
  FileText,
  Loader2,
} from 'lucide-react';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { saveFile } from '@/lib/nativeDownload';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PillSelect from '@/components/ui/PillSelect';

const EYEBROW =
  'text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500';

const COLOR_CLASSES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  green: 'bg-green-500/10 text-green-600 dark:text-green-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

const ACCOUNTING_CARDS = [
  {
    type: 'repayments',
    label: 'Transaction Ledger',
    description: 'Detailed record of all loan repayments.',
    icon: Receipt,
    color: 'emerald',
  },
  {
    type: 'loans',
    label: 'Loan Portfolio',
    description: 'Comprehensive financial breakdown of all loans.',
    icon: CreditCard,
    color: 'purple',
  },
];

const SYSTEM_CARDS = [
  {
    type: 'users',
    label: 'User Directory',
    description: 'All user accounts and profiles.',
    icon: Users,
    color: 'blue',
  },
  {
    type: 'customers',
    label: 'Customer Database',
    description: 'All customer information records.',
    icon: UserCircle,
    color: 'green',
  },
  {
    type: 'activity-logs',
    label: 'System Logs',
    description: 'System activity and security logs.',
    icon: ScrollText,
    color: 'amber',
  },
];

const BackupExport = () => {
  const [format, setFormat] = useState('csv');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [exporting, setExporting] = useState({});

  const handleExport = async (type, label) => {
    try {
      setExporting((prev) => ({ ...prev, [type]: true }));

      let url = `/backup/export/${type}?format=${format}`;
      if (dateRange?.from) {
        const startStr = new Date(dateRange.from).toISOString().split('T')[0];
        url += `&startDate=${startStr}`;
      }
      if (dateRange?.to) {
        const endStr = new Date(dateRange.to).toISOString().split('T')[0];
        url += `&endDate=${endStr}`;
      }

      const response = await api.get(url, { responseType: 'blob' });

      // Save using native-compatible method
      await saveFile(
        new Blob([response.data]),
        `${type}_${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`,
      );

      toast.success(`${label} exported successfully`);
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
      toast.error(`Failed to export ${label}`);
    } finally {
      setExporting((prev) => ({ ...prev, [type]: false }));
    }
  };

  const renderCard = (card) => {
    const Icon = card.icon;
    const isExporting = exporting[card.type];
    return (
      <Card
        key={card.type}
        className="flex flex-col rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
      >
        <CardHeader className="p-5 sm:p-6 pb-3">
          <div
            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl [&_svg]:h-[18px] [&_svg]:w-[18px] ${COLOR_CLASSES[card.color]}`}
          >
            <Icon strokeWidth={2.25} />
          </div>
          <CardTitle className="text-[15px] font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            {card.label}
          </CardTitle>
          <CardDescription className="mt-1 text-[12px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            {card.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="mt-auto px-5 pb-5 sm:px-6">
          <Button
            onClick={() => handleExport(card.type, card.label)}
            disabled={isExporting}
            className="h-11 w-full gap-2 rounded-xl bg-primary text-[12px] font-bold text-white shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
          >
            {isExporting ? (
              <Loader2 size={14} strokeWidth={2.5} className="animate-spin" />
            ) : (
              <Download size={14} strokeWidth={2.5} />
            )}
            {isExporting ? 'Exporting…' : `Download ${format.toUpperCase()}`}
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 pt-1 md:flex-row md:items-start">
        <div className="max-w-2xl space-y-2">
          <p className={EYEBROW}>Super admin</p>
          <h1 className="text-2xl font-extrabold leading-tight tracking-[-0.035em] text-slate-900 dark:text-white lg:text-3xl">
            Backup &amp; data <span className="text-primary">export</span>
          </h1>
          <p className="text-sm font-medium leading-relaxed text-slate-500 dark:text-slate-400">
            Accounting-ready financial reports and system backups.
          </p>
        </div>
        <div className="flex flex-col items-end gap-3 sm:flex-row">
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="overflow-hidden rounded-full border border-slate-100 dark:border-white/[0.06]"
          />
          <div className="flex flex-col">
            <span className={`mb-1.5 ml-1 ${EYEBROW}`}>Export format</span>
            <PillSelect
              value={format}
              onValueChange={setFormat}
              className="w-[200px]"
              options={[
                { value: 'csv', label: 'CSV (Excel ready)' },
                { value: 'json', label: 'JSON (Data migration)' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Accounting Exports Section */}
      <div className="space-y-4">
        <div className="ml-1">
          <p className={EYEBROW}>Accounting</p>
          <h3 className="mt-1 text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Accounting exports
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {ACCOUNTING_CARDS.map(renderCard)}
        </div>
      </div>

      {/* System Data Section */}
      <div className="space-y-4 pt-2">
        <div className="ml-1">
          <p className={EYEBROW}>System</p>
          <h3 className="mt-1 text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            System databases
          </h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SYSTEM_CARDS.map(renderCard)}
        </div>
      </div>

      {/* Database Backup Section */}
      <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
        <CardHeader className="p-5 pb-3 sm:p-6">
          <p className={`mb-1 ${EYEBROW}`}>Database</p>
          <CardTitle className="flex items-center gap-2 text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            <Database className="h-4 w-4 text-primary" />
            Full database backup
          </CardTitle>
          <CardDescription className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Create a complete backup of all system data.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Complete system backup
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Includes all users, loans, customers, transactions, and logs.
                </p>
              </div>
              <Button
                variant="ghost"
                className="h-10 shrink-0 cursor-not-allowed gap-2 rounded-full bg-slate-100 px-5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 hover:bg-slate-100 dark:bg-white/[0.04] dark:text-slate-500"
                disabled
              >
                <Download size={13} />
                Coming soon
              </Button>
            </div>

            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                  <Database className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600 dark:text-blue-400">
                    Best practices
                  </p>
                  <p className="mt-0.5 text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Backup recommendations
                  </p>
                  <ul className="mt-2 space-y-1 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                    <li>• Export data regularly to prevent data loss.</li>
                    <li>• Store backups in a secure, off-site location.</li>
                    <li>• Test backup restoration periodically.</li>
                    <li>• Keep multiple backup versions.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
        <CardHeader className="p-5 pb-3 sm:p-6">
          <p className={`mb-1 ${EYEBROW}`}>Info</p>
          <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Export information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-6 sm:px-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                CSV format
              </h4>
              <p className="text-[12px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                Comma-separated values format. Compatible with Excel, Google
                Sheets, and most data analysis tools. Best for spreadsheet
                applications.
              </p>
            </div>
            <div>
              <h4 className="mb-1.5 flex items-center gap-2 text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white">
                <FileJson size={14} className="text-blue-600 dark:text-blue-400" />
                JSON format
              </h4>
              <p className="text-[12px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                JavaScript Object Notation format. Preserves data structure and
                types. Best for programmatic access and data migration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupExport;
