// Status badge for a lending group.
// forming = gray, active = green, at_risk = red/amber, closed = gray.
const GROUP_STATUS_STYLES = {
  forming: 'bg-slate-500/10 text-slate-600',
  active: 'bg-emerald-500/10 text-emerald-600',
  at_risk: 'bg-red-500/10 text-red-600',
  closed: 'bg-slate-500/10 text-slate-600',
};

const GROUP_STATUS_LABELS = {
  forming: 'Forming',
  active: 'Active',
  at_risk: 'At Risk',
  closed: 'Closed',
};

const GroupStatusBadge = ({ status, className = '' }) => (
  <span
    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
      GROUP_STATUS_STYLES[status] || 'bg-slate-500/10 text-slate-600'
    } ${className}`}
  >
    {GROUP_STATUS_LABELS[status] || status}
  </span>
);

export default GroupStatusBadge;
