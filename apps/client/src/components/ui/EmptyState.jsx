import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const EmptyState = ({ icon: Icon, title, description, className, action }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center p-8 rounded-[2rem] border border-dashed border-border/60 bg-muted/5 backdrop-blur-sm  overflow-hidden relative',
        className,
      )}
    >
      {/* Decorative Background Blob */}
      <div className="absolute -top-12 -left-12 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: 'spring',
          stiffness: 260,
          damping: 20,
          delay: 0.1,
        }}
        className="mb-4 p-4 rounded-2xl bg-gradient-to-br from-background to-muted/50 border border-border/40 shadow-sm text-muted-foreground/60"
      >
        <Icon className="w-8 h-8" strokeWidth={1.5} />
      </motion.div>

      <div className="text-center space-y-1 relative z-10">
        <h3 className="text-sm font-black uppercase tracking-tight text-foreground/80">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground font-medium max-w-[200px] mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6"
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  );
};

export default EmptyState;
