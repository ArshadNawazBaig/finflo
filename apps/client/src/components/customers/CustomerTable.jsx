import {
  Edit,
  Trash2,
  Phone,
  Mail,
  Eye,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  UserPlus,
  Copy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from '../ui/Pagination';
import Tooltip from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import MemberAvatar from '@/components/member/MemberAvatar';
import { capitalize } from '@/lib/utils';
import { toast } from 'sonner';

const CustomerTable = ({
  data,
  pagination,
  onEdit,
  onDelete,
  sortBy,
  sortOrder,
  onSort,
  onConvert,
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
    <div className="w-full bg-card/10 backdrop-blur-sm border border-border/40 rounded-[2rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left bg-muted/30">
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('name')}
              >
                <div className="flex items-center gap-1">
                  Customer Name
                  {renderSortIcon('name')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Contact Info
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Accounts
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {renderSortIcon('status')}
                </div>
              </th>
              <th
                className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => onSort('trustRating')}
              >
                <div className="flex items-center gap-1">
                  Trust Rating
                  {renderSortIcon('trustRating')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-right text-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((customer) => (
              <tr
                key={customer._id}
                className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/customers/${customer._id}`}
                      className="inline-flex hover:scale-105 active:scale-95 transition-all"
                    >
                      <MemberAvatar
                        name={customer.name}
                        profilePicture={customer.profilePicture}
                        size={36}
                        rounded="rounded-full"
                        className="text-sm shadow-sm capitalize"
                      />
                    </Link>
                    <div className="flex flex-col">
                      <Link
                        to={`/customers/${customer._id}`}
                        className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer block leading-tight"
                      >
                        {capitalize(customer.name)}
                      </Link>
                      <Link
                        to={`/customers/${customer._id}`}
                        className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors mt-0.5 font-medium"
                      >
                        ID: {customer._id.slice(-6).toUpperCase()}
                      </Link>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-foreground/80">
                      <Phone size={14} className="text-muted-foreground" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail size={14} />
                        {customer.email}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    {customer.savingAccountNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            customer.savingAccountNumber,
                          );
                          toast.success('Saving account copied');
                        }}
                        className="group/acc flex items-center gap-1.5 font-black text-[9px] uppercase tracking-tighter bg-primary/10 text-primary px-2 py-1 rounded-lg hover:bg-primary hover:text-white transition-all shadow-sm"
                        title={customer.savingAccountNumber}
                      >
                        SAV
                        <Copy size={8} />
                      </button>
                    )}
                    {customer.currentAccountNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            customer.currentAccountNumber,
                          );
                          toast.success('Current account copied');
                        }}
                        className="group/acc flex items-center gap-1.5 font-black text-[9px] uppercase tracking-tighter bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg hover:bg-indigo-500 hover:text-white transition-all shadow-sm"
                        title={customer.currentAccountNumber}
                      >
                        CUR
                        <Copy size={8} />
                      </button>
                    )}
                    {customer.loanAccountNumber && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            customer.loanAccountNumber,
                          );
                          toast.success('Loan account copied');
                        }}
                        className="group/acc flex items-center gap-1.5 font-black text-[9px] uppercase tracking-tighter bg-amber-500/10 text-amber-500 px-2 py-1 rounded-lg hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                        title={customer.loanAccountNumber}
                      >
                        LON
                        <Copy size={8} />
                      </button>
                    )}
                    {!customer.savingAccountNumber &&
                      !customer.currentAccountNumber &&
                      !customer.loanAccountNumber && (
                        <span className="text-muted-foreground text-[10px] opacity-50">
                          No Link
                        </span>
                      )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                      customer.status?.toLowerCase() === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-destructive/10 text-destructive'
                    }`}
                  >
                    {customer.status?.toLowerCase() === 'active'
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20 w-fit">
                    <span className="text-amber-500">★</span>
                    <span>{(customer.trustRating || 5).toFixed(1)}/10</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {!customer.isMember && (
                      <Tooltip content="Convert to Member" position="top">
                        <button
                          onClick={() => onConvert(customer)}
                          className="p-1.5 rounded-md hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-colors"
                        >
                          <UserPlus size={16} />
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="View Details" position="top">
                      <Link
                        to={`/customers/${customer._id}`}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye size={16} />
                      </Link>
                    </Tooltip>
                    <Tooltip content="Edit Customer" position="top">
                      <button
                        onClick={() => onEdit(customer)}
                        className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete" position="top">
                      <button
                        onClick={() => onDelete(customer)}
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
          icon={UserPlus}
          title="No Customers Found"
          description="Your customer list is currently empty. Start by adding your first customer."
          className="border-none bg-transparent py-12"
        />
      )}
      {pagination && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalEntries={pagination.totalEntries}
          limit={pagination.limit}
          onPageChange={pagination.onPageChange}
          onLimitChange={pagination.onLimitChange}
        />
      )}
    </div>
  );
};

export default CustomerTable;
