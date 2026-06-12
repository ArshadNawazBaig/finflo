import { capitalize } from '@/lib/utils';
import { Edit, Trash2, Info, Users } from 'lucide-react';
import Pagination from '../ui/Pagination';
import { Link } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import Tooltip from '@/components/ui/Tooltip';
import GroupStatusBadge from '@/components/groups/GroupStatusBadge';

const GroupTable = ({ data, pagination, onEdit, onDelete }) => {
  return (
    <div className="w-full bg-card/10 backdrop-blur-sm border border-border/40 rounded-[2rem] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-border/50 text-left bg-muted/30">
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[28%] text-nowrap">
                Group
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[14%] text-center text-nowrap">
                Members
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[18%] text-center text-nowrap">
                Guarantee
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[18%] text-center text-nowrap">
                Branch
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[12%] text-center text-nowrap">
                Status
              </th>
              <th className="py-4 px-4 font-medium text-sm text-muted-foreground w-[10%] text-right text-nowrap">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((group) => {
              const memberCount = group.members?.length || 0;
              return (
                <tr
                  key={group._id}
                  className="group border-b border-border/50 last:border-none hover:bg-muted/30 transition-colors"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Users size={16} />
                      </div>
                      <Link
                        to={`/groups/${group._id}`}
                        className="block hover:opacity-70 transition-opacity"
                      >
                        <div className="font-semibold text-sm capitalize">
                          {capitalize(group.name || 'Unnamed Group')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {group._id.slice(-6).toUpperCase()}
                        </div>
                      </Link>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-center">
                    <span className="inline-block px-2 py-1 rounded bg-muted text-xs font-semibold">
                      {memberCount}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-muted-foreground capitalize">
                    {group.guaranteePolicy || 'joint'}
                  </td>
                  <td className="py-4 px-4 text-center text-sm text-muted-foreground capitalize">
                    {group.branchId?.name || '—'}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <GroupStatusBadge status={group.status} />
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip content="View Details" position="top">
                        <Link
                          to={`/groups/${group._id}`}
                          className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        >
                          <Info size={16} />
                        </Link>
                      </Tooltip>
                      <Tooltip content="Edit Group" position="top">
                        <button
                          onClick={() => onEdit(group)}
                          className="p-1.5 rounded-md hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-colors"
                        >
                          <Edit size={16} />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete" position="top">
                        <button
                          onClick={() => onDelete(group)}
                          className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <EmptyState
          icon={Users}
          title="No Groups Found"
          description="There are no lending groups to display at this time."
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

export default GroupTable;
