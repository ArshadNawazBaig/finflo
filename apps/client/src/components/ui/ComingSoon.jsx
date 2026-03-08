import { cn } from '@/lib/utils';

/**
 * @param {Object} props
 * @param {string} props.title
 * @param {string} props.description
 * @param {React.ElementType} props.icon - Lucide icon component
 * @param {string[]} [props.badges] - Optional list of badges to show
 * @param {string} [props.className]
 */
const ComingSoon = ({
  title,
  description,
  icon: Icon,
  badges = [],
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full flex-1 flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-500',
        className,
      )}
    >
      {Icon && (
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <div className="relative w-24 h-24 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Icon size={48} className="animate-pulse" />
          </div>
        </div>
      )}

      <h3 className="text-3xl font-black tracking-tighter mb-3">{title}</h3>
      <p className="max-w-md text-muted-foreground font-medium leading-relaxed">
        {description}
      </p>

      {badges.length > 0 && (
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {badges.map((badge) => (
            <span
              key={badge}
              className="px-4 py-2 rounded-full bg-muted/30 border border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComingSoon;
