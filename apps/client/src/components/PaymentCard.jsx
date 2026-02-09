import { Calendar, User, DollarSign, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const PaymentCard = ({ payment }) => {
  if (!payment) return null;

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all duration-500 group relative overflow-hidden">
      {/* Background Decorative Element */}
      <DollarSign className="absolute -right-6 -bottom-6 w-32 h-32 opacity-[0.03] text-primary group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 shadow-lg shadow-primary/5">
            <User size={22} />
          </div>
          <div>
            <h4 className="font-black tracking-tight text-foreground transition-colors group-hover:text-primary">
              {payment.user?.name}
            </h4>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[150px]">
              {payment.user?.email}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black text-primary">
            ${payment.amount?.toLocaleString()}
          </div>
          <span
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mt-1 shadow-sm',
              payment.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-600 border border-red-500/20',
            )}
          >
            {payment.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
        <div className="space-y-1">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] block">
            Plan Type
          </span>
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-primary/70" />
            <span className="text-xs font-black uppercase text-foreground/80">
              {payment.plan}
            </span>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] block">
            Transaction Date
          </span>
          <div className="flex items-center gap-2 justify-end">
            <Calendar size={12} className="text-primary/70" />
            <span className="text-xs font-black text-foreground/80">
              {new Date(payment.date).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Glimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-700">
        <div className="absolute inset-0 animate-shimmer" />
      </div>
    </div>
  );
};

export default PaymentCard;
