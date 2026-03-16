import { Skeleton } from '@/components/ui/skeleton';

export const PageHeaderSkeleton = () => (
  <div className="px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-border/40 flex items-center justify-between animate-in fade-in duration-200">
    <div className="flex flex-col gap-1.5 md:gap-2">
      <Skeleton className="h-6 md:h-8 w-32 md:w-48" />
      <Skeleton className="h-3 md:h-4 w-48 md:w-72" />
    </div>
    <div className="flex items-center gap-2 md:gap-3">
      <Skeleton className="h-8 md:h-10 w-24 md:w-32 rounded-[2rem]" />
      <Skeleton className="h-8 md:h-10 w-8 md:w-10 rounded-full" />
    </div>
  </div>
);

export const TablePageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 md:mb-6">
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-2xl border border-border/40 overflow-hidden bg-card">
        <div className="h-12 border-b border-border/40 bg-muted/50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-border/20 last:border-0">
            <div className="flex gap-4 items-center">
               <Skeleton className="h-10 w-10 rounded-full" />
               <div className="space-y-2">
                 <Skeleton className="h-4 w-32" />
                 <Skeleton className="h-3 w-24" />
               </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-4 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-border/10">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const CardsPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 md:mb-6">
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-10 md:h-12 w-10 md:w-12 rounded-xl" />
              <Skeleton className="h-5 md:h-6 w-16 md:w-20 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="pt-4 border-t border-border/20">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ProfilePageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto">
      {/* Profile Header */}
      <div className="rounded-2xl md:rounded-3xl border border-border/40 p-6 md:p-10 bg-card flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
        <Skeleton className="h-24 md:h-32 w-24 md:w-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-3 md:space-y-4 w-full">
          <Skeleton className="h-7 md:h-8 w-48 md:w-64 mx-auto md:mx-0" />
          <Skeleton className="h-4 md:h-5 w-32 md:w-48 mx-auto md:mx-0" />
          <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mt-4">
            <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
            <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4">
          <Skeleton className="h-6 w-32 mb-2 md:mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="md:col-span-2 rounded-2xl border border-border/40 p-5 md:p-6 bg-card space-y-4">
          <Skeleton className="h-6 w-32 mb-2 md:mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 md:h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const SettingsPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6 md:gap-8 overflow-auto">
      {/* Sidebar navigation (Desktop) */}
      <div className="hidden md:block w-64 space-y-2 shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>

      {/* Sidebar navigation (Mobile Tabs) */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2 shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-lg" />
        ))}
      </div>
      
      {/* Content area */}
      <div className="flex-1 space-y-6 md:space-y-8 max-w-3xl">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="rounded-2xl border border-border/40 bg-card divide-y divide-border/20">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="p-4 md:p-6 flex items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-6 w-10 md:w-12 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const AdminDashboardSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 space-y-6 md:space-y-8 overflow-auto">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-4 md:p-6 bg-card space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 md:h-10 w-8 md:w-10 rounded-xl" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-7 md:h-8 w-32" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts / Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-border/40 p-5 md:p-8 bg-card space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-[200px] md:h-[300px] w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-border/40 p-5 md:p-8 bg-card space-y-6">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

export const ReportsSkeleton = () => (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
      <PageHeaderSkeleton />
      <div className="flex-1 p-4 md:p-6 space-y-6 overflow-auto">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-border/40 p-6 bg-card space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="rounded-2xl border border-border/40 p-6 bg-card space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        </div>
      </div>
    </div>
);

export const ChatSkeleton = () => (
    <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
        <PageHeaderSkeleton />
        <div className="flex-1 flex overflow-hidden">
            {/* Sidebar (Desktop) */}
            <div className="hidden md:flex w-80 border-r border-border/40 flex-col bg-card/50">
                <div className="p-4 border-b border-border/40">
                    <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="p-3 flex items-center gap-3 rounded-xl border border-transparent">
                            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-background">
                {/* Chat Header */}
                <div className="p-4 border-b border-border/40 flex items-center justify-between bg-card/30">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                </div>
                {/* Messages */}
                <div className="flex-1 p-4 space-y-6 overflow-auto">
                    {[0, 1, 0, 1, 0].map((align, i) => (
                        <div key={i} className={`flex ${align ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] space-y-2 ${align ? 'items-end' : 'items-start'}`}>
                                <Skeleton className={`h-12 md:h-16 w-[150px] md:w-[250px] ${align ? 'rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl' : 'rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'}`} />
                                <Skeleton className="h-2 w-12" />
                            </div>
                        </div>
                    ))}
                </div>
                {/* Input Area */}
                <div className="p-4 border-t border-border/40 bg-card/30">
                    <div className="flex gap-3">
                        <Skeleton className="h-11 flex-1 rounded-2xl" />
                        <Skeleton className="h-11 w-11 rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export const MembersPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-4 md:p-6 space-y-4 md:space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-2 md:mb-6">
        <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        <Skeleton className="h-10 w-full sm:w-32 rounded-xl" />
      </div>

      {/* Desktop Table Skeleton */}
      <div className="hidden md:block rounded-2xl border border-border/40 overflow-hidden bg-card">
        <div className="h-12 border-b border-border/40 bg-muted/50" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-4 border-b border-border/20 last:border-0"
          >
            <div className="flex gap-4 items-center">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile Cards Skeleton */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/40 p-5 bg-card space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="pt-4 border-t border-border/20">
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
