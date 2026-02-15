import {
  Edit,
  Trash2,
  CreditCard,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  EyeIcon,
  Copy,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from './ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { formatPKR, capitalize } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { toast } from 'sonner';

const MemberTable = ({
  data,
  pagination,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
}) => {
  const renderSortIcon = (column) => {
    if (sortBy !== column)
      return <ChevronsUpDown size={14} className="text-muted-foreground/50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp size={14} className="text-primary" />
    ) : (
      <ArrowDown size={14} className="text-primary" />
    );
  };
  return (
    <div className="w-full bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left bg-muted/30">
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-1">
                  Member
                  {renderSortIcon('name')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('currentBalance')}
              >
                <div className="flex items-center justify-end gap-1">
                  Total Invested
                  {renderSortIcon('currentBalance')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-center text-nowrap">
                Accounts
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-center text-nowrap">
                Active Loans
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-center text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('profitRate')}
              >
                <div className="flex items-center justify-center gap-1">
                  Profit Rate
                  {renderSortIcon('profitRate')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-center text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center justify-center gap-1">
                  Status
                  {renderSortIcon('status')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((member) => (
              <tr
                key={member._id}
                className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm capitalize">
                      {member.name.charAt(0)}
                    </div>
                    <Link
                      to={`/members/${member._id}`}
                      className="block hover:opacity-70 transition-opacity"
                    >
                      <div className="font-semibold text-sm">
                        {member.name ? capitalize(member.name) : 'Member'}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">
                        {member.cnic}
                      </div>
                      {member.email && (
                        <div className="text-[10px] text-muted-foreground/60 italic lowercase">
                          {member.email}
                        </div>
                      )}
                    </Link>
                  </div>
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  {formatPKR(member.currentBalance || 0)}
                </td>
                <td className="py-4 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {member.savingAccountNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            member.savingAccountNumber,
                          );
                          toast.success('Saving account copied');
                        }}
                        className="group/acc flex items-center gap-1.5 font-black text-[9px] uppercase tracking-tighter bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title={member.savingAccountNumber}
                      >
                        SAV
                        <Copy size={8} />
                      </button>
                    )}
                    {member.currentAccountNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            member.currentAccountNumber,
                          );
                          toast.success('Current account copied');
                        }}
                        className="group/acc flex items-center gap-1.5 font-black text-[9px] uppercase tracking-tighter bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                        title={member.currentAccountNumber}
                      >
                        CUR
                        <Copy size={8} />
                      </button>
                    )}
                    {!member.savingAccountNumber &&
                      !member.currentAccountNumber && (
                        <span className="text-muted-foreground text-[10px] opacity-50">
                          None
                        </span>
                      )}
                  </div>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="inline-flex items-center justify-center h-6 min-w-6 px-2 rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {member.activeLoans || 0}
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span className="text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                    {member.profitRate || 0}%
                  </span>
                </td>
                <td className="py-4 px-4 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      member.status === 'Active'
                        ? 'bg-blue-500/10 text-blue-500'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {member.status}
                  </span>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip content="View Details" position="top">
                      <Link
                        to={`/members/${member._id}`}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <EyeIcon size={16} />
                      </Link>
                    </Tooltip>
                    <Tooltip content="Delete" position="top">
                      <button
                        onClick={() => onDelete(member._id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <EmptyState
          icon={Users}
          title="No Members Found"
          description="There are no active members recorded in the system."
          className="border-none bg-transparent py-12"
        />
      )}

      {pagination && <Pagination {...pagination} />}
    </div>
  );
};

export default MemberTable;
