import { BANKS } from '@/constants/banks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * @param {Object} props
 * @param {string} props.selectedId - The ID of the currently selected bank
 * @param {function(string): void} props.onSelect - Callback when a bank is selected
 * @param {string} [props.className]
 */
const BankSelector = ({ selectedId, onSelect, className }) => {
  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-3', className)}>
      {BANKS.map((bank) => (
        <Button
          key={bank.id}
          type="button"
          variant="ghost"
          onClick={() => onSelect(bank.id)}
          className={cn(
            'p-4 rounded-2xl border flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden group',
            selectedId === bank.id
              ? 'border-primary bg-primary/10 shadow-sm'
              : 'border-border/60 bg-background hover:border-border hover:bg-muted/30',
          )}
        >
          {/* Background Logo Overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 opacity-[0.06] pointer-events-none group-hover:scale-110 transition-transform duration-500 flex items-center justify-center">
            <img
              src={bank.logo}
              alt=""
              className="w-full h-full object-contain grayscale"
            />
          </div>

          {/* Actual Logo */}
          <div
            className={cn(
              'transition-transform duration-300 w-10 h-10 flex items-center justify-center relative z-10 rounded-md overflow-hidden bg-white/50',
              selectedId === bank.id
                ? 'scale-110 shadow-sm'
                : 'grayscale opacity-70',
            )}
          >
            <img
              src={bank.logo}
              alt={bank.label}
              className="w-full h-full object-contain rounded-md"
            />
          </div>

          <span
            className={cn(
              'text-[10px] font-black uppercase tracking-widest text-center transition-colors relative z-10',
              selectedId === bank.id ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {bank.label}
          </span>
        </Button>
      ))}
    </div>
  );
};

export default BankSelector;
