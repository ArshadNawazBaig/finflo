import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  User,
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  Trash2,
} from 'lucide-react';
import { cn, capitalize, getSafeNotificationLink } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const NotificationCard = ({ notification, onDelete }) => {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (notification.link) {
      const user = JSON.parse(
        localStorage.getItem('user') || localStorage.getItem('member') || '{}',
      );
      const safeLink = getSafeNotificationLink(notification.link, user.role);
      if (safeLink) {
        navigate(safeLink);
      }
    }
  };
  const getTypeIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'warning':
        return <AlertTriangle size={14} className="text-amber-500" />;
      case 'error':
        return <XCircle size={14} className="text-red-500" />;
      default:
        return <Info size={14} className="text-blue-500" />;
    }
  };

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'error':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'group relative overflow-hidden rounded-lg border transition-all duration-500 p-6',
        notification.read
          ? 'bg-muted/10 border-border/40 hover:bg-muted/20 shadow-sm hover:shadow-md'
          : 'bg-card border-primary/20 shadow-lg shadow-primary/5 hover:shadow-xl hover:shadow-primary/10',
        notification.link && 'cursor-pointer active:scale-[0.98]',
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0">
          <h3
            className={cn(
              'font-black text-sm tracking-tight transition-colors',
              notification.read ? 'text-muted-foreground' : 'text-foreground',
            )}
          >
            {notification.title}
          </h3>
          <p
            className={cn(
              'text-[11px] mt-1 font-medium leading-relaxed line-clamp-2',
              notification.read
                ? 'text-muted-foreground/70'
                : 'text-foreground/80',
            )}
          >
            {notification.message}
          </p>
        </div>
        <span
          className={`ml-3 shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${getTypeStyles(
            notification.type,
          )}`}
        >
          {getTypeIcon(notification.type)}
          {notification.type}
        </span>
      </div>

      <div className="bg-muted/30 rounded-2xl p-4 space-y-2.5 mb-5 border border-border/5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground/60 font-black uppercase tracking-widest flex items-center gap-1.5">
            <User size={12} className="text-muted-foreground/40" />
            Recipient
          </span>
          <span className="font-black text-foreground tracking-tight capitalize">
            {capitalize(notification.recipient?.name || 'Unknown')}
          </span>
        </div>
        <div className="flex items-center justify-between text-[10px] pt-2.5 border-t border-border/10">
          <span className="text-muted-foreground/60 font-black uppercase tracking-widest flex items-center gap-1.5">
            <Calendar size={12} className="text-muted-foreground/40" />
            Sent On
          </span>
          <span className="font-bold text-muted-foreground/80">
            {new Date(notification.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div>
          {notification.read ? (
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
              <CheckCircle2 size={12} strokeWidth={3} /> Read
            </span>
          ) : (
            <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
              <Info size={12} strokeWidth={3} /> Unread
            </span>
          )}
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()} // Prevent card click when opening dialog
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
            >
              <Trash2 size={18} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-lg border-border/50 bg-card shadow-2xl p-8 max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black tracking-tighter text-center">
                Delete Alert?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center font-bold text-muted-foreground text-sm pt-2">
                This item will be permanently removed. This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
              <AlertDialogCancel
                onClick={(e) => e.stopPropagation()}
                className="w-full rounded-2xl border-none bg-muted h-12 font-black uppercase tracking-widest text-[10px] hover:bg-muted/80"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(notification._id);
                }}
                className="w-full bg-destructive hover:bg-destructive/90 rounded-2xl h-12 font-black uppercase tracking-widest text-[10px] text-white shadow-xl shadow-destructive/20"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default NotificationCard;
