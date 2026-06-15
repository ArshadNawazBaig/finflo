/* eslint-disable react/prop-types -- project convention: no propTypes */
/* Admin/business page skeletons. Re-exported via ../PageSkeletons.jsx. */
import { Skeleton } from '@/components/ui/skeleton';
import {
  CardsSkeleton,
  TableSkeleton,
  PageHeaderSkeleton,
} from './sharedSkeletons';

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
// Matches: PageHeader → Quick Actions (pill row) → 4 StatsCards →
//          xl:grid-cols-3 (2×2 mini-stats + risk donut) →
//          xl:grid-cols-3 (Chart + Activity)

export const AdminDashboardSkeleton = () => (
  <div className="space-y-10 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Quick Actions — horizontal flex pills */}
    <div className="flex flex-wrap gap-3 sm:gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton
          key={i}
          className="flex-1 min-w-[240px] h-[3.625rem] rounded-full"
        />
      ))}
    </div>

    {/* Primary Stats Row — 4 cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] p-5 bg-white dark:bg-white/[0.02]"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          </div>
          <Skeleton className="h-7 w-28 rounded mb-3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-10 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        </div>
      ))}
    </div>

    {/* ROW 1 — 2×2 mini-stat cards (left 2/3) + Portfolio Risk donut (right 1/3) */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
      {/* Left: 2×2 grid */}
      <div className="xl:col-span-2 grid grid-cols-2 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-white/[0.02] p-5 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-20 rounded-full" />
              <Skeleton className="h-7 w-7 rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-2.5 w-28 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Right: Portfolio Risk card */}
      <div className="xl:col-span-1 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-6 space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-2.5 w-48 rounded" />
        </div>
        <div className="flex items-center justify-between gap-4 pt-2">
          <Skeleton className="h-[150px] w-[150px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
                <Skeleton className="h-2.5 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* ROW 2 — Cash Flow chart (left 2/3) + Activity feed (right 1/3) */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-10">
      {/* Chart */}
      <div className="xl:col-span-2 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-2.5 w-48 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-[260px] w-full rounded-2xl" />
      </div>

      {/* Activity feed */}
      <div className="xl:col-span-1 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden flex flex-col">
        <div className="p-5 sm:p-6 flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-16 rounded-full" />
            <Skeleton className="h-5 w-32 rounded" />
            <Skeleton className="h-2.5 w-40 rounded" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <div className="p-5 sm:p-6 pt-0 space-y-5 flex-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-1/2 rounded" />
                <Skeleton className="h-2 w-1/3 rounded" />
              </div>
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Transactions / Generic Table Page ────────────────────────────────────────
// Matches: PageHeader → 4 stats → filter bar (search + date + icon buttons) → table

export const TablePageSkeleton = ({ headerActions = 1 } = {}) => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton actions={headerActions} />

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Filter bar */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
        <Skeleton className="h-11 w-full sm:min-w-[300px] rounded-full" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-11 flex-1 sm:w-48 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        </div>
      </div>
    </div>

    {/* Desktop Table */}
    <TableSkeleton rows={8} columns={6} />
  </div>
);

export const RegistryPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Filter bar */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-white/[0.02] p-5 rounded-[2rem] border border-slate-100 dark:border-white/[0.06]">
      <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full justify-between">
        <Skeleton className="h-11 w-full sm:min-w-[300px] rounded-full" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Skeleton className="h-11 flex-1 sm:w-48 rounded-full" />
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          <Skeleton className="h-11 w-11 rounded-full shrink-0" />
        </div>
      </div>
    </div>

    {/* Desktop Table */}
    <TableSkeleton rows={8} columns={6} />
  </div>
);

// ─── Loans Page ───────────────────────────────────────────────────────────────
// Matches: PageHeader → 4 stats → search bar → table

export const LoansPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Search bar */}
    <Skeleton className="h-11 w-full sm:w-72 rounded-full" />

    {/* Desktop Table */}
    <div className="mt-4 hidden md:block rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
      <div className="h-12 border-b border-slate-100 dark:border-white/[0.06]" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0"
        >
          <div className="flex gap-4 items-center flex-1">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-2.5 w-24 rounded" />
            </div>
          </div>
          <Skeleton className="h-3 w-24 mx-4 rounded" />
          <Skeleton className="h-5 w-20 rounded-full mx-4" />
          <Skeleton className="h-3 w-28 mx-4 rounded" />
          <Skeleton className="h-8 w-8 rounded-full ml-4" />
        </div>
      ))}
    </div>

    {/* Mobile Cards */}
    <div className="mt-4 md:hidden space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] p-4 bg-white dark:bg-white/[0.02] space-y-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-1/2 rounded" />
              <Skeleton className="h-2.5 w-1/3 rounded" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Members Page ─────────────────────────────────────────────────────────────
// Matches: PageHeader + button → 4 stats → tabs + search + branch filter → table

export const MembersPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Tabs + Search + Filter row */}
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-white/[0.04] p-1 rounded-full w-full sm:w-auto">
          <Skeleton className="flex-1 sm:w-32 h-9 rounded-full" />
          <Skeleton className="flex-1 sm:w-36 h-9 rounded-full" />
        </div>
        {/* Search + branch filter */}
        <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
          <Skeleton className="h-11 w-full sm:w-64 rounded-full" />
          <Skeleton className="h-11 w-full sm:w-48 rounded-full" />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden">
        <div className="h-12 border-b border-slate-100 dark:border-white/[0.06]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0"
          >
            <div className="flex gap-4 items-center flex-1">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-2.5 w-24 rounded" />
              </div>
            </div>
            <Skeleton className="h-3 w-24 mx-4 rounded" />
            <Skeleton className="h-5 w-20 rounded-full mx-4" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        ))}
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] p-5 bg-white dark:bg-white/[0.02] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-2.5 w-16 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-full rounded" />
              <Skeleton className="h-3 w-2/3 rounded" />
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-white/[0.06]">
              <Skeleton className="h-10 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Activity Logs Page ───────────────────────────────────────────────────────
// Matches: PageHeader (with pill) → Search & Filters row → Table

export const ActivityLogsPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Search & Filters */}
    <div className="flex flex-col lg:flex-row gap-3">
      <Skeleton className="h-11 flex-1 rounded-full min-w-[200px]" />
      <div className="flex gap-3">
        <Skeleton className="h-11 w-full sm:w-[180px] rounded-full" />
        <Skeleton className="h-11 w-full sm:w-[180px] rounded-full" />
      </div>
    </div>

    {/* Desktop Table */}
    <div className="hidden md:block rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden mt-2">
      <div className="h-12 border-b border-slate-100 dark:border-white/[0.06]" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/[0.06] last:border-0"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="space-y-1">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2.5 w-32 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded-full" />
            <Skeleton className="h-3 w-28 rounded" />
          </div>
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-3 w-64 rounded" />
        </div>
      ))}
    </div>

    {/* Mobile Cards */}
    <div className="md:hidden space-y-4 mt-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1.5rem] border border-slate-100 dark:border-white/[0.06] p-4 bg-white dark:bg-white/[0.02] space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-2.5 w-32 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-3 rounded-full" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Branches / Cards Page ────────────────────────────────────────────────────
// Matches: PageHeader → search bar (max-w-md) → 3-col card grid
// Each branch card: gradient header (h-32) + offset logo + body with address/phone rows

export const CardsPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Search bar */}
    <Skeleton className="h-11 max-w-md w-full rounded-full" />

    {/* Branch Cards grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden"
        >
          {/* Banner header */}
          <div className="h-32 bg-slate-50 dark:bg-white/[0.04] relative">
            <div className="absolute bottom-0 left-6 translate-y-1/2">
              <Skeleton className="h-20 w-20 rounded-full border-4 border-white dark:border-card" />
            </div>
          </div>

          {/* Body */}
          <div className="pt-14 px-6 pb-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="space-y-1.5">
                <Skeleton className="h-2.5 w-20 rounded-full" />
                <Skeleton className="h-5 w-32 rounded" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 flex-1 rounded" />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-3 w-32 rounded" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Reports / Analytics Page ─────────────────────────────────────────────────
// Matches: PageHeader → tab bar (5 tabs) → 4 stats → 2-col chart grid

export const ReportsSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Tab bar */}
    <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-32 shrink-0 rounded-full" />
      ))}
    </div>

    {/* Stats Cards */}
    <CardsSkeleton count={4} />

    {/* Chart Grid — 2 cols */}
    <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-20 rounded-full" />
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-2.5 w-52 rounded" />
            </div>
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-[350px] w-full rounded-2xl" />
        </div>
      ))}
    </div>
  </div>
);

// ─── Settings Page ────────────────────────────────────────────────────────────
// Matches: PageHeader → lg:grid-cols-4
//   aside (1 col): glassmorphism card with 4 nav buttons + purple account-health card
//   main (3 col): 3 stacked section cards

export const SettingsPageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200 pb-12">
    {/* Page Header */}
    <PageHeaderSkeleton />

    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
      {/* Sidebar */}
      <aside className="lg:col-span-1 space-y-4">
        {/* Nav tabs card */}
        <div className="p-2 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] space-y-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-[1.5rem]"
            >
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-2 w-32 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Account-health card */}
        <div className="p-5 rounded-[2rem] bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] space-y-4">
          <Skeleton className="h-2.5 w-32 rounded-full" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-14 rounded-full" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:col-span-3 space-y-6">
        {/* Section card 1 — Profile Information */}
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1.5">
              <Skeleton className="h-2.5 w-20 rounded-full" />
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-8 py-4">
            <Skeleton className="h-24 w-24 rounded-full shrink-0" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded" />
              <Skeleton className="h-3 w-48 rounded" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          </div>
        </div>

        {/* Section card 2 — Appearance */}
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 sm:p-8 space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-6 w-36 rounded" />
            <Skeleton className="h-3 w-64 rounded" />
          </div>
          {/* Theme toggle buttons */}
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
          {/* Color palette */}
          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-4 w-28 rounded-full" />
            </div>
            <div className="flex gap-3 flex-wrap pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-8 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Section card 3 — Notifications */}
        <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 sm:p-8 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-6 w-36 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/[0.06]"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-56 rounded" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </main>
    </div>
  </div>
);

// ─── Profile Page (MemberProfile, StaffProfile, BranchDetail, etc.) ───────────
// Matches: PageHeader → profile banner card → 3-col grid: info card + 2-col tabs/details

export const ProfilePageSkeleton = () => (
  <div className="space-y-8 animate-in fade-in duration-200">
    {/* Page Header */}
    <PageHeaderSkeleton />

    {/* Profile Banner */}
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-6 md:p-10 bg-white dark:bg-white/[0.02] flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
      <Skeleton className="h-24 md:h-28 w-24 md:w-28 rounded-full shrink-0" />
      <div className="flex-1 space-y-3 md:space-y-3 w-full">
        <Skeleton className="h-2.5 w-24 rounded-full mx-auto md:mx-0" />
        <Skeleton className="h-7 md:h-8 w-48 md:w-64 mx-auto md:mx-0 rounded" />
        <Skeleton className="h-3 w-32 md:w-48 mx-auto md:mx-0 rounded" />
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:justify-start mt-3">
          <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
          <Skeleton className="h-8 w-20 md:w-24 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
    </div>

    {/* Details Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
      {/* Info card (1 col) */}
      <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-5 md:p-6 bg-white dark:bg-white/[0.02] space-y-4">
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-20 rounded-full" />
          <Skeleton className="h-5 w-32 rounded" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-2.5 w-20 rounded-full" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        ))}
      </div>
      {/* Wide content area (2 col) */}
      <div className="md:col-span-2 rounded-[2rem] border border-slate-100 dark:border-white/[0.06] p-5 md:p-6 bg-white dark:bg-white/[0.02] space-y-4">
        {/* Tab buttons */}
        <div className="flex gap-2 overflow-x-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 md:h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

// ─── Chat Page ────────────────────────────────────────────────────────────────
// Matches: sidebar (contact list) + chat area (header + messages + input)
// Note: Chat uses its own internal header, not <PageHeader>

export const ChatSkeleton = () => (
  <div className="flex-1 h-full flex flex-col min-h-0 overflow-hidden animate-in fade-in duration-200">
    <div className="flex-1 flex overflow-hidden">
      {/* Contact Sidebar (Desktop) */}
      <div className="hidden md:flex w-80 border-r border-slate-100 dark:border-white/[0.06] flex-col bg-white dark:bg-white/[0.02]">
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06]">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-3 flex items-center gap-3 rounded-2xl">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-2.5 w-1/2 rounded" />
              </div>
              <Skeleton className="h-2.5 w-10 shrink-0 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between bg-white dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-2.5 w-16 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 space-y-6 overflow-auto">
          {[false, true, false, true, false].map((isRight, i) => (
            <div
              key={i}
              className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`space-y-2 ${isRight ? 'items-end' : 'items-start'} flex flex-col`}
              >
                <Skeleton
                  className={`h-14 md:h-16 w-[160px] md:w-[260px] ${
                    isRight
                      ? 'rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                      : 'rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl'
                  }`}
                />
                <Skeleton className="h-2 w-12" />
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02]">
          <div className="flex gap-3">
            <Skeleton className="h-11 flex-1 rounded-full" />
            <Skeleton className="h-11 w-11 rounded-full shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
