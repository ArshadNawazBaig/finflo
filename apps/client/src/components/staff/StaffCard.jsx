import { Link } from 'react-router-dom';
import {
  Shield,
  User as UserIcon,
  Edit,
  Trash2,
  UserX,
  UserCheck,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const StaffCard = ({ item, onToggleStatus, onEdit, onDelete }) => {
  const initials = item.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <Link
          to={`/team/${item._id}`}
          className="flex items-center gap-3 group/link cursor-pointer"
        >
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shadow-sm group-hover/link:bg-primary group-hover/link:text-primary-foreground transition-all duration-300">
            {initials.slice(0, 2)}
          </div>
          <div className="flex flex-col">
            <h3 className="font-bold text-base block leading-tight group-hover/link:text-primary transition-colors">
              {item.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {item.role === 'admin' ? (
                <Shield size={12} className="text-amber-500" />
              ) : (
                <UserIcon size={12} className="text-blue-500" />
              )}
              <span className="capitalize text-[10px] font-black tracking-widest text-muted-foreground/80">
                {item.roleRef?.name ||
                  (item.role === 'admin'
                    ? 'admin'
                    : item.isManager
                      ? 'manager'
                      : 'staff')}
              </span>
            </div>
          </div>
        </Link>
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
            item.isActive
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-600',
          )}
        >
          {item.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
            <Mail size={14} />
          </div>
          <span className="font-medium truncate">{item.email}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          <Tooltip content="Edit Staff" position="top">
            <button
              onClick={() => onEdit(item)}
              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-90"
            >
              <Edit size={18} />
            </button>
          </Tooltip>

          <Tooltip
            content={item.isActive ? 'Deactivate' : 'Activate'}
            position="top"
          >
            <button
              onClick={() => onToggleStatus(item._id)}
              className={cn(
                'p-2 rounded-xl transition-all active:scale-90',
                item.isActive
                  ? 'hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600'
                  : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600',
              )}
            >
              {item.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
            </button>
          </Tooltip>

          <Tooltip content="Delete" position="top">
            <button
              onClick={() => onDelete(item._id)}
              className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-90"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
