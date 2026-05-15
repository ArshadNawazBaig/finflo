import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const SITE_NAME = 'Finflo Banking OS';

const PageHeader = ({
  title,
  description,
  onBack,
  badge,
  eyebrow,
  icon: Icon,
  variant = 'simple',
  bodyClassName,
  className,
  action,
  children,
}) => {
  const isCard = variant === 'card';

  // Auto-update browser tab title
  useEffect(() => {
    if (title && typeof title === 'string') {
      document.title = `${title} | ${SITE_NAME}`;
    }
    return () => {
      document.title = SITE_NAME;
    };
  }, [title]);

  // Helper to split title and color the last word
  const renderTitle = () => {
    if (typeof title !== 'string') return title;

    const words = title.trim().split(' ');
    if (words.length <= 1) return title;

    const lastWord = words.pop();
    const remaining = words.join(' ');

    return (
      <>
        {remaining} <span className="text-primary">{lastWord}</span>
      </>
    );
  };

  // Derive a sensible default eyebrow from the first word(s) of the title
  const derivedEyebrow =
    eyebrow ||
    (typeof title === 'string' && title.trim().length > 0
      ? title.trim().split(' ').slice(0, 1).join(' ')
      : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'flex flex-col md:flex-row justify-between items-start md:items-start gap-6 relative',
        isCard
          ? 'bg-white dark:bg-white/[0.02] p-5 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]'
          : 'mb-6 sm:mb-8',
        className,
      )}
    >
      {/* Decorative Icon for card variant */}
      {isCard && Icon && (
        <div className="absolute inset-0 overflow-hidden rounded-[2rem] pointer-events-none">
          <Icon className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary" />
        </div>
      )}

      <div className="flex items-center gap-4 relative z-10 max-w-2xl">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-100 dark:border-white/[0.06] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all group shrink-0"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <div className="space-y-2 relative">
          {derivedEyebrow && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {derivedEyebrow}
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-[-0.035em] leading-tight text-slate-900 dark:text-white capitalize">
              {renderTitle()}
            </h1>
            {badge && <div className="flex items-center">{badge}</div>}
          </div>
          {description && (
            <div className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium max-w-2xl">
              {description}
            </div>
          )}
        </div>
      </div>

      {(children || action) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className={cn(
            'flex items-center gap-3 relative z-10 w-full md:w-auto',
            bodyClassName,
          )}
        >
          {children || action}
        </motion.div>
      )}
    </motion.div>
  );
};

export default PageHeader;
