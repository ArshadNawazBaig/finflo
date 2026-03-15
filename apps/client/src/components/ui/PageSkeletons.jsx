import { Skeleton } from '@/components/ui/skeleton';

export const PageHeaderSkeleton = () => (
  <div className="px-6 pt-6 pb-4 border-b border-border/40 flex items-center justify-between animate-in fade-in duration-200">
    <div className="flex flex-col gap-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-32 rounded-[2rem]" />
      <Skeleton className="h-10 w-10 rounded-full" />
    </div>
  </div>
);

export const TablePageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border/40 overflow-hidden bg-card">
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
    </div>
  </div>
);

export const CardsPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/40 p-6 bg-card space-y-4">
            <div className="flex justify-between items-start">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-6 w-20 rounded-full" />
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
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      {/* Profile Header */}
      <div className="rounded-3xl border border-border/40 p-6 lg:p-10 bg-card flex flex-col md:flex-row items-center gap-8">
        <Skeleton className="h-32 w-32 rounded-full shrink-0" />
        <div className="flex-1 space-y-4 text-center md:text-left">
          <Skeleton className="h-8 w-64 mx-auto md:mx-0" />
          <Skeleton className="h-5 w-48 mx-auto md:mx-0" />
          <div className="flex flex-wrap gap-3 justify-center md:justify-start mt-4">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>
      
      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-border/40 p-6 bg-card space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        <div className="md:col-span-2 rounded-2xl border border-border/40 p-6 bg-card space-y-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const SettingsPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-6 flex gap-8 overflow-auto">
      {/* Sidebar navigation */}
      <div className="hidden md:block w-64 space-y-2 shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-xl" />
        ))}
      </div>
      
      {/* Content area */}
      <div className="flex-1 space-y-8 max-w-3xl">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="rounded-2xl border border-border/40 bg-card divide-y divide-border/20">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="p-6 flex items-center justify-between">
                  <div className="space-y-2 w-2/3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const MembersPageSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <PageHeaderSkeleton />
    <div className="flex-1 p-6 space-y-6 overflow-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
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
