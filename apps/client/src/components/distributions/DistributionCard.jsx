import { Calendar, Users } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import MemberAvatar from '@/components/member/MemberAvatar';

const DistributionCard = ({ dist, innerRef }) => {
  return (
    <div
      ref={innerRef}
      className="p-5 rounded-[2rem] border border-border/50 bg-background/40 hover:bg-muted/10 transition-all duration-300 group shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <MemberAvatar
            name={dist.member?.name || 'M'}
            profilePicture={dist.member?.profilePicture}
            size={40}
            rounded="rounded-xl"
            className={cn(
              'text-xs',
              dist.type === 'share'
                ? 'bg-indigo-500/10 text-indigo-500'
                : 'bg-primary/10 text-primary',
            )}
          />
          <div>
            <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
              {dist.member?.name || 'Unknown Member'}
            </div>
            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
              <Calendar size={10} />
              {dist.period}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
              dist.type === 'share'
                ? 'bg-indigo-500/10 text-indigo-500'
                : dist.type === 'saving'
                  ? 'bg-teal-500/10 text-teal-600'
                  : 'bg-emerald-500/10 text-emerald-500',
            )}
          >
            {dist.type === 'share'
              ? 'Share'
              : dist.type === 'saving'
                ? 'Saving'
                : 'Regular'}
          </span>
          <div
            className={cn(
              'text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border leading-none',
              dist.status === 'Completed' &&
                'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
              dist.status === 'Pending' &&
                'bg-amber-500/10 text-amber-600 border-amber-500/20',
              dist.status === 'Failed' &&
                'bg-rose-500/10 text-rose-600 border-rose-500/20',
            )}
          >
            {dist.status || 'Completed'}
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="text-lg font-black text-foreground">
            {formatCurrency(dist.amount)}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
              <Users size={10} />
              {dist.method === 'custom' ? 'Custom' : 'Proportional'}
            </span>
            {dist.profitRate && (
              <span className="text-[10px] text-primary font-black uppercase tracking-widest">
                • {dist.profitRate}% Rate
              </span>
            )}
          </div>
        </div>
        <div className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest italic">
          {formatDate(dist.date)}
        </div>
      </div>
    </div>
  );
};

export default DistributionCard;
