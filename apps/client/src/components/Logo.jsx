import React from 'react';

const Logo = ({ className = 'h-8', showText = true, custom = false }) => {
  const [user] = React.useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  const logoUrl = user?.profilePicture || user?.branch?.branding?.logoUrl;
  const companyName =
    user?.name || user?.branch?.branding?.companyName || 'Finflow';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <div className="relative w-11 h-11 flex-shrink-0 flex items-center justify-center">
        {logoUrl && custom ? (
          <img
            src={logoUrl}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-xl"
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
                id="logo-gradient-refined"
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
              fill="url(#logo-gradient-refined)"
              className="opacity-[0.04] dark:opacity-[0.08] blur-[8px]"
            />

            {/* Enlarged Pulse Wave Line */}
            <path
              d="M6 28C6 28 10 10 20 10C30 10 34 20 25 20C16 20 10 30 20 30C30 30 34 20 34 20"
              stroke="url(#logo-gradient-refined)"
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
          <span className="text-[17px] font-black tracking-[-0.07em] text-slate-900 dark:text-white line-clamp-1">
            {logoUrl && custom ? (
              companyName
            ) : (
              <>
                Finance<span className="text-primary">Flow</span>
              </>
            )}
          </span>
          <span className="text-[7px] font-black tracking-[0.7em] text-slate-500 uppercase">
            {logoUrl && custom ? 'Partner Portal' : 'Banking OS'}
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
