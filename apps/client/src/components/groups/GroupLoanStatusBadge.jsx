// Status badge for a group-loan cycle.
// pending = amber, active = green, overdue = amber, defaulted = red,
// completed = blue.
const LOAN_STATUS_STYLES = {
  pending: 'bg-amber-500/10 text-amber-600',
  active: 'bg-emerald-500/10 text-emerald-600',
  overdue: 'bg-amber-500/10 text-amber-600',
  defaulted: 'bg-red-500/10 text-red-600',
  completed: 'bg-blue-500/10 text-blue-600',
};

const GroupLoanStatusBadge = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
      LOAN_STATUS_STYLES[status] || 'bg-slate-500/10 text-slate-600'
    } ${className}`}
  >
    {status}
  </span>
);

export default GroupLoanStatusBadge;
