import { Link } from 'react-router-dom';
import { capitalize, formatCurrency } from '@/lib/utils';
import {
  Phone,
  Mail,
  User,
  Shield,
  Calendar,
  Eye,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const MemberCard = ({
  member,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}) => {
  const isPending = member.approvalStatus === 'pending';

  return (
    <div className="bg-card/40 backdrop-blur-md border border-border/40 rounded-[1.5rem] p-5 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary/20 transition-colors">
            {member.name?.charAt(0) || 'M'}
          </div>
          <div className="flex flex-col">
            <Link
              to={`/members/${member._id}`}
              className="font-bold text-base hover:text-primary transition-colors cursor-pointer block leading-tight"
            >
              {member.name ? capitalize(member.name) : 'Member'}
            </Link>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield size={10} className="text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground/60 font-medium capitalize">
                {member.role || 'Member'}
              </span>
            </div>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
            isPending
              ? 'bg-amber-500/10 text-amber-600'
              : member.status?.toLowerCase() === 'active'
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-destructive/10 text-destructive'
          }`}
        >
          {isPending ? 'Pending' : member.status || 'Inactive'}
        </span>
      </div>

      <div className="space-y-2.5 mb-5">
        <div className="flex items-center gap-3 text-sm">
          <Phone size={14} className="text-muted-foreground" />
          <span className="text-foreground/80 font-medium">{member.phone}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Shield size={14} className="text-muted-foreground" />
          <span className="text-foreground/80 font-mono text-[11px]">
            {member.cnic}
          </span>
        </div>
        {member.email && (
          <div className="flex items-center gap-3 text-sm">
            <Mail size={14} className="text-muted-foreground" />
            <span className="text-foreground/80 font-medium truncate">
              {member.email}
            </span>
          </div>
        )}
        <div className="flex items-center gap-3 text-sm">
          <Building2 size={14} className="text-muted-foreground" />
          <span className="text-foreground/80 font-medium">
            {member.branchId?.name || 'Global'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mt-1">
          <Calendar size={12} />
          <span>Joined: {new Date(member.createdAt).toLocaleDateString()}</span>
        </div>

        <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-70">
              Loan Eligibility
            </span>
            <span className="text-sm font-black text-amber-600">
              {formatCurrency(member.creditLimit || 0)}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Shield size={16} />
          </div>
        </div>
      </div>

      {isPending ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onReject(member._id)}
            variant="outline"
            isLoading={rejectingId === member._id}
            className="flex-1 py-2.5 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
          >
            Reject
          </Button>
          <Button
            onClick={() => onApprove(member._id)}
            variant="gradient"
            isLoading={approvingId === member._id}
            className="flex-[2] py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-md shadow-primary/20"
          >
            Approve
          </Button>
        </div>
      ) : (
        <Link
          to={`/members/${member._id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <Eye size={14} strokeWidth={3} />
          View Profile
        </Link>
      )}
    </div>
  );
};

export default MemberCard;
