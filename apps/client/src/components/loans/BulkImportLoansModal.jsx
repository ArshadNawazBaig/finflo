import { useRef, useState } from 'react';
import {
  Loader2,
  Upload,
  FileSpreadsheet,
  X,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import api from '@/lib/axios';

// Header-driven backend parser — order is informational, admins can rearrange.
const REQUIRED_COLUMNS = [
  'borrowerName',
  'borrowerCnic',
  'borrowerPhone',
  'borrowerEmail',
  'principal',
  'rate',
  'durationMonths',
  'startDate',
];
const OPTIONAL_COLUMNS = [
  'interestType',
  'status',
  'amountPaid',
  'lastPaymentDate',
  'notes',
];

const buildTemplate = () => {
  const headers = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];
  const examples = [
    [
      'Ahmed Khan',
      '3520112345671',
      '03001234567',
      'ahmed.khan@example.com',
      '100000',
      '24',
      '12',
      'simple',
      '2022-03-15',
      'completed',
      '124000',
      '2023-03-15',
      'Old loan fully paid',
    ],
    [
      'Sara Ali',
      '3520198765432',
      '03007654321',
      'sara.ali@example.com',
      '50000',
      '18',
      '18',
      'emi',
      '2022-07-01',
      'active',
      '20000',
      '2023-06-01',
      'Still being repaid',
    ],
  ];
  const esc = (v) => (String(v).includes(',') ? `"${v}"` : v);
  return [headers.join(','), ...examples.map((r) => r.map(esc).join(','))].join('\n') + '\n';
};

const downloadTemplate = () => {
  const blob = new Blob([buildTemplate()], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'historical_loans_template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const BulkImportLoansModal = ({ isOpen, onClose, onSuccess }) => {
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  const handlePick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a .csv file');
      return;
    }
    setFile(f);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select a CSV file first');
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/loans/bulk-import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.created > 0) {
        toast.success(
          `Imported ${data.created} loan${data.created === 1 ? '' : 's'}${data.errors?.length ? ` · ${data.errors.length} skipped` : ''}`,
        );
        onSuccess?.();
      } else {
        toast.warning('No loans were imported');
      }
    } catch (err) {
      console.error('Bulk loan import error:', err);
      toast.error(err?.response?.data?.message || 'Failed to import CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] !p-0 !gap-0 flex flex-col overflow-hidden rounded-[2rem]">
        <DialogHeader className="p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <DialogTitle className="text-xl font-black tracking-tight">
                Import Historical Loans
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-muted-foreground/80 mt-0.5">
                Upload a CSV of past loans (e.g. 2022 records). Real dates are
                preserved and ledgers updated. Invalid rows are reported but do
                not abort the batch.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-zinc-50/30 dark:bg-zinc-900/10">
          {/* Guidance */}
          <div className="flex items-start gap-2.5 p-4 rounded-2xl border border-primary/20 bg-primary/[0.04] text-xs text-foreground/80">
            <Info size={14} className="text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p>
                Use <span className="font-mono font-bold">startDate</span> for the
                real disbursement date (format{' '}
                <span className="font-mono">YYYY-MM-DD</span>). Borrowers are
                matched by CNIC/email, or created automatically.
              </p>
              <p>
                Set <span className="font-mono font-bold">amountPaid</span> to the
                total repaid so far. Tip: download the template, fill a few rows,
                and import a small batch first to confirm it looks right.
              </p>
            </div>
          </div>

          {/* Template + format hint */}
          <div className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border/50 bg-background">
            <div className="space-y-1.5">
              <div className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                CSV Format
              </div>
              <div className="text-xs text-foreground">
                Required:{' '}
                <span className="font-mono font-bold">
                  {REQUIRED_COLUMNS.join(', ')}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Optional:{' '}
                <span className="font-mono">{OPTIONAL_COLUMNS.join(', ')}</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={downloadTemplate}
              className="shrink-0 inline-flex items-center gap-2 rounded-full px-4 py-2 h-auto text-[11px] font-black uppercase tracking-widest"
            >
              <Download size={12} />
              Template
            </Button>
          </div>

          {/* File picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
              Choose CSV file
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/[0.03] transition-colors text-sm font-bold text-muted-foreground"
              >
                <Upload size={16} />
                {file ? file.name : 'Click to select CSV'}
              </button>
              {file && (
                <Button
                  variant="ghost"
                  onClick={reset}
                  disabled={uploading}
                  className="shrink-0"
                  title="Clear selection"
                >
                  <X size={14} />
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handlePick}
                className="hidden"
              />
            </div>
          </div>

          {/* Result panel */}
          {result && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl border border-border/50 bg-background">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                    Total Rows
                  </div>
                  <div className="text-lg font-black mt-1">{result.total}</div>
                </div>
                <div className="p-3 rounded-2xl border border-emerald-200/40 bg-emerald-500/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 size={9} />
                    Imported
                  </div>
                  <div className="text-lg font-black text-emerald-600 mt-1">
                    {result.created}
                  </div>
                </div>
                <div className="p-3 rounded-2xl border border-rose-200/40 bg-rose-500/[0.06]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1">
                    <AlertCircle size={9} />
                    Skipped
                  </div>
                  <div className="text-lg font-black text-rose-600 mt-1">
                    {result.errors?.length || 0}
                  </div>
                </div>
              </div>

              {result.errors?.length > 0 && (
                <div className="rounded-2xl border border-border/50 bg-background overflow-hidden">
                  <div className="px-4 py-2.5 border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Skipped Rows
                  </div>
                  <div className="max-h-48 overflow-y-auto divide-y divide-border/40">
                    {result.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="px-4 py-2 flex items-start gap-2 text-xs"
                      >
                        <span className="font-mono font-black text-rose-500 shrink-0">
                          Row {err.row}
                        </span>
                        <span className="text-muted-foreground">
                          {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-background shrink-0 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={uploading}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em]"
          >
            {result ? 'Done' : 'Cancel'}
          </Button>
          <Button
            variant="gradient"
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 rounded-full font-black text-[11px] uppercase tracking-[0.15em] text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={14} className="mr-2" />
                Import
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportLoansModal;
