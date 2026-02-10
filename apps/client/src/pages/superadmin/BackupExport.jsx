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
import PageHeader from '@/components/PageHeader';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BackupExport = () => {
  const [format, setFormat] = useState('csv');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState({});

  const handleExport = async (type, label) => {
    try {
      setExporting((prev) => ({ ...prev, [type]: true }));

      let url = `/backup/export/${type}?format=${format}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const response = await api.get(url, {
        responseType: 'blob',
      });

      // Create download link
      const downloadUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute(
        'download',
        `${type}_${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

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
      <PageHeader
        title="Backup & Data Export"
        description="Accounting-ready financial reports and system backups"
      >
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 bg-muted/50 p-2 px-4 rounded-xl border border-border/50">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 mb-1">
                From
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:outline-none"
              />
            </div>
            <div className="w-px h-8 bg-border/50 mx-2" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 mb-1">
                To
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-sm font-semibold focus:outline-none"
              />
            </div>
          </div>

          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-[140px] rounded-xl font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV Format</SelectItem>
              <SelectItem value="json">JSON Format</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Accounting Exports Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Accounting Exports
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accountingCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.type}
                className="group border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm shadow-sm rounded-3xl hover:shadow-md transition-all duration-300"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-3 rounded-xl transition-colors ${colorClasses[card.color]}`}
                    >
                      <Icon size={24} />
                    </div>
                  </div>
                  <CardTitle className="text-lg font-black tracking-tight">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleExport(card.type, card.label)}
                    disabled={exporting[card.type]}
                    variant="success"
                    className="w-full h-11 rounded-full text-[11px] font-black uppercase tracking-widest gap-2"
                  >
                    <Download size={16} />
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
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          System Databases
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {systemCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card
                key={card.type}
                className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`p-3 rounded-xl transition-colors ${colorClasses[card.color]}`}
                    >
                      <Icon size={20} />
                    </div>
                  </div>
                  <CardTitle className="text-md font-black tracking-tight">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-[10px] leading-tight">
                    {card.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleExport(card.type, card.label)}
                    disabled={exporting[card.type]}
                    variant="gradient"
                    className="w-full h-10 rounded-full text-[10px] font-black uppercase tracking-widest gap-2"
                  >
                    <Download size={14} />
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
      <Card className="border border-border/50 bg-gradient-to-br from-card via-card to-primary/5 shadow-lg rounded-3xl">
        <CardHeader className="border-b border-border/40">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Full Database Backup
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                Create a complete backup of all system data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50">
              <div>
                <p className="font-semibold">Complete System Backup</p>
                <p className="text-sm text-muted-foreground">
                  Includes all users, loans, customers, transactions, and logs
                </p>
              </div>
              <button
                className="flex items-center gap-2.5 px-6 h-11 rounded-full bg-muted text-muted-foreground/50 text-[11px] font-black uppercase tracking-widest cursor-not-allowed"
                disabled
              >
                <Download size={16} />
                Coming Soon
              </button>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Database className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                    Backup Best Practices
                  </p>
                  <ul className="text-xs text-blue-800 dark:text-blue-200 mt-2 space-y-1">
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
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-3xl">
        <CardHeader className="border-b border-border/40">
          <CardTitle className="text-lg font-black tracking-tight">
            Export Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileText size={16} className="text-green-600" />
                CSV Format
              </h4>
              <p className="text-sm text-muted-foreground">
                Comma-separated values format. Compatible with Excel, Google
                Sheets, and most data analysis tools. Best for spreadsheet
                applications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <FileJson size={16} className="text-blue-600" />
                JSON Format
              </h4>
              <p className="text-sm text-muted-foreground">
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
