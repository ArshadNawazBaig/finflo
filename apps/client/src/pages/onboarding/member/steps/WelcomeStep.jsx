/* eslint-disable react/prop-types -- project convention: no propTypes */
import { Rocket, UserCircle, ShieldCheck, Wallet } from 'lucide-react';
import { capitalize } from '@/lib/utils';
import StepFrame from '../../business/StepFrame';

const HIGHLIGHTS = [
  { icon: UserCircle, label: 'Complete your profile & details' },
  { icon: ShieldCheck, label: 'Secure your account with a PIN' },
  { icon: Wallet, label: 'Start saving, transferring & borrowing' },
];

const WelcomeStep = ({ member, onNext }) => (
  <StepFrame
    icon={Rocket}
    eyebrow="Welcome"
    title={`Welcome${member?.name ? `, ${capitalize(member.name.split(' ')[0])}` : ' aboard'}`}
    description="Let's set up your account in a few quick steps — it takes about 2 minutes, and you can change everything later in Settings."
    onPrimary={onNext}
    primaryLabel="Get started"
    showBack={false}
  >
    <ul className="space-y-3">
      {HIGHLIGHTS.map(({ icon: Icon, label }) => (
        <li
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-4 dark:border-white/[0.06] dark:bg-white/[0.02]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4">
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

export default WelcomeStep;
