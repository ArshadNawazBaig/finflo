import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';

import Pagination from '@/components/ui/Pagination';
import InfiniteLoader from '@/components/InfiniteLoader';

const AmortizationSchedule = ({
  schedule = [],
  paidInstallmentsCount = 0,
  isMobile = false,
  pagination = null,
  hasMore = false,
  isFetchingMore = false,
  observerTarget = null,
}) => {
  if ((!schedule || schedule.length === 0) && !isFetchingMore)
    return (
      <div className="text-center py-20 border-2 border-dashed border-border/50 rounded-[2rem] bg-muted/10">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60 dark:text-muted-foreground/80">
          No schedule available
        </p>
      </div>
    );

  return (
    <div className="bg-white dark:bg-slate-900 overflow-hidden rounded-[2.5rem] border border-border/50 shadow-sm">
      <div className="p-6 sm:p-10 space-y-6 sm:space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black tracking-tighter">
              Payment Schedule
            </h3>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              Projected timeline for all future installments.
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Calendar className="w-5 h-5 text-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {!isMobile ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      #
                    </th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Due Date
                    </th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Principal
                    </th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Interest
                    </th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Total
                    </th>
                    <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {schedule.map((item, index) => {
                    const isPaid = item.installment <= paidInstallmentsCount;
                    return (
                      <tr
                        key={item.installment}
                        className="group hover:bg-muted/5 transition-colors"
                      >
                        <td className="py-4 text-xs font-black">
                          {item.installment}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2 text-xs font-bold">
                            <Calendar
                              size={12}
                              className="text-muted-foreground"
                            />
                            {new Date(item.dueDate).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="py-4 text-xs font-medium">
                          {formatCurrency(item.principal)}
                        </td>
                        <td className="py-4 text-xs font-medium text-muted-foreground">
                          {formatCurrency(item.interest)}
                        </td>
                        <td className="py-4 text-xs font-black text-foreground">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="py-4 text-right">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                            )}
                          >
                            {isPaid ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <Clock size={10} />
                            )}
                            {isPaid ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-4">
              {schedule.map((item) => {
                const isPaid = item.installment <= paidInstallmentsCount;
                return (
                  <div
                    key={item.installment}
                    className="p-5 rounded-3xl border border-border/30 bg-muted/5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-muted/20 flex items-center justify-center text-[10px] font-black">
                          #{item.installment}
                        </div>
                        <div className="text-xs font-black">
                          {new Date(item.dueDate).toLocaleDateString()}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border',
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                        )}
                      >
                        {isPaid ? (
                          <CheckCircle2 size={10} />
                        ) : (
                          <Clock size={10} />
                        )}
                        {isPaid ? 'Paid' : 'Pending'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/10">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                          Principal
                        </p>
                        <p className="text-xs font-bold">
                          {formatCurrency(item.principal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                          Interest
                        </p>
                        <p className="text-xs font-bold text-muted-foreground">
                          {formatCurrency(item.interest)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        Total Installment
                      </p>
                      <p className="text-lg font-black">
                        {formatCurrency(item.amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Infinite Scroll Trigger for Mobile */}
        {isMobile && hasMore && (
          <div ref={observerTarget}>
            <InfiniteLoader isFetchingMore={isFetchingMore} />
          </div>
        )}
      </div>

      {/* Pagination for Desktop */}
      {!isMobile && pagination && <Pagination {...pagination} />}
    </div>
  );
};

export default AmortizationSchedule;
