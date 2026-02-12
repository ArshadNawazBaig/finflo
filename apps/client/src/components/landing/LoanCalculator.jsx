import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Info,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';

const LOAN_CALC_STYLES = `
  .slider-thumb-premium {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 3px;
    background: #e2e8f0;
    outline: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .dark .slider-thumb-premium {
    background: rgba(255, 255, 255, 0.1);
  }
  
  /* Webkit (Chrome, Safari, Edge) */
  .slider-thumb-premium::-webkit-slider-thumb {
    -webkit-appearance: none;
    height: 24px;
    width: 24px;
    border-radius: 50%;
    background: #ffffff;
    cursor: grab;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    margin-top: -9px;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    position: relative;
    z-index: 50;
  }
  .slider-thumb-premium::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 16px hsla(var(--primary), 0.3);
  }
  .slider-thumb-premium:active::-webkit-slider-thumb {
    cursor: grabbing;
    transform: scale(0.95);
    background: hsl(var(--primary));
    border-color: hsl(var(--primary));
  }
  .slider-thumb-premium::-webkit-slider-runnable-track {
    width: 100%;
    height: 6px;
    cursor: pointer;
    background: transparent;
    border-radius: 3px;
  }

  /* Firefox */
  .slider-thumb-premium::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: #ffffff;
    cursor: grab;
    border: 1px solid rgba(0,0,0,0.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  .slider-thumb-premium::-moz-range-progress {
    background: hsl(var(--primary));
    height: 6px;
    border-radius: 3px;
  }
`;

const Slider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  icon: Icon,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/[^0-9.]/g, '');
    setTempValue(val);
  };

  const handleInputBlur = () => {
    let num = Number(tempValue);
    if (isNaN(num)) num = min;
    num = Math.max(min, Math.min(max, num));
    onChange(num);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleInputBlur();
    if (e.key === 'Escape') {
      setTempValue(value);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (!isEditing) setTempValue(value);
  }, [value, isEditing]);

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-4 relative z-30 group/slider">
      <div className="flex justify-between items-center relative z-40">
        <label className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 flex items-center gap-2 group-hover/slider:text-primary transition-colors">
          <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 group-hover/slider:bg-primary/10 group-hover/slider:text-primary transition-all">
            {Icon && <Icon size={12} />}
          </div>
          {label}
        </label>
        <div className="relative group/input flex items-center">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={tempValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="w-20 h-[22px] text-right !text-[11px] !leading-[22px] font-black text-slate-900 bg-white px-2 py-0 rounded-lg shadow-lg outline-none ring-1 ring-primary/50 transition-all"
            />
          ) : (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="cursor-pointer !text-[11px] !leading-[22px] font-black text-white bg-primary px-2 h-[22px] rounded-lg shadow-md hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-end w-20 border border-white/20 select-none group-hover/slider:shadow-primary/20"
            >
              {unit === 'Rs.'
                ? Math.round(value).toLocaleString()
                : `${value}${unit}`}
            </div>
          )}
        </div>
      </div>
      <div className="relative h-6 flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${percentage}%, ${isEditing ? '#cbd5e1' : '#e2e8f0'} ${percentage}%, ${isEditing ? '#cbd5e1' : '#e2e8f0'} 100%)`,
          }}
          className="slider-thumb-premium"
        />
      </div>
    </div>
  );
};

const LoanCalculator = () => {
  const [amount, setAmount] = useState(25000);
  const [term, setTerm] = useState(24);
  const [rate, setRate] = useState(8.5);
  const [interestType, setInterestType] = useState('emi'); // 'emi' or 'simple'
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);

  useEffect(() => {
    const principal = amount;
    const yearlyRate = rate / 100;
    const monthlyRate = yearlyRate / 12;
    const numberOfPayments = term;

    if (principal === 0 || numberOfPayments === 0) {
      setMonthlyPayment(0);
      setTotalPayment(0);
      setTotalInterest(0);
      return;
    }

    if (interestType === 'emi') {
      if (monthlyRate === 0) {
        setMonthlyPayment(principal / numberOfPayments);
        setTotalPayment(principal);
        setTotalInterest(0);
      } else {
        const x = Math.pow(1 + monthlyRate, numberOfPayments);
        const monthly = (principal * x * monthlyRate) / (x - 1);
        setMonthlyPayment(monthly);
        setTotalPayment(monthly * numberOfPayments);
        setTotalInterest(monthly * numberOfPayments - principal);
      }
    } else {
      // Simple Interest
      const interest = principal * yearlyRate * (numberOfPayments / 12);
      const total = principal + interest;
      setTotalInterest(interest);
      setTotalPayment(total);
      setMonthlyPayment(total / numberOfPayments);
    }
  }, [amount, term, rate, interestType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-sm mx-auto lg:ml-auto"
    >
      <style dangerouslySetInnerHTML={{ __html: LOAN_CALC_STYLES }} />
      <div className="relative group">
        {/* Decorative background elements */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-indigo-500/30 rounded-[2rem] blur opacity-20 group-hover:opacity-25 transition duration-1000" />

        <div className="relative bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-white dark:border-white/10 p-5 lg:p-6 rounded-[2rem] shadow-xl overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Calculator size={16} />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-tighter text-slate-900 dark:text-white leading-tight">
                  InstaLoan™ <span className="text-primary italic">Calc</span>
                </h3>
                <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Real-time simulation (PKR)
                </p>
              </div>
            </div>

            {/* Interest Type Toggle */}
            <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg border border-slate-200 dark:border-white/10">
              {['emi', 'simple'].map((type) => (
                <button
                  key={type}
                  onClick={() => setInterestType(type)}
                  className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-wider transition-all ${
                    interestType === type
                      ? 'bg-white dark:bg-white/10 text-primary shadow-sm'
                      : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Slider
              label="Loan Amount"
              value={amount}
              min={0}
              max={1000000}
              step={5000}
              onChange={setAmount}
              unit="Rs."
              icon={TrendingUp}
            />
            <Slider
              label="Repayment Term"
              value={term}
              min={0}
              max={84}
              step={1}
              onChange={setTerm}
              unit=" mo"
              icon={Zap}
            />
            <Slider
              label="Interest Rate"
              value={rate}
              min={0}
              max={30}
              step={0.1}
              onChange={setRate}
              unit="%"
              icon={ShieldCheck}
            />
          </div>

          {/* Results Section */}
          <div className="mt-5 p-4 rounded-[1.5rem] bg-slate-900 dark:bg-primary/5 border border-slate-800 dark:border-primary/20 relative overflow-hidden group/results">
            <div className="relative z-10 grid grid-cols-1 gap-2.5">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">
                  Est. Monthly
                </p>
                <div className="flex items-center justify-center gap-0.5">
                  <span className="text-xs font-black text-primary">Rs.</span>
                  <span className="text-3xl font-black text-white tracking-tighter">
                    {Math.round(monthlyPayment).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 dark:border-primary/10">
                <div className="text-left">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                    Total Payback
                  </p>
                  <p className="text-xs font-black text-white tracking-tight">
                    Rs. {Math.round(totalPayment).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                    Cost of Credit
                  </p>
                  <p className="text-xs font-black text-emerald-500 tracking-tight">
                    Rs. {Math.round(totalInterest).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-[0.8rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_20px_-5px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 group/btn relative overflow-hidden">
            <span className="relative z-10">Initialize Application</span>
            <ArrowRight
              size={12}
              className="relative z-10 group-hover/btn:translate-x-1 transition-transform"
            />
          </button>

          <p className="mt-4 text-[7px] text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 grayscale opacity-70">
            <Info size={10} className="text-primary" />
            Subject to credit approval
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LoanCalculator;
