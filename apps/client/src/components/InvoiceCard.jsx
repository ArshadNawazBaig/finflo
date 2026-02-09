import {
  Download,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

const InvoiceCard = ({ invoice }) => {
  const statusColors = {
    paid: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    open: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    void: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    uncollectible: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const statusIcons = {
    paid: <CheckCircle2 size={14} />,
    open: <Clock size={14} />,
    void: <AlertCircle size={14} />,
    uncollectible: <AlertCircle size={14} />,
  };

  const status = invoice.status?.toLowerCase() || 'open';

  const formatLocalDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-black tracking-tight text-foreground/90 mb-1">
            Invoice {invoice.number || invoice._id.slice(-8).toUpperCase()}
          </h4>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Calendar size={12} className="text-primary" />
            {formatLocalDate(invoice.date)}
          </div>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusColors[status] || statusColors.open}`}
        >
          {statusIcons[status] || statusIcons.open}
          {status}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 rounded-2xl bg-muted/20 border border-border/10">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Amount
          </p>
          <p className="text-base font-black text-foreground flex items-center gap-1">
            <DollarSign size={14} className="text-primary" />
            {invoice.amount?.toFixed(2)}
          </p>
        </div>
        <div className="p-3 rounded-2xl bg-muted/20 border border-border/10">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Period
          </p>
          <p className="text-[10px] font-bold text-muted-foreground leading-tight">
            {formatLocalDate(invoice.periodStart)} -{' '}
            {formatLocalDate(invoice.periodEnd)}
          </p>
        </div>
      </div>

      {invoice.url && (
        <a
          href={invoice.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 rounded-xl bg-primary/10 text-primary text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all active:scale-[0.98]"
        >
          <Download size={16} />
          Download PDF
        </a>
      )}
    </div>
  );
};

export default InvoiceCard;
