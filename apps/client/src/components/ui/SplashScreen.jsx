import React from 'react';
import { cn } from '@/lib/utils';

const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#020617]">
      <div className="relative flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-1000 ease-out">
        {/* Animated Logo Container */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
          {/* Outer Glow Ring */}
          <div className="absolute inset-0 rounded-[2rem] bg-primary/20 blur-2xl animate-pulse scale-110" />

          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-2xl"
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
              className="fill-emerald-400 animate-pulse"
            />
          </svg>
        </div>

        {/* Branding */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase text-center">
            Loan
            <span className="text-primary ml-1">Master</span>
          </h1>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-primary/30" />
            <p className="text-[10px] font-bold tracking-[0.4em] text-slate-500 uppercase">
              Fintech Excellence
            </p>
            <span className="h-px w-8 bg-primary/30" />
          </div>
        </div>

        {/* Loading Progress Bar */}
        <div className="absolute -bottom-24 w-48 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-primary w-1/3 rounded-full animate-[loading_1.5s_infinite_ease-in-out]" />
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(250%);
          }
        }
      `}</style>
    </div>
  );
};

export default SplashScreen;
