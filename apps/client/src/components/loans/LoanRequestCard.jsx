import { Check, X, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { formatPKR } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const LoanRequestCard = ({ request, onApprove, onReject, processingId }) => {
  return (
    <div className="bg-card p-4 rounded-xl border border-border/50 hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-bold">{request.customer?.name}</h3>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <Calendar size={12} />
            {format(new Date(request.createdAt), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              request.status === 'active'
                ? 'bg-emerald-500/10 text-emerald-600'
                : request.status === 'pending'
                  ? 'bg-amber-500/10 text-amber-600'
                  : request.status === 'completed'
                    ? 'bg-blue-500/10 text-blue-600'
                    : 'bg-red-500/10 text-red-600'
            }`}
          >
            {request.status}
          </span>
          {request.riskDetails ? (
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                ['A+', 'A'].includes(request.riskDetails.grade)
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : ['B', 'C'].includes(request.riskDetails.grade)
                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border-red-500/20'
              }`}
            >
              Risk: {request.riskDetails.grade}
            </span>
          ) : (
            <span className="px-2.5 py-1 text-[10px] font-black text-muted-foreground/50 uppercase">
              Risk: —
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-bold text-primary">
            {formatPKR(request.principal)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-bold">{request.duration} Months</span>
        </div>
        {request.notes && (
          <div className="pt-1">
            <p className="text-xs text-muted-foreground line-clamp-2 ">
              "{request.notes}"
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {request.status === 'pending' ? (
          <>
            <Button
              className="flex-1 h-9"
              variant="outline"
              onClick={() => onReject(request._id)}
              disabled={processingId === request._id}
            >
              {processingId === request._id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X size={14} className="mr-1" />
                  Reject
                </>
              )}
            </Button>
            <Button
              className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600"
              onClick={() => onApprove(request)}
              disabled={processingId === request._id}
            >
              <Check size={14} className="mr-1" />
              Approve
            </Button>
          </>
        ) : (
          <div className="w-full py-2 bg-muted/30 rounded-lg text-center text-xs font-bold text-muted-foreground ">
            Request {request.status}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanRequestCard;
