import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Edit, Trash2, Eye, UserPlus } from 'lucide-react';
import { capitalize } from '@/lib/utils';
import Tooltip from '@/components/ui/Tooltip';

const CustomerCard = ({ customer, onEdit, onDelete, onConvert }) => {
  const initials = customer.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Link
            to={`/customers/${customer._id}`}
            className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-sm group-hover:bg-primary/20"
          >
            {initials.slice(0, 2)}
          </Link>
          <div className="flex flex-col">
            <Link
              to={`/customers/${customer._id}`}
              className="font-bold text-base hover:text-primary transition-colors cursor-pointer block leading-tight"
            >
              {capitalize(customer.name)}
            </Link>
            <span className="text-[10px] text-muted-foreground/80 dark:text-muted-foreground font-medium whitespace-nowrap">
              ID: {customer._id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
              customer.status?.toLowerCase() === 'active'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-destructive/10 text-destructive'
            }`}
          >
            {customer.status || 'Inactive'}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-black border border-amber-500/20 shadow-sm">
            <span className="text-amber-500">★</span>
            <span>{(customer.trustRating || 5).toFixed(1)}/10</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="flex items-center gap-3 text-sm text-foreground/80">
          <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground">
            <Phone size={14} />
          </div>
          <span className="font-medium">{customer.phone}</span>
        </div>
        {customer.email && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
              <Mail size={14} />
            </div>
            <span className="font-medium truncate">{customer.email}</span>
          </div>
        )}
        {customer.address && (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="h-7 w-7 rounded-lg bg-muted/50 flex items-center justify-center">
              <MapPin size={14} />
            </div>
            <span className="font-medium truncate">{customer.address}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          {!customer.isMember && (
            <Tooltip content="Convert to Member" position="top">
              <button
                onClick={() => onConvert(customer)}
                className="p-2 rounded-xl hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600 transition-all active:scale-90"
              >
                <UserPlus size={18} />
              </button>
            </Tooltip>
          )}
          <Tooltip content="Edit" position="top">
            <button
              onClick={() => onEdit(customer)}
              className="p-2 rounded-xl hover:bg-blue-500/10 text-muted-foreground hover:text-blue-600 transition-all active:scale-90"
            >
              <Edit size={18} />
            </button>
          </Tooltip>
          <Tooltip content="Delete" position="top">
            <button
              onClick={() => onDelete(customer)}
              className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-90"
            >
              <Trash2 size={18} />
            </button>
          </Tooltip>
        </div>
        <Link
          to={`/customers/${customer._id}`}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold transition-all active:scale-95"
        >
          <Eye size={14} strokeWidth={2.5} />
          Details
        </Link>
      </div>
    </div>
  );
};

export default CustomerCard;
