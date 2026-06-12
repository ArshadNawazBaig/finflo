import { useState } from 'react';
import { Calculator, Info, ChevronDown, Landmark, TableProperties, X, Minus, Plus } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';
import ModernSlider from '@/components/ui/ModernSlider';

const MemberLoanCalculator = ({ member, products = [] }) => {
  const initialProduct = products[0] || null;
  const [selectedProduct, setSelectedProduct] = useState(initialProduct);
  const [amount, setAmount] = useState(
    initialProduct?.maxAmount ? Math.min(200000, initialProduct.maxAmount) : 200000,
  );
  const [term, setTerm] = useState(initialProduct?.duration || 12);
  const [rate, setRate] = useState(initialProduct?.interestRate || 10);
  const [interestType, setInterestType] = useState(
    initialProduct?.interestType || 'emi',
  );
  const [showSchedule] = useState(true);
  const [mobileScheduleOpen, setMobileScheduleOpen] = useState(false);
  // Compound-only: how many installments the borrower misses, for the late-
  // payment (interest-on-interest) impact illustration.
  const [missedInstallments, setMissedInstallments] = useState(1);

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
    } else {
      // Simple AND compound use flat interest at origination — this matches the
      // server's issuance math (loanMath.calculateCompoundInterest is identical
      // to simple). Compounding only ever applies dynamically to MISSED
      // installments, which a forward-looking simulator can't project. Modelling
      // compound as P·(1+r)ⁿ here produced a summary total that the amortization
      // schedule (reducing-balance) could never reconcile with.
      const interest = principal * yearlyRate * (n / 12);
      const total = principal + interest;
      return { monthly: total / n, total, interest };
    }
  };

  const result = calculate();
  const creditLimit = member?.creditLimit || 0;
  const maxAmount = 5000000;
  const minAmount = selectedProduct?.minAmount || 5000;

  // Generate amortization schedule
  const generateSchedule = () => {
    const schedule = [];
    const monthlyRate = rate / 100 / 12;
    let balance = amount;

    for (let i = 1; i <= term; i++) {
      let interestPart, principalPart, emiAmount;

      if (interestType === 'emi' && monthlyRate > 0) {
        // Reducing balance: interest accrues on the outstanding balance.
        emiAmount = result.monthly;
        interestPart = balance * monthlyRate;
        principalPart = emiAmount - interestPart;
      } else {
        // Simple, compound, and 0% EMI: flat interest on the ORIGINAL principal
        // each month. This mirrors calculate() so the schedule's interest column
        // sums to the summary's total interest and the balance amortizes to
        // exactly zero (principal portion is a constant amount/term).
        emiAmount = result.monthly;
        interestPart = (amount * (rate / 100)) / 12;
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

  const scheduleData = generateSchedule();

  // Compound late-payment impact. Mirrors the server cron
  // (runCompoundInterestAccrual): for each MISSED installment, one month of
  // interest is charged on the outstanding principal and capitalized into it,
  // so the next missed month accrues interest-on-interest. This is the ONLY way
  // compound diverges from simple — on time, they are identical.
  const compoundImpact = () => {
    let running = amount; // outstanding principal (worst case: behind from start)
    let extra = 0;
    const periods = Math.min(Math.max(0, missedInstallments), term);
    for (let p = 0; p < periods; p++) {
      const periodInterest = Math.round((running * rate) / 1200);
      if (periodInterest <= 0) break;
      extra += periodInterest;
      running += periodInterest; // capitalize → next period compounds on it
    }
    return { extra, newTotal: Math.round(result.total + extra) };
  };
  const impact = compoundImpact();

  return (
    <div className="rounded-[2rem] bg-card border border-border/50 shadow-xs overflow-hidden">
      <div className="relative flex flex-col lg:block">
        {/* Left Panel: Calculator Inputs & Results.
            On lg+, reserve right-side space so the absolutely-positioned
            schedule panel doesn't overlap. Left's natural content height
            becomes the bounding box the right panel scrolls inside. */}
        <div
          className={cn(
            'p-8 sm:p-10 transition-all duration-500',
            showSchedule && 'lg:border-r border-border/40 lg:mr-[500px] xl:mr-[600px]',
          )}
        >
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-x-12 gap-y-8 mb-10 px-2">
            <ModernSlider
              label="Interest Rate"
              value={rate}
              min={1}
              max={30}
              step={0.1}
              onChange={setRate}
              suffix="%"
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
            <div className="xl:col-span-2">
              <ModernSlider
                label="Loan Amount"
                value={amount}
                min={minAmount}
                max={maxAmount}
                step={5000}
                onChange={setAmount}
                suffix=""
              />
            </div>
          </div>

          {/* Results Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden shadow-xl shadow-slate-900/20">
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-center sm:text-left flex-1">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Monthly Payment
                </p>
                <span className="text-4xl font-black tracking-tighter tabular-nums text-white">
                  {formatCurrency(Math.round(result.monthly))}
                </span>
              </div>
              
              <div className="flex flex-col gap-3 w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-end gap-6 pb-2 border-b border-slate-700/50">
                  <div className="text-right">
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
          </div>

          {/* Compound-only: Late Payment Impact (interest-on-interest) */}
          {interestType === 'compound' && (
            <div className="mt-5 p-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04]">
              <div className="flex items-center justify-between mb-4 gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 dark:text-amber-500">
                    Late Payment Impact
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                    Compound charges interest on unpaid interest
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Fewer missed installments"
                    onClick={() =>
                      setMissedInstallments((v) => Math.max(0, v - 1))
                    }
                    className="w-7 h-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/40 active:scale-95 transition-all"
                  >
                    <Minus size={13} />
                  </button>
                  <span className="w-16 text-center text-xs font-black tabular-nums">
                    {missedInstallments}
                    <span className="text-[9px] font-bold text-muted-foreground ml-1">
                      missed
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label="More missed installments"
                    onClick={() =>
                      setMissedInstallments((v) => Math.min(term, v + 1))
                    }
                    className="w-7 h-7 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted/40 active:scale-95 transition-all"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-card/60 border border-border/30">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Extra interest-on-interest
                  </p>
                  <p className="text-sm font-black tabular-nums text-amber-600 dark:text-amber-500">
                    {impact.extra > 0 ? '+' : ''}
                    {formatCurrency(impact.extra)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-card/60 border border-border/30">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
                    Projected payback
                  </p>
                  <p className="text-sm font-black tabular-nums">
                    {formatCurrency(impact.newTotal)}
                  </p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/80 font-medium mt-3 leading-relaxed">
                Pay on time and you owe the on-time total above — identical to
                simple interest. Each missed installment adds a month of interest
                ({rate}%/yr) onto your balance, which then accrues more interest.
              </p>
            </div>
          )}

          {/* Mobile: Show Schedule Button */}
          <div className="lg:hidden mt-6">
            <button
              onClick={() => setMobileScheduleOpen(true)}
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-primary/5 border border-primary/15 text-primary hover:bg-primary/10 transition-all active:scale-[0.98]"
            >
              <TableProperties size={18} />
              <span className="text-xs font-black uppercase tracking-widest">View Amortization Schedule</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Right Panel: Amortization Schedule — Desktop Only.
            Absolutely positioned so the left panel's natural height defines
            the bounding box. Inner table area scrolls within that height. */}
        {showSchedule && (
          <div
            className="hidden lg:flex lg:absolute lg:inset-y-0 lg:right-0 lg:w-[500px] xl:w-[600px] bg-muted/5 flex-col animate-in slide-in-from-right-4 duration-500"
          >
            <div className="p-6 border-b border-border/40 bg-card/50 backdrop-blur-sm flex items-center justify-between shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Amortization Schedule</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  Breakdown for {term} months
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              <table className="w-full text-[11px] border-collapse">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-md z-10">
                  <tr>
                    <th className="px-4 py-3 text-left font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/40">#</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/40">EMI</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/40">Principal</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/40">Interest</th>
                    <th className="px-4 py-3 text-right font-black uppercase tracking-widest text-muted-foreground/60 border-b border-border/40">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/10">
                  {scheduleData.map((row) => (
                    <tr key={row.month} className="hover:bg-primary/5 transition-colors group">
                      <td className="px-4 py-3 font-bold tabular-nums text-muted-foreground group-hover:text-foreground">{row.month}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">{row.emi.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-primary">{row.principal.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-500">{row.interest.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold group-hover:text-primary transition-colors">{row.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Full-Screen Schedule Overlay */}
      {mobileScheduleOpen && (
        <div className="lg:hidden fixed inset-0 z-[600] bg-background/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/50 bg-card shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <TableProperties size={18} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight">Amortization Schedule</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {term} months · {rate}% · {formatCurrency(amount)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setMobileScheduleOpen(false)}
              className="p-2.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          {/* Summary Bar */}
          <div className="grid grid-cols-3 gap-px bg-border/30 border-b border-border/50 shrink-0">
            <div className="bg-card p-3 text-center">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Monthly</p>
              <p className="text-xs font-black tabular-nums mt-0.5">{formatCurrency(Math.round(result.monthly))}</p>
            </div>
            <div className="bg-card p-3 text-center">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Total</p>
              <p className="text-xs font-black tabular-nums mt-0.5">{formatCurrency(Math.round(result.total))}</p>
            </div>
            <div className="bg-card p-3 text-center">
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground/50">Interest</p>
              <p className="text-xs font-black tabular-nums text-emerald-500 mt-0.5">{formatCurrency(Math.round(result.interest))}</p>
            </div>
          </div>

          {/* Mobile Card List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {scheduleData.map((row) => (
              <div
                key={row.month}
                className="p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/20 transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                      {row.month}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">Month {row.month}</span>
                  </span>
                  <span className="text-sm font-black tabular-nums">{formatCurrency(row.emi)}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Principal</p>
                    <p className="text-[11px] font-bold tabular-nums text-primary">{formatCurrency(row.principal)}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Interest</p>
                    <p className="text-[11px] font-bold tabular-nums text-amber-500">{formatCurrency(row.interest)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-0.5">Balance</p>
                    <p className="text-[11px] font-black tabular-nums">{formatCurrency(row.balance)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Close Footer */}
          <div className="p-4 border-t border-border/50 bg-card shrink-0">
            <button
              onClick={() => setMobileScheduleOpen(false)}
              className="w-full py-3.5 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
            >
              Close Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberLoanCalculator;
