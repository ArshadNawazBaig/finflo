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
    <div className={cn('flex flex-wrap gap-2 pt-1', className)}>
      {COLORS.map((c) => (
        <button
          key={c.name}
          onClick={() => setPrimaryColor(c.value)}
          className={cn(
            'relative flex items-center justify-center w-8 h-8 rounded-xl transition-all hover:scale-110 active:scale-95',
            primaryColor === c.value
              ? 'ring-2 ring-offset-2 ring-offset-background'
              : 'hover:ring-1 hover:ring-offset-1',
          )}
          style={{
            backgroundColor: c.color,
            '--tw-ring-color': c.color,
          }}
          title={c.name}
        >
          {primaryColor === c.value && (
            <Check className="text-white w-4 h-4 animate-in zoom-in" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ColorPalette;
