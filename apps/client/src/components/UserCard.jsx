import { Link } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Eye,
  Ban,
  Trash2,
} from 'lucide-react';
import { capitalize } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const UserCard = ({ user, onToggleStatus, onDelete }) => {
  const getPlanColor = (plan) => {
    switch (plan) {
      case 'Pro':
        return 'bg-gradient-to-r from-primary to-[hsl(var(--btn-gradient-to))] text-white shadow-sm';
      case 'Basic':
        return 'bg-primary/10 text-primary';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/super-admin/users/${user._id}`}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--btn-gradient-to))] flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/20 hover:scale-105 transition-all"
          >
            {user.name?.charAt(0)?.toUpperCase()}
          </Link>
          <div className="flex flex-col">
            <Link
              to={`/super-admin/users/${user._id}`}
              className="font-bold text-base hover:text-primary transition-colors truncate max-w-[150px]"
            >
              {capitalize(user.name)}
            </Link>
            <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">
              {user.email}
            </span>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${getPlanColor(user.plan)}`}
        >
          {user.plan}
        </span>
      </div>

      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Building2 size={12} /> Business
          </span>
          <span className="font-bold text-foreground truncate ml-4">
            {capitalize(user.businessName) || '-'}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/10">
          <span className="text-muted-foreground font-medium">Stats</span>
          <span className="font-black text-primary/80">
            {user.customerCount} Cust • {user.loanCount} Loans
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="flex items-center gap-2">
          {user.isActive ? (
            <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 size={12} strokeWidth={3} /> Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-500 text-[10px] font-black uppercase tracking-widest">
              <XCircle size={12} strokeWidth={3} /> Inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            to={`/super-admin/users/${user._id}`}
            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
          >
            <Eye size={18} />
          </Link>
          <Button
            variant="ghost"
            onClick={() => onToggleStatus(user._id, user.isActive)}
            className={`p-2 rounded-xl transition-all ${
              user.isActive
                ? 'text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10'
                : 'text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10'
            }`}
          >
            {user.isActive ? <Ban size={18} /> : <CheckCircle2 size={18} />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => onDelete(user)}
            className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <Trash2 size={18} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
