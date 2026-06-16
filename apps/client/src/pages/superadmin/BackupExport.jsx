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

      const response = await api.get(url, {
        responseType: 'blob',
      });

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

  const accountingCards = [
    {
      type: 'repayments',
      label: 'Transaction Ledger',
      description: 'Detailed record of all loan repayments',
      icon: Receipt,
      color: 'emerald',
    },
    {
      type: 'loans',
      label: 'Loan Portfolio',
      description: 'Comprehensive financial breakdown of all loans',
      icon: CreditCard,
      color: 'purple',
    },
  ];

  const systemCards = [
    {
      type: 'users',
      label: 'User Directory',
      description: 'Export all user accounts and profiles',
      icon: Users,
      color: 'blue',
    },
    {
      type: 'customers',
      label: 'Customer Database',
      description: 'Export all customer information',
      icon: UserCircle,
      color: 'green',
    },
    {
      type: 'activity-logs',
      label: 'System Logs',
      description: 'Export system activity and security logs',
      icon: ScrollText,
      color: 'amber',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
    green: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    amber: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 pt-1">
        <div className="space-y-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Super admin
          </p>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white">
            Backup & data <span className="text-primary">export</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
            Accounting-ready financial reports and system backups.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <DateRangePicker
            date={dateRange}
            setDate={setDateRange}
            className="border border-slate-100 dark:border-white/[0.06] rounded-full overflow-hidden"
          />
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 ml-1 mb-1.5">
              Export format
            </span>
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
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            Accounting
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mt-1">
            Accounting exports
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accountingCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.type}
                className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
              >
                <CardHeader className="p-5 sm:p-6 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4 ${colorClasses[card.color]}`}
                    >
                      <Icon />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 sm:px-6 pb-5">
                  <Button
                    onClick={() => handleExport(card.type, card.label)}
                    disabled={exporting[card.type]}
                    className="w-full h-11 rounded-full text-[12px] font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <Download size={14} strokeWidth={2.5} />
                    {exporting[card.type]
                      ? 'Processing...'
                      : `Download ${format.toUpperCase()}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* System Data Section */}
      <div className="space-y-4 pt-2">
        <div className="ml-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
            System
          </p>
          <h3 className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white mt-1">
            System databases
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.type}
                className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)]"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center [&_svg]:w-4 [&_svg]:h-4 ${colorClasses[card.color]}`}
                    >
                      <Icon />
                    </div>
                  </div>
                  <CardTitle className="text-[15px] font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <Button
                    onClick={() => handleExport(card.type, card.label)}
                    disabled={exporting[card.type]}
                    className="w-full h-10 rounded-full text-[11px] font-bold bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <Download size={13} strokeWidth={2.5} />
                    {exporting[card.type]
                      ? 'Exporting...'
                      : format.toUpperCase()}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Database Backup Section */}
      <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
        <CardHeader className="p-5 sm:p-6 pb-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Database
              </p>
              <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Full database backup
              </CardTitle>
              <CardDescription className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Create a complete backup of all system data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
              <div>
                <p className="font-extrabold text-[13px] tracking-tight text-slate-900 dark:text-white">
                  Complete system backup
                </p>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Includes all users, loans, customers, transactions, and logs
                </p>
              </div>
              <Button
                variant="ghost"
                className="flex items-center gap-2 px-5 h-10 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-[0.12em] cursor-not-allowed"
                disabled
              >
                <Download size={13} />
                Coming soon
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/[0.04] border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-600">
                    Best practices
                  </p>
                  <p className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white mt-0.5">
                    Backup recommendations
                  </p>
                  <ul className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-2 space-y-1 leading-relaxed">
                    <li>• Export data regularly to prevent data loss</li>
                    <li>• Store backups in a secure, off-site location</li>
                    <li>• Test backup restoration periodically</li>
                    <li>• Keep multiple backup versions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Info */}
      <Card className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none">
        <CardHeader className="p-5 sm:p-6 pb-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
            Info
          </p>
          <CardTitle className="text-lg font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
            Export information
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 sm:px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <FileText size={14} className="text-emerald-600" />
                CSV format
              </h4>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Comma-separated values format. Compatible with Excel, Google
                Sheets, and most data analysis tools. Best for spreadsheet
                applications.
              </p>
            </div>
            <div>
              <h4 className="text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-white mb-1.5 flex items-center gap-2">
                <FileJson size={14} className="text-blue-600" />
                JSON format
              </h4>
              <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
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
