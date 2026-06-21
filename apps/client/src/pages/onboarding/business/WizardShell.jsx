/* eslint-disable react/prop-types -- project convention: no propTypes */
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';

/**
 * Full-screen split-screen chrome for a setup wizard — mirrors the sign-up
 * AuthLayout aesthetic (dark brand panel on the left, content on the right). The
 * left panel shows the step roadmap; mobile gets a slim progress bar at the top
 * instead. The brand-panel copy defaults to the business wizard but is fully
 * overridable so the member setup wizard can reuse the same chrome.
 *
 * @param {string[]}        roadmap     - ordered step labels (excludes Welcome/Done)
 * @param {number}          activeIndex - roadmap index of the current step (-1 before)
 * @param {string}          [eyebrow]   - small uppercase label above the heading
 * @param {React.ReactNode} [heading]   - large headline node
 * @param {string}          [subtext]   - supporting paragraph under the heading
 * @param {string}          [footer]    - tiny uppercase footer line
 */
const WizardShell = ({
  roadmap,
  activeIndex,
  children,
  eyebrow = 'Business setup',
  heading,
  subtext = "A few quick steps and you'll be ready to onboard customers and issue your first loan.",
  footer = 'Precision engineering for modern finance',
}) => {
  const total = roadmap.length;
  // Clamp for the progress bar: Welcome (-1) → 0%, Done (>= total) → 100%.
  const progress = Math.min(Math.max(activeIndex, 0), total) / total;

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background lg:grid-cols-[400px_1fr]">
      {/* ─── Brand / roadmap panel (desktop) ─────────────────────── */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-slate-950 p-10 lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10">
          <Logo showText innerTextColor="white" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              {eyebrow}
            </p>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
              {heading || (
                <>
                  Let&apos;s get your{' '}
                  <span className="text-gradient-primary">lending</span> business
                  live.
                </>
              )}
            </h2>
            <p className="text-sm font-medium leading-relaxed text-slate-400">
              {subtext}
            </p>
          </div>

          {/* Roadmap */}
          <ol className="space-y-1">
            {roadmap.map((label, i) => {
              const done = i < activeIndex;
              const active = i === activeIndex;
              return (
                <li
                  key={label}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors',
                    active && 'bg-white/[0.04]',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors',
                      done && 'bg-primary text-white',
                      active && 'bg-primary/20 text-primary ring-1 ring-primary/40',
                      !done && !active && 'bg-white/[0.06] text-slate-500',
                    )}
                  >
                    {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      'text-[13px] font-semibold transition-colors',
                      active ? 'text-white' : done ? 'text-slate-300' : 'text-slate-500',
                    )}
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className="relative z-10 text-[10px] font-medium uppercase tracking-[0.2em] text-slate-600">
          {footer}
        </p>
      </div>

      {/* ─── Content panel ───────────────────────────────────────── */}
      <div className="relative flex min-h-screen flex-col overflow-y-auto bg-background dark:bg-slate-900">
        {/* Mobile progress bar + brand */}
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-100 bg-background/80 px-5 py-4 backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-900/80 lg:hidden">
          <Logo showText className="h-7" />
          <div className="ml-auto flex items-center gap-2">
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[11px] font-bold tabular-nums text-slate-400">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>

        <div className="flex flex-1 items-start justify-center px-5 py-10 sm:px-10 lg:items-center">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full justify-center"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WizardShell;
