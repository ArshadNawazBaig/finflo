import React, { useId } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom, memberAtom } from '@/atoms';

const Logo = ({
  className = 'h-8',
  showText = true,
  custom = false,
  innerTextColor = '',
  onColor = false,
}) => {
  const gradientId = useId().replace(/:/g, '');
  const user = useAtomValue(userAtom);
  const member = useAtomValue(memberAtom);

  const session =
    user && Object.keys(user).length > 0
      ? user
      : member && Object.keys(member).length > 0
        ? member
        : {};

  const isProPlan =
    (session?.plan === 'Pro' || session?.adminPlan === 'Pro') &&
    (session?.subscriptionStatus === 'active' || !session?.subscriptionStatus);

  const logoUrl = isProPlan
    ? session?.businessLogo ||
      session?.business?.businessLogo ||
      session?.user?.businessLogo ||
      session?.branch?.branding?.logoUrl ||
      null
    : null;

  const companyName = isProPlan
    ? session?.businessName ||
      session?.business?.businessName ||
      session?.user?.businessName ||
      session?.name
    : '';

  return (
    <div
      className={
        onColor
          ? 'inline-flex items-center gap-3 pl-2 pr-3 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-white/[0.06] shadow-sm'
          : `flex items-center gap-3 ${className}`
      }
    >
      {/* Icon */}
      <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
        {logoUrl && custom ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-xl border"
          />
        ) : (
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm transition-all duration-700 group-hover:scale-110"
          >
            <defs>
              <linearGradient
                id={gradientId}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="50%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            {/* Reduced Background Mesh */}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill={`url(#${gradientId})`}
              className="opacity-[0.04] dark:opacity-[0.08] blur-[8px]"
            />

            {/* Enlarged Pulse Wave Line */}
            <path
              d="M6 28C6 28 10 10 20 10C30 10 34 20 25 20C16 20 10 30 20 30C30 30 34 20 34 20"
              stroke={`url(#${gradientId})`}
              strokeWidth="4.5"
              strokeLinecap="round"
              className="drop-shadow-[0_0_12px_rgba(139,92,246,0.2)]"
            />

            {/* Kinetic Point */}
            <circle cx="34" cy="20" r="3.5" fill="#ec4899" />
          </svg>
        )}
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-[19px] font-black tracking-[-0.07em] text-slate-900 dark:text-white line-clamp-1 capitalize">
            {custom && companyName ? (
              companyName
            ) : (
              <>
                <span
                  className={`${innerTextColor && `text-${innerTextColor}`}`}
                >
                  Finance
                </span>
                <span className="text-primary">Flo</span>
              </>
            )}
          </span>
          <span className="text-[7px] font-black tracking-[0.7em] text-slate-500 uppercase">
            {custom && companyName ? 'Partner Portal' : 'Banking OS'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
