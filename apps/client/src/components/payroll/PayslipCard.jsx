/* eslint-disable react/prop-types -- project convention: no propTypes */
import { ArrowDownCircle, ArrowUpCircle, Wallet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const EARNING_ROWS = [
  ['Basic Salary', 'basic'],
  ['House Rent Allowance', 'hra'],
  ['Medical Allowance', 'medical'],
  ['Transport Allowance', 'transport'],
  ['Other Allowances', 'otherAllowances'],
  ['Overtime', 'overtime'],
];

const DEDUCTION_ROWS = [
  ['Income Tax', 'tax'],
  ['Provident Fund', 'providentFund'],
  ['EOBI', 'eobi'],
  ['Loan EMI', 'loanEMI'],
  ['Savings Contribution', 'savingsContribution'],
  ['Other Deductions', 'otherDeductions'],
];

const LineRow = ({ label, amount, tone }) => (
  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-white/[0.06] last:border-0">
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
      {label}
    </span>
    <span
      className={`text-sm font-bold font-mono ${
        tone === 'deduction'
          ? 'text-rose-500'
          : 'text-slate-900 dark:text-white'
      }`}
    >
      {tone === 'deduction' && amount > 0 ? '−' : ''}
      {formatCurrency(amount)}
    </span>
  </div>
);

/**
 * A read-only breakdown card for a single payslip — earnings vs deductions in
 * two columns with a highlighted net-pay banner.
 *
 * @param {object} props
 * @param {object} props.payslip - Payslip with `earnings`, `deductions`,
 *   `gross`, `totalDeductions`, `netPay`, `month`, `year`, `status`.
 */
const PayslipCard = ({ payslip }) => {
  if (!payslip) return null;

  const earnings = payslip.earnings || {};
  const deductions = payslip.deductions || {};
  const monthLabel = `${MONTHS[(payslip.month || 1) - 1] || ''} ${payslip.year || ''}`.trim();

  return (
    <div className="rounded-[2rem] bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Pay Period
        </p>
        <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
          {monthLabel || 'Payslip'}
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-100 dark:bg-white/[0.06]">
        {/* Earnings */}
        <div className="bg-white dark:bg-[#0c0c10] p-6 sm:p-8 space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Earnings
            </span>
          </div>
          {EARNING_ROWS.map(([label, key]) => (
            <LineRow key={key} label={label} amount={earnings[key] || 0} />
          ))}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-white/[0.1]">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Gross
            </span>
            <span className="text-sm font-black font-mono text-emerald-600">
              {formatCurrency(payslip.gross || 0)}
            </span>
          </div>
        </div>

        {/* Deductions */}
        <div className="bg-white dark:bg-[#0c0c10] p-6 sm:p-8 space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownCircle className="w-4 h-4 text-rose-500" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Deductions
            </span>
          </div>
          {DEDUCTION_ROWS.map(([label, key]) => (
            <LineRow
              key={key}
              label={label}
              amount={deductions[key] || 0}
              tone="deduction"
            />
          ))}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-200 dark:border-white/[0.1]">
            <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              Total
            </span>
            <span className="text-sm font-black font-mono text-rose-500">
              {formatCurrency(payslip.totalDeductions || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Net Pay */}
      <div className="flex items-center justify-between px-6 sm:px-8 py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-[0.2em]">
            Net Pay
          </span>
        </div>
        <span className="text-2xl font-black font-mono tracking-tight">
          {formatCurrency(payslip.netPay || 0)}
        </span>
      </div>
    </div>
  );
};

export default PayslipCard;
