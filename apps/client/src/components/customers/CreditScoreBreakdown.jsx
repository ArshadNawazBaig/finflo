import { useState } from 'react';
import { BarChart3, Loader2 } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import CreditScoreBadge from '@/components/CreditScoreBadge';
import api from '@/lib/axios';
import { toast } from 'sonner';

const COMPONENT_LABELS = {
  punctuality: 'Punctuality',
  delinquency: 'Delinquency',
  depth: 'Depth',
  affordability: 'Affordability',
  commitment: 'Commitment',
  tenure: 'Tenure',
  group: 'Group',
};

// "View breakdown" affordance for an admin viewing a customer. Lazily fetches
// GET /customers/:id/credit-score and shows each component's points/max plus
// the live factors list inside a popover.
const CreditScoreBreakdown = ({ customerId }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(null);

  const handleOpenChange = async (nextOpen) => {
    setOpen(nextOpen);
    if (nextOpen && !breakdown && !loading) {
      try {
        setLoading(true);
        const { data } = await api.get(`/customers/${customerId}/credit-score`);
        setBreakdown(data);
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to load breakdown');
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const components = breakdown?.components || {};
  const factors = breakdown?.factors || [];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/30 text-[10px] font-bold text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        >
          <BarChart3 size={11} />
          View breakdown
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : breakdown ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Credit Score Breakdown
              </p>
              <CreditScoreBadge
                score={breakdown.score}
                band={breakdown.band}
                size="sm"
                showScore
              />
            </div>

            <div className="space-y-1.5">
              {Object.entries(components).map(([key, comp]) => (
                <div
                  key={key}
                  className="flex items-center justify-between text-[11px]"
                >
                  <span className="font-medium text-muted-foreground">
                    {COMPONENT_LABELS[key] || key}
                  </span>
                  <span className="font-black tabular-nums text-foreground">
                    {comp?.points ?? 0}/{comp?.max ?? 0}
                  </span>
                </div>
              ))}
            </div>

            {factors.length > 0 && (
              <div className="space-y-2 border-t border-border/40 pt-3">
                {factors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-1.5 h-1 w-1 rounded-full bg-primary shrink-0" />
                    <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                      {factor}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
};

export default CreditScoreBreakdown;
