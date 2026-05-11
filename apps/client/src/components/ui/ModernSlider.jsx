import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const ModernSlider = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  suffix = '',
}) => {
  const [inputValue, setInputValue] = useState(value.toString());
  const clampedValue = Math.max(min, Math.min(max, value));
  const percentage = ((clampedValue - min) / (max - min)) * 100;

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleManualChange = (val) => {
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      // Don't cap while typing to allow users to type '100' starting from '1'
      onChange(num);
    }
  };

  const handleBlur = () => {
    let num = parseFloat(inputValue);
    if (isNaN(num)) num = min;
    const clamped = Math.max(min, Math.min(max, num));
    onChange(clamped);
    setInputValue(clamped.toString());
  };

  return (
    <div className="space-y-5">
      {label && (
        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1 block ml-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-4">
        {/* Slider track area */}
        <div className="relative flex-1 h-6 flex items-center">
          {/* Background track */}
          <div className="absolute inset-x-0 h-1.5 bg-muted/40 rounded-full" />

          {/* Filled track */}
          <motion.div
            className="absolute left-0 h-1.5 bg-gradient-to-r from-primary to-primary/60 rounded-full"
            initial={false}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          />

          {/* Thumb */}
          <motion.div
            className="absolute top-1/2 w-5 h-5 rounded-full bg-white dark:bg-primary shadow-xl shadow-primary/40 border-2 border-primary z-10 pointer-events-none flex items-center justify-center"
            initial={false}
            animate={{ left: `calc(${percentage}% - 10px)` }}
            style={{ marginTop: '-10px' }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary dark:bg-white" />
          </motion.div>

          {/* Invisible native range input on top for interaction */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={clampedValue}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          />
        </div>

        {/* Value Display with Manual Input */}
        <div className="relative w-[80px] group/input shrink-0">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleManualChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
            className="w-full bg-white dark:bg-slate-900 border border-border/50 rounded-lg h-7 flex items-center justify-center font-bold !text-[12px] shadow-sm text-center focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all pr-4"
          />
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[7px] font-black text-primary pointer-events-none uppercase">
            {suffix}
          </span>
        </div>
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between px-0.5 -mt-2 pointer-events-none">
        <span className="text-[8px] font-bold text-muted-foreground/40">
          {min.toLocaleString()}{suffix}
        </span>
        <span className="text-[8px] font-bold text-muted-foreground/40">
          {max.toLocaleString()}{suffix}
        </span>
      </div>
    </div>
  );
};

export default ModernSlider;
