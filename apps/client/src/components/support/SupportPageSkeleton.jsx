import { Skeleton } from '@/components/ui/skeleton';

const TicketListItemSkeleton = () => (
  <div className="p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
    <div className="flex items-center justify-between mb-3">
      <Skeleton className="h-5 w-16 rounded-lg" />
      <Skeleton className="h-5 w-20 rounded-lg" />
    </div>
    <Skeleton className="h-4 w-full max-w-[220px] rounded mb-2" />
    <div className="flex items-center gap-2 mt-2">
      <Skeleton className="h-4 w-14 rounded-full" />
      <Skeleton className="h-3 w-24 rounded" />
    </div>
  </div>
);

const MessageBubbleSkeleton = ({ align = 'left' }) => (
  <div
    className={`flex ${align === 'right' ? 'justify-end' : 'justify-start'}`}
  >
    <div
      className={`flex items-end gap-2 max-w-[80%] ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <Skeleton className="h-8 w-8 rounded-full shrink-0" />
      <div className="space-y-1.5">
        <Skeleton
          className={`h-3 w-20 rounded ${align === 'right' ? 'ml-auto' : ''}`}
        />
        <Skeleton
          className={`h-16 rounded-2xl ${align === 'right' ? 'w-64' : 'w-72'}`}
        />
      </div>
    </div>
  </div>
);

const SupportPageSkeleton = () => (
  <div className="relative animate-in fade-in duration-200">
    <div className="space-y-6 relative z-10">
      {/* Page Header (non-card variant) */}
      <div className="mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded" />
        </div>
        <Skeleton className="h-12 w-36 rounded-full" />
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-280px)] min-h-[500px]">
        {/* Ticket List */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-hidden rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4 h-full">
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="flex-1 space-y-3 overflow-hidden pr-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <TicketListItemSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* Ticket Details / Chat */}
        <div className="hidden lg:flex lg:col-span-8 overflow-hidden flex-col h-full">
          <div className="flex-1 flex flex-col border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] rounded-[2rem] overflow-hidden min-h-0">
            {/* Conversation header */}
            <div className="border-b border-slate-100 dark:border-white/[0.06] shrink-0 p-4 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-56 rounded-lg" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-28 rounded-full" />
                    <Skeleton className="h-6 w-32 rounded-lg" />
                  </div>
                </div>
                <Skeleton className="h-9 w-20 rounded-full" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden p-6 space-y-5">
              <MessageBubbleSkeleton align="left" />
              <MessageBubbleSkeleton align="right" />
              <MessageBubbleSkeleton align="left" />
              <MessageBubbleSkeleton align="right" />
              <MessageBubbleSkeleton align="left" />
            </div>

            {/* Composer */}
            <div className="border-t border-slate-100 dark:border-white/[0.06] p-4 shrink-0 flex items-center gap-3">
              <Skeleton className="h-11 flex-1 rounded-full" />
              <Skeleton className="h-11 w-11 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default SupportPageSkeleton;
