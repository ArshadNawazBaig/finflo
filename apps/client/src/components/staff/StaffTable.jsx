import { Link } from 'react-router-dom';
import {
  UserX,
  UserCheck,
  Shield,
  User as UserIcon,
  Settings2,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Tooltip from '@/components/ui/Tooltip';
import Pagination from '../ui/Pagination';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

const StaffTable = ({ data, onToggleStatus, onEdit, onDelete, pagination }) => {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-muted/30 border-b border-border/50">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Name
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Email
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Role
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Branch
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              Status
            </th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {data.length > 0 &&
            data.map((item) => (
              <tr
                key={item._id}
                className="group hover:bg-muted/20 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    to={`/team/${item._id}`}
                    className="flex items-center gap-3 group/link w-fit"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs group-hover/link:bg-primary group-hover/link:text-primary-foreground transition-all duration-300">
                      {item.name[0].toUpperCase()}
                    </div>
                    <span className="font-bold text-foreground capitalize group-hover/link:text-primary transition-colors">
                      {item.name}
                    </span>
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                  {item.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {item.role === 'admin' ? (
                      <Shield size={14} className="text-amber-500" />
                    ) : (
                      <UserIcon size={14} className="text-blue-500" />
                    )}
                    <span className="capitalize text-xs font-bold">
                      {item.role === 'admin'
                        ? 'admin'
                        : item.isManager
                          ? 'manager'
                          : 'staff'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.branchId?.name || 'Global'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border-0',
                      item.isActive
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-red-500/10 text-red-600',
                    )}
                  >
                    {item.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip content="Edit Staff" position="top">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                      >
                        <Edit size={16} />
                      </Button>
                    </Tooltip>

                    <Tooltip
                      content={item.isActive ? 'Deactivate' : 'Activate'}
                      position="top"
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onToggleStatus(item._id)}
                        className={cn(
                          'h-8 w-8 p-0 rounded-full transition-colors',
                          item.isActive
                            ? 'text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600'
                            : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                        )}
                      >
                        {item.isActive ? (
                          <UserX size={16} />
                        ) : (
                          <UserCheck size={16} />
                        )}
                      </Button>
                    </Tooltip>

                    <Tooltip content="Delete Staff" position="top">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(item._id)}
                        className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </Tooltip>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {data.length === 0 && (
        <EmptyState
          icon={UserIcon}
          title="No Staff Members"
          description="Your team list is empty. Add staff members to help manage your business."
          className="border-none bg-transparent py-12"
        />
      )}
      {pagination && data.length > 0 && (
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

export default StaffTable;
