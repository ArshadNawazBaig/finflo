import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const StatsCard = ({
  title,
  amount,
  percentage,
  icon,
  color,
  subtitle,
  badge,
  badgeTooltip,
}) => {
  const isPositive = percentage > 0;

  return (
    <div className="group relative rounded-[2rem] bg-card p-5 sm:p-7 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10 border border-border/50">
      {/* Background Accent Gradient Wrapper */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
        <div
          className={cn(
            'absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-[0.03] transition-all duration-700 group-hover:scale-150 group-hover:opacity-[0.07]',
            color.split(' ')[0],
          )}
        />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between space-y-4">
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-2xl shadow-inner transition-transform duration-500 group-hover:rotate-12',
              color,
              'bg-opacity-10 text-current overflow-hidden relative',
            )}
          >
            <div className={cn('absolute inset-0 opacity-100', color)} />
            <div className="relative z-10 text-white">{icon}</div>
          </div>
          <div className="flex items-center gap-2">
            {badge &&
              (badgeTooltip ? (
                <Tooltip content={badgeTooltip}>
                  <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 hover:brightness-110">
                    {badge}
                  </div>
                </Tooltip>
              ) : (
                <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 hover:brightness-110">
                  {badge}
                </div>
              ))}
            {percentage !== undefined && (
              <div
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-300',
                  isPositive
                    ? 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white'
                    : 'bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white',
                )}
              >
                {isPositive ? (
                  <div className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {Math.abs(percentage)}%
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <TrendingDown size={12} />
                    {Math.abs(percentage)}%
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-md bg-primary/10 text-primary inline-flex w-fit shadow-sm border border-primary/20">
            {title}
          </p>
          <div className="flex flex-col">
            <h3 className="text-3xl font-black tracking-tight text-foreground tabular-nums capitalize">
              {amount}
            </h3>
            {subtitle && (
              <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-wider">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
