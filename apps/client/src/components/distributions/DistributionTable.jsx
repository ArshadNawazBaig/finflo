import { Calendar, Users, History } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import Pagination from '../ui/Pagination';

const DistributionTable = ({ data, pagination, loading, lastElementRef }) => {
  return (
    <div className="w-full bg-card/10 backdrop-blur-sm border border-border/40 rounded-[2.5rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted/30">
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Member / Period
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Amount
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Type
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Method
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Date
              </th>
              <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {data.length > 0 ? (
              data.map((dist, index) => (
                <tr
                  key={dist._id}
                  className="group hover:bg-muted/20 transition-all duration-300"
                >
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'min-w-10 min-h-10 rounded-xl flex items-center justify-center font-black text-xs',
                          dist.type === 'share'
                            ? 'bg-indigo-500/10 text-indigo-500'
                            : 'bg-primary/10 text-primary',
                        )}
                      >
                        {dist.member?.name?.[0]?.toUpperCase() || 'M'}
                      </div>
                      <div>
                        <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
                          {dist.member?.name || 'Unknown Member'}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                          <Calendar size={10} />
                          {dist.period}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-foreground">
                      {formatCurrency(dist.amount)}
                    </div>
                    {dist.profitRate && (
                      <div className="text-[10px] text-muted-foreground font-medium">
                        {dist.profitRate}% Rate
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span
                      className={cn(
                        'inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                        dist.type === 'share'
                          ? 'bg-indigo-500/10 text-indigo-500'
                          : dist.type === 'saving'
                            ? 'bg-teal-500/10 text-teal-600'
                            : 'bg-emerald-500/10 text-emerald-500',
                      )}
                    >
                      {dist.type === 'share'
                        ? 'Business Share'
                        : dist.type === 'saving'
                          ? 'Saving Profit'
                          : 'Regular'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Users size={14} />
                      {dist.method === 'custom' ? 'Custom' : 'Proportional'}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-bold text-muted-foreground">
                      {formatDate(dist.date)}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div
                      className={cn(
                        'text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 border leading-none',
                        dist.status === 'Completed' &&
                          'bg-emerald-500/10 text-emerald-600 border-emerald-500/10',
                        dist.status === 'Pending' &&
                          'bg-amber-500/10 text-amber-600 border-amber-500/20',
                        dist.status === 'Failed' &&
                          'bg-rose-500/10 text-rose-600 border-rose-500/20',
                      )}
                    >
                      <span
                        className={cn(
                          'w-1 h-1 rounded-full',
                          dist.status === 'Completed' && 'bg-emerald-500',
                          dist.status === 'Pending' &&
                            'bg-amber-500 animate-pulse',
                          dist.status === 'Failed' && 'bg-rose-500',
                        )}
                      />
                      {dist.status || 'Completed'}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-8 py-12 text-center text-muted-foreground"
                >
                  {!loading && (
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <History size={48} className="mb-4" />
                      <p className="text-xs font-black uppercase tracking-widest">
                        No distribution records found
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="border-t border-border/40">
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalEntries={pagination.totalEntries}
            limit={pagination.limit}
            onPageChange={pagination.onPageChange}
            onLimitChange={pagination.onLimitChange}
          />
        </div>
      )}
    </div>
  );
};

export default DistributionTable;
