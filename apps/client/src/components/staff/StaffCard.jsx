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
import { Button } from '@/components/ui/button';

const StaffCard = ({ item, onToggleStatus, onEdit, onDelete, togglingId }) => {
  const initials = item.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    item.roleRef?.name ||
    (item.role === 'admin' ? 'admin' : item.isManager ? 'manager' : 'staff');

  return (
    <div className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden hover:shadow-[0_20px_60px_-25px_rgba(15,23,42,0.15)] transition-all duration-300 group">
      {/* Banner header */}
      <div className="h-24 bg-slate-50 dark:bg-white/[0.04] relative">
        <Link
          to={`/team/${item._id}`}
          className="absolute bottom-0 left-6 translate-y-1/2"
          aria-label={`View ${item.name}`}
        >
          <div className="h-16 w-16 rounded-full border-4 border-white dark:border-[#020617] bg-primary/10 text-primary flex items-center justify-center text-lg font-extrabold tracking-tight shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            {initials}
          </div>
        </Link>
      </div>

      {/* Body */}
      <div className="pt-12 px-6 pb-5 space-y-4">
        {/* Name + role + status */}
        <div className="flex justify-between items-start gap-3">
          <Link to={`/team/${item._id}`} className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
              {item.role === 'admin' ? (
                <Shield size={10} className="text-amber-500" />
              ) : (
                <UserIcon size={10} className="text-blue-500" />
              )}
              {roleLabel}
            </p>
            <h3 className="text-base font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors capitalize">
              {item.name}
            </h3>
          </Link>
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0',
              item.isActive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
            )}
          >
            {item.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Info rows */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Mail />
          </div>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
            {item.email}
          </span>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
          <Tooltip content="Edit Staff" position="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(item)}
              className="p-2 h-9 w-9 rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-all active:scale-90"
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
              isLoading={togglingId === item._id}
              className={cn(
                'p-2 h-9 w-9 rounded-full transition-all active:scale-90 text-slate-400',
                item.isActive
                  ? 'hover:bg-amber-500/10 hover:text-amber-600'
                  : 'hover:bg-emerald-500/10 hover:text-emerald-600',
              )}
            >
              {item.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
            </Button>
          </Tooltip>

          <Tooltip content="Delete" position="top">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(item._id)}
              className="p-2 h-9 w-9 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all active:scale-90"
            >
              <Trash2 size={16} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default StaffCard;
