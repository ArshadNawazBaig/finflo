/* eslint-disable react/prop-types -- project convention: no propTypes */
import { PartyPopper, UserPlus, FileText, ArrowRightLeft } from 'lucide-react';
import StepFrame from '../StepFrame';

const NEXT_ACTIONS = [
  { icon: UserPlus, label: 'Onboard your first customer' },
  { icon: FileText, label: 'Issue a loan from your new product' },
  { icon: ArrowRightLeft, label: 'Record deposits & repayments' },
];

const DoneStep = ({ onComplete, onBack }) => (
  <StepFrame
    icon={PartyPopper}
    eyebrow="All done"
    title="You're all set!"
    description="Your business is ready to go. Here are a few things you can do next from your dashboard."
    onPrimary={() => onComplete()}
    primaryLabel="Go to dashboard"
    onBack={onBack}
    onSkip={() => onComplete({ tour: true })}
    skipLabel="Take a quick tour"
  >
    <ul className="space-y-3">
      {NEXT_ACTIONS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 [&_svg]:h-4 [&_svg]:w-4">
            <Icon />
          </span>
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </span>
        </li>
      ))}
    </ul>
  </StepFrame>
);

export default DoneStep;
