import { useState, useEffect } from 'react';
import { Calculator, Info, ChevronDown, ChevronUp, Landmark } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import api from '@/lib/axios';
import ModernSlider from '@/components/ui/ModernSlider';

const MemberLoanCalculator = ({ member }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [amount, setAmount] = useState(50000);
  const [term, setTerm] = useState(12);
  const [rate, setRate] = useState(10);
  const [interestType, setInterestType] = useState('emi');
  const [showSchedule, setShowSchedule] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch loan products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/loan-products/member');
        setProducts(data);
        if (data.length > 0) {
          const first = data[0];
          setSelectedProduct(first);
          setRate(first.interestRate);
          setTerm(first.duration);
          setInterestType(first.interestType || 'emi');
          if (first.maxAmount) setAmount(Math.min(50000, first.maxAmount));
        }
      } catch {
        // If endpoint doesn't exist yet, use defaults
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
    setRate(product.interestRate);
    setTerm(product.duration);
    setInterestType(product.interestType || 'emi');
    if (product.maxAmount && amount > product.maxAmount) {
      setAmount(product.maxAmount);
    }
    if (product.minAmount && amount < product.minAmount) {
      setAmount(product.minAmount);
    }
  };

  // Calculate EMI / Simple / Compound
  const calculate = () => {
    const principal = amount;
    const yearlyRate = rate / 100;
    const monthlyRate = yearlyRate / 12;
    const n = term;

    if (principal === 0 || n === 0) return { monthly: 0, total: 0, interest: 0 };

    if (interestType === 'emi') {
      if (monthlyRate === 0) {
        return { monthly: principal / n, total: principal, interest: 0 };
      }
      const x = Math.pow(1 + monthlyRate, n);
      const monthly = (principal * x * monthlyRate) / (x - 1);
      return { monthly, total: monthly * n, interest: monthly * n - principal };
    } else if (interestType === 'simple') {
      const interest = principal * yearlyRate * (n / 12);
      const total = principal + interest;
      return { monthly: total / n, total, interest };
    } else {
      // Compound
      const total = principal * Math.pow(1 + monthlyRate, n);
      const interest = total - principal;
      return { monthly: total / n, total, interest };
    }
  };

  const result = calculate();
  const creditLimit = member?.creditLimit || 0;
  const maxAmount = selectedProduct?.maxAmount || creditLimit || 500000;
  const minAmount = selectedProduct?.minAmount || 5000;

  // Generate amortization schedule
  const generateSchedule = () => {
    const schedule = [];
    const monthlyRate = rate / 100 / 12;
    let balance = amount;

    for (let i = 1; i <= term; i++) {
      let interestPart, principalPart, emiAmount;

      if (interestType === 'emi' && monthlyRate > 0) {
        emiAmount = result.monthly;
        interestPart = balance * monthlyRate;
        principalPart = emiAmount - interestPart;
      } else if (interestType === 'simple') {
        emiAmount = result.monthly;
        interestPart = (amount * (rate / 100)) / 12;
        principalPart = emiAmount - interestPart;
      } else {
        emiAmount = result.monthly;
        interestPart = balance * monthlyRate;
        principalPart = emiAmount - interestPart;
      }

      balance = Math.max(0, balance - principalPart);

      schedule.push({
        month: i,
        emi: Math.round(emiAmount),
        principal: Math.round(principalPart),
        interest: Math.round(interestPart),
        balance: Math.round(balance),
      });
    }
    return schedule;
  };

  return (
    <div className="rounded-[2rem] bg-card p-6 sm:p-8 border border-border/50 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl shadow-inner text-white bg-gradient-to-br from-blue-500 to-indigo-600">
            <Calculator size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Loan Simulator
            </p>
            <p className="text-xs font-medium text-muted-foreground/70 mt-0.5">
              {creditLimit > 0 && `Credit limit: ${formatCurrency(creditLimit)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
          <Info size={12} className="text-primary/60" />
          Subject to approval
        </div>
      </div>

      {/* Loan Products */}
      {products.length > 0 && (
        <div className="mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-3 ml-1">
            Available Products
          </p>
          <div className="flex gap-2 flex-wrap">
            {products.map((product) => (
              <button
                key={product._id}
                onClick={() => handleProductSelect(product)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all',
                  selectedProduct?._id === product._id
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                    : 'bg-muted/20 border-border/50 text-muted-foreground hover:bg-muted/40',
                )}
              >
                <Landmark size={12} />
                {product.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Interest Type Toggle */}
      <div className="flex gap-2 p-1 bg-muted/30 rounded-2xl w-fit mb-6">
        {['emi', 'simple', 'compound'].map((type) => (
          <button
            key={type}
            onClick={() => setInterestType(type)}
            className={cn(
              'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
              interestType === type
                ? 'bg-primary text-white shadow-lg'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-6 mb-6">
        <ModernSlider
          label="Loan Amount"
          value={amount}
          min={minAmount}
          max={maxAmount}
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

      {/* Results */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-center mb-4">
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
              Estimated Monthly Payment
            </p>
            <span className="text-4xl font-black tracking-tighter tabular-nums">
              {formatCurrency(Math.round(result.monthly))}
            </span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div>
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                Total Payback
              </p>
              <p className="text-sm font-bold tracking-tight tabular-nums">
                {formatCurrency(Math.round(result.total))}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium text-slate-500 uppercase tracking-wider">
                Total Interest
              </p>
              <p className="text-sm font-bold text-emerald-400 tracking-tight tabular-nums">
                {formatCurrency(Math.round(result.interest))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Amortization Schedule Toggle */}
      <button
        onClick={() => setShowSchedule(!showSchedule)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground w-full justify-center py-3 mt-4 rounded-xl hover:bg-muted/30 transition-colors"
      >
        {showSchedule ? 'Hide' : 'View'} Amortization Schedule
        {showSchedule ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-500',
          showSchedule ? 'max-h-[600px] opacity-100 mt-2' : 'max-h-0 opacity-0',
        )}
      >
        <div className="max-h-[500px] overflow-y-auto rounded-xl border border-border/50">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
              <tr>
                <th className="px-3 py-2 text-left font-black uppercase tracking-widest text-muted-foreground">#</th>
                <th className="px-3 py-2 text-right font-black uppercase tracking-widest text-muted-foreground">EMI</th>
                <th className="px-3 py-2 text-right font-black uppercase tracking-widest text-muted-foreground">Principal</th>
                <th className="px-3 py-2 text-right font-black uppercase tracking-widest text-muted-foreground">Interest</th>
                <th className="px-3 py-2 text-right font-black uppercase tracking-widest text-muted-foreground">Balance</th>
              </tr>
            </thead>
            <tbody>
              {generateSchedule().map((row) => (
                <tr key={row.month} className="border-t border-border/20 hover:bg-muted/10">
                  <td className="px-3 py-2 font-bold tabular-nums">{row.month}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{row.emi.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-primary">{row.principal.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-500">{row.interest.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{row.balance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberLoanCalculator;
