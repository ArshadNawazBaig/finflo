import { Link } from 'react-router-dom';
import { Edit, Trash2, Info, Users } from 'lucide-react';
import { capitalize } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/button';
import GroupStatusBadge from '@/components/groups/GroupStatusBadge';

const GroupCard = ({ group, onEdit, onDelete }) => {
  const memberCount = group.members?.length || 0;

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-xl p-4 shadow-xs hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <Users size={18} />
          </div>
          <div className="flex flex-col">
            <Link
              to={`/groups/${group._id}`}
              className="font-bold text-sm hover:text-primary transition-colors cursor-pointer block leading-tight capitalize"
            >
              {capitalize(group.name || 'Unnamed Group')}
            </Link>
            <span className="text-[9px] text-muted-foreground/60 font-medium">
              ID: {group._id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
        <GroupStatusBadge
          status={group.status}
          className="text-[9px] uppercase tracking-wider"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Members
          </span>
          <div className="font-black text-xs">{memberCount}</div>
        </div>
        <div className="space-y-0.5 text-right">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Guarantee
          </span>
          <div className="font-bold text-xs bg-muted/50 inline-block px-1.5 py-0.5 rounded-md capitalize">
            {group.guaranteePolicy || 'joint'}
          </div>
        </div>
        <div className="col-span-2 space-y-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
            Branch
          </span>
          <div className="font-semibold text-xs capitalize">
            {group.branchId?.name || '—'}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        <div className="flex items-center gap-1">
          <Tooltip content="Edit" position="top">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(group)}
              className="h-8 w-8 rounded-lg border-border/50 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600 transition-all active:scale-90"
            >
              <Edit size={16} />
            </Button>
          </Tooltip>
          <Tooltip content="Delete" position="top">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(group)}
              className="h-8 w-8 rounded-lg border-destructive/20 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-90"
            >
              <Trash2 size={16} />
            </Button>
          </Tooltip>
        </div>
        <Link
          to={`/groups/${group._id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:brightness-110 transition-all active:scale-95"
        >
          <Info size={12} strokeWidth={3} />
          Details
        </Link>
      </div>
    </div>
  );
};

export default GroupCard;
