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
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Pagination from './ui/Pagination';
import Tooltip from '@/components/ui/Tooltip';
import { capitalize } from '@/lib/utils';

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
                  Customer Name
                  {renderSortIcon('name')}
                </div>
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground text-nowrap">
                Contact Info
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
                      className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-sm"
                    >
                      {customer.name.charAt(0)}
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
        <div className="py-12 text-center text-slate-500">
          No customers found.
        </div>
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
