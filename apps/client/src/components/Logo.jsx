import React from 'react';

const Logo = ({ className = 'h-8', showText = true }) => {
  const [user] = React.useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  const logoUrl = user.branch?.branding?.logoUrl;
  const companyName = user.branch?.branding?.companyName || 'Loan Master';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <div className="relative w-12 h-12 flex-shrink-0 flex items-center justify-center">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-xl"
          />
        ) : (
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-2xl"
          >
            {/* Background Shape */}
            <rect
              x="10"
              y="10"
              width="80"
              height="80"
              rx="24"
              className="fill-primary"
            />

            {/* Abstract 'L' and 'M' Intersection */}
            <path
              d="M30 35V65H45M45 65V45L60 60L75 45V65"
              stroke="white"
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Accent Glow */}
            <circle
              cx="75"
              cy="25"
              r="8"
              className="fill-emerald-400 animate-pulse opacity-80"
            />
          </svg>
        )}
      </div>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="text-[14px] font-black tracking-tighter text-slate-900 dark:text-white uppercase line-clamp-1">
            {logoUrl ? (
              companyName
            ) : (
              <>
                Loan
                <span className="text-primary ml-1">Master</span>
              </>
            )}
          </span>
          <span className="text-[6px] font-bold tracking-[0.3em] text-slate-500 uppercase">
            {logoUrl ? 'Partner Portal' : 'Fintech Excellence'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
