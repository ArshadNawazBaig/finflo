import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const InfiniteLoader = ({ isFetchingMore, className }) => {
  if (!isFetchingMore)
    return (
      <div className="h-24 w-full flex items-center justify-center pointer-events-none opacity-0" />
    );

  return (
    <div
      className={cn(
        'py-12 flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in-95 duration-500',
        className,
      )}
    >
      <div className="relative group">
        {/* Outer Glow */}
        <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-xl group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-pulse" />

        {/* Spinner Container */}
        <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-card/50 backdrop-blur-xl border border-border/50 shadow-2xl overflow-hidden">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />

          {/* Animated Background Gradient Track */}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 animate-pulse" />
          <div className="absolute inset-0 animate-shimmer pointer-events-none" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/80 animate-pulse">
          Retrieving Data
        </span>
        <div className="flex gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary/80 animate-bounce" />
        </div>
      </div>
    </div>
  );
};

export default InfiniteLoader;
