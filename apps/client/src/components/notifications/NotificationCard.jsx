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
import { capitalize, getSafeNotificationLink } from '@/lib/utils';

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
      className={`bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm transition-all duration-300 ${
        notification.link
          ? 'cursor-pointer hover:bg-card/60 hover:shadow-md hover:border-primary/20 active:scale-[0.98]'
          : ''
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-sm text-foreground">
            {notification.title}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-1 font-medium">
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

      <div className="bg-muted/30 rounded-2xl p-3 space-y-2 mb-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <User size={12} />
            Recipient
          </span>
          <span className="font-bold text-foreground">
            {capitalize(notification.recipient?.name || 'Unknown')}
          </span>
        </div>
        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/10">
          <span className="text-muted-foreground font-medium flex items-center gap-1.5">
            <Calendar size={12} />
            Sent On
          </span>
          <span className="font-medium text-muted-foreground">
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
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1">
              <Info size={12} strokeWidth={3} /> Unread
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification._id);
          }}
          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default NotificationCard;
