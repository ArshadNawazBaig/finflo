import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Info, ArrowRight } from 'lucide-react';
import ModernSlider from '../ui/ModernSlider';
import { useNavigate } from 'react-router-dom';

const LoanCalculator = () => {
  const [amount, setAmount] = useState(25000);
  const [term, setTerm] = useState(24);
  const [rate, setRate] = useState(8.5);
  const [interestType, setInterestType] = useState('emi'); // 'emi' or 'simple'
  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const navigate = useNavigate();

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

          <div className="space-y-6">
            <ModernSlider
              label="Loan Amount"
              value={amount}
              min={5000}
              max={1000000}
              step={5000}
              onChange={setAmount}
              suffix=""
            />
            <ModernSlider
              label="Repayment Term"
              value={term}
              min={3}
              max={84}
              step={1}
              onChange={setTerm}
              suffix=" mo"
            />
            <ModernSlider
              label="Interest Rate"
              value={rate}
              min={1}
              max={30}
              step={0.1}
              onChange={setRate}
              suffix="%"
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
                  <span className="text-xs font-black text-primary"></span>
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
                    {Math.round(totalPayment).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">
                    Cost of Credit
                  </p>
                  <p className="text-xs font-black text-emerald-500 tracking-tight">
                    {Math.round(totalInterest).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-[0.8rem] font-black uppercase tracking-[0.2em] text-[10px] shadow-[0_10px_20px_-5px_rgba(var(--primary),0.3)] hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 group/btn relative overflow-hidden"
            onClick={() => navigate('/login')}
          >
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
