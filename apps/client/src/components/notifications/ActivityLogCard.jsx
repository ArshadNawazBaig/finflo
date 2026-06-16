import {
  Calendar,
  User,
  LogIn,
  UserPlus,
  Key,
  Bell,
  FileEdit,
  Trash2,
  Shield,
} from 'lucide-react';
import { capitalize } from '@/lib/utils';
import MemberAvatar from '@/components/member/MemberAvatar';

const ActivityLogCard = ({ log }) => {
  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'auth':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'user':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'loan':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'customer':
        return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
      case 'member':
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
      case 'notification':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border/20';
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('login')) return <LogIn size={14} />;
    if (action.includes('registered')) return <UserPlus size={14} />;
    if (action.includes('password')) return <Key size={14} />;
    if (action.includes('notification')) return <Bell size={14} />;
    if (action.includes('updated')) return <FileEdit size={14} />;
    if (action.includes('deleted')) return <Trash2 size={14} />;
    if (action.includes('admin')) return <Shield size={14} />;
    return <User size={14} />;
  };

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center border ${getCategoryColor(log.category)}`}
          >
            {getActionIcon(log.action)}
          </div>
          <div>
            <h4 className="text-[13px] font-black uppercase tracking-tight text-foreground">
              {log.action.replace(/_/g, ' ')}
            </h4>
            <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-60">
              {log.category}
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 justify-end">
            <Calendar size={10} />
            {new Date(log.createdAt).toLocaleDateString()}
          </span>
          <span className="text-[9px] text-muted-foreground/60 block mt-0.5">
            {new Date(log.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>

      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 mb-2">
        <div className="flex items-center gap-2 mb-2">
          <MemberAvatar
            name={log.user?.name || 'S'}
            profilePicture={log.user?.businessLogo || log.user?.profilePicture}
            size={24}
            rounded="rounded-full"
            className="text-[10px]"
          />
          <span className="text-xs font-bold text-foreground">
            {capitalize(log.user?.name) || 'System Auto'}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed font-medium bg-background/40 p-2 rounded-lg border border-border/10">
          {log.details}
        </p>
      </div>
    </div>
  );
};

export default ActivityLogCard;
