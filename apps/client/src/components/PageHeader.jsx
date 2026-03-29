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

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden',
        isCard
          ? 'bg-white dark:bg-slate-900/50 p-5 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-sm'
          : 'mb-6 sm:mb-8', // Reduced margin as well
        className,
      )}
    >
      {/* Decorative Icon for card variant */}
      {isCard && Icon && (
        <Icon className="absolute -right-12 -top-12 w-64 h-64 opacity-[0.03] text-primary pointer-events-none" />
      )}

      <div className="flex items-center gap-4 relative z-10">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2.5 rounded-full hover:bg-muted border border-border/50 text-muted-foreground hover:text-foreground transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        )}

        <div className="space-y-1 relative">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground capitalize">
              {renderTitle()}
            </h1>
            {badge && <div className="flex items-center">{badge}</div>}
          </div>
          {description && (
            <div className="text-muted-foreground text-xs font-medium opacity-80 max-w-2xl leading-relaxed">
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
