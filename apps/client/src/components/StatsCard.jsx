import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { SensitiveBalance } from '@/components/ui/SensitiveData';

// Color prop comes in as one or more classes (e.g. "bg-emerald-500 shadow-emerald-500/20").
// Extract the `bg-*` class so we can derive a soft tint for the chip and a saturated
// matching text colour for the icon glyph.
const parseColor = (raw = '') => {
  const bgClass =
    raw.split(/\s+/).find((cls) => /^bg-[a-z]+(-\d+)?$/.test(cls)) ||
    raw.split(/\s+/).find((cls) => cls.startsWith('bg-')) ||
    'bg-primary';
  return {
    chipBg: `${bgClass}/10`,
    iconColor: bgClass.replace(/^bg-/, 'text-'),
  };
};

const StatsCard = ({
  title,
  amount,
  percentage,
  icon,
  color,
  subtitle,
  badge,
  badgeTooltip,
  sensitive = false,
}) => {
  const hasDelta = percentage !== undefined && percentage !== null;
  const isPositive = hasDelta && percentage >= 0;
  const { chipBg, iconColor } = parseColor(color);

  return (
    <div className="group relative rounded-[1.5rem] bg-white dark:bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-20px_rgba(15,23,42,0.18)] border border-slate-100 dark:border-white/[0.06]">
      {/* Top row — eyebrow + icon chip */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {title}
          </p>
          {badge &&
            (badgeTooltip ? (
              <Tooltip content={badgeTooltip}>
                <span className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                  {badge}
                </span>
              </Tooltip>
            ) : (
              <span className="inline-flex items-center bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit">
                {badge}
              </span>
            ))}
        </div>

        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5',
            chipBg,
            iconColor,
          )}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums capitalize leading-none mb-2">
        {sensitive ? (
          <SensitiveBalance iconSize={14}>{amount}</SensitiveBalance>
        ) : (
          amount
        )}
      </h3>

      {/* Bottom row — delta + subtitle */}
      {(hasDelta || subtitle) && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold">
          {hasDelta && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-bold',
                isPositive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-500 dark:text-rose-400',
              )}
            >
              {isPositive ? (
                <ArrowUpRight size={12} strokeWidth={3} />
              ) : (
                <ArrowDownRight size={12} strokeWidth={3} />
              )}
              {isPositive ? '+' : ''}
              {Number(percentage).toFixed(2)}%
            </span>
          )}
          {subtitle && (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
