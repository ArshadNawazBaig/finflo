import { useState, useEffect } from 'react';
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
      transition={{ duration: 0.8, delay: 0.3 }}
      className="w-full max-w-sm mx-auto lg:ml-auto"
    >
      <div className="relative group">
        {/* Decorative glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-violet-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="relative bg-white/80 dark:bg-white/[0.03] backdrop-blur-2xl border border-slate-200/80 dark:border-white/[0.06] p-5 lg:p-6 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calculator size={15} />
              </div>
              <div>
                <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white leading-tight">
                  Loan Calculator
                </h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-none">
                  Real-time simulation (PKR)
                </p>
              </div>
            </div>

            {/* Interest Type Toggle */}
            <div className="flex bg-slate-100 dark:bg-white/[0.04] p-0.5 rounded-lg border border-slate-200/60 dark:border-white/[0.06]">
              {['emi', 'simple'].map((type) => (
                <button
                  key={type}
                  onClick={() => setInterestType(type)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider transition-all ${
                    interestType === type
                      ? 'bg-white dark:bg-white/[0.08] text-primary shadow-sm'
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
          <div className="mt-5 p-4 rounded-xl bg-slate-900 dark:bg-white/[0.03] border border-slate-800 dark:border-white/[0.06] relative overflow-hidden">
            <div className="relative z-10 grid grid-cols-1 gap-2.5">
              <div className="text-center">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-0.5">
                  Est. Monthly
                </p>
                <div className="flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {Math.round(monthlyPayment).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800 dark:border-white/[0.06]">
                <div className="text-left">
                  <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                    Total Payback
                  </p>
                  <p className="text-xs font-semibold text-white tracking-tight">
                    {Math.round(totalPayment).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                    Cost of Credit
                  </p>
                  <p className="text-xs font-semibold text-emerald-400 tracking-tight">
                    {Math.round(totalInterest).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            className="w-full mt-4 bg-primary text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 transition-all active:translate-y-0 flex items-center justify-center gap-2 group/btn relative overflow-hidden"
            onClick={() => navigate('/login')}
          >
            <span className="relative z-10">Get Started</span>
            <ArrowRight
              size={14}
              className="relative z-10 group-hover/btn:translate-x-0.5 transition-transform"
            />
          </button>

          <p className="mt-3 text-[10px] text-center text-slate-400 dark:text-slate-500 font-normal flex items-center justify-center gap-1.5">
            <Info size={10} className="text-primary/60" />
            Subject to credit approval
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default LoanCalculator;
