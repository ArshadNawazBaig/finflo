import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export const COLORS = [
  {
    name: 'Indigo',
    value: '243.4 75.4% 58.6%',
    color: '#6366f1',
  },
  {
    name: 'Royal',
    value: '221.2 83.2% 53.3%',
    color: '#2563eb',
  },
  {
    name: 'Emerald',
    value: '142.1 70.6% 45.3%',
    color: '#10b981',
  },
  {
    name: 'Violet',
    value: '262.1 83.3% 57.8%',
    color: '#8b5cf6',
  },
  {
    name: 'Rose',
    value: '346.8 87.2% 56.5%',
    color: '#f43f5e',
  },
  {
    name: 'Amber',
    value: '37.7 92.1% 50.2%',
    color: '#f59e0b',
  },
  {
    name: 'Cyan',
    value: '188.7 94.5% 42.7%',
    color: '#06b6d4',
  },
  {
    name: 'Orange',
    value: '24.6 95.0% 53.1%',
    color: '#f97316',
  },
  {
    name: 'Pink',
    value: '330.4 81.2% 60.4%',
    color: '#ec4899',
  },
  {
    name: 'Slate',
    value: '215.1 16.3% 46.9%',
    color: '#475569',
  },
];

const ColorPalette = ({ primaryColor, setPrimaryColor, className }) => {
  return (
    <div className={cn('flex flex-wrap gap-4 pt-2', className)}>
      {COLORS.map((c) => (
        <div key={c.name} className="flex flex-col items-center gap-2">
          <button
            onClick={() => setPrimaryColor(c.value)}
            className={cn(
              'relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all hover:scale-110 active:scale-95',
              primaryColor === c.value
                ? 'ring-4 ring-offset-4 ring-offset-background'
                : 'hover:ring-2 hover:ring-offset-2',
            )}
            style={{
              backgroundColor: c.color,
              '--tw-ring-color': c.color,
            }}
            title={c.name}
          >
            {primaryColor === c.value && (
              <Check className="text-white w-5 h-5 animate-in zoom-in" />
            )}
          </button>
          <span
            className={cn(
              'text-[9px] font-black uppercase tracking-tighter transition-colors',
              primaryColor === c.value
                ? 'text-primary'
                : 'text-muted-foreground/50',
            )}
          >
            {c.name}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ColorPalette;
