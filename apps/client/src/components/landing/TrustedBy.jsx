import useSystemSettings from '@/hooks/useSystemSettings';

const PartnerLogo = ({ partner, ...rest }) => (
  <div
    {...rest}
    className="flex shrink-0 items-center gap-2 grayscale opacity-60 dark:opacity-50 transition-all duration-300 hover:grayscale-0 hover:opacity-100 hover:scale-105 cursor-default"
  >
    {partner.logoUrl ? (
      <img
        src={partner.logoUrl}
        alt={partner.name}
        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover ring-1 ring-slate-200/60 dark:ring-white/10"
      />
    ) : (
      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 dark:from-white dark:to-slate-300 flex items-center justify-center text-white dark:text-slate-900 text-[9px] sm:text-[10px] font-black">
        {partner.name?.charAt(0)?.toUpperCase()}
      </div>
    )}
    <span className="text-xs sm:text-sm font-extrabold tracking-tight text-slate-700 dark:text-slate-200 whitespace-nowrap">
      {partner.name}
    </span>
  </div>
);

const TrustedBy = () => {
  const { settings, loading } = useSystemSettings();

  if (loading) return null;

  // Use all active partners for an infinite, seamlessly looping slider.
  const partners = settings?.partners?.filter((p) => p.active) || [];

  if (partners.length === 0) return null;

  // Repeat the partner set so a single copy is wider than the viewport, then
  // render that doubled. Without enough width, the -50% translate would scroll
  // into empty space before wrapping (looks like the loop stops). Doubling a
  // viewport-spanning base makes the scroll continuous and seamless.
  const repeats = Math.max(2, Math.ceil(12 / partners.length));
  const base = Array.from({ length: repeats }).flatMap(() => partners);
  const loop = [...base, ...base];

  return (
    <section className="py-12 lg:py-16 border-y border-slate-200/50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.01] overflow-hidden relative">
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="flex flex-col items-center justify-center gap-8">
          <p className="text-[11px] sm:text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] text-center">
            Trusted by leading institutions worldwide
          </p>

          {/* Infinite slider — 5 partners scrolling seamlessly, always running.
              Keyframes are inlined so the animation never depends on the
              Tailwind config being regenerated (HMR doesn't pick that up). */}
          <style>{`
            @keyframes finflo-marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
          `}</style>
          <div className="w-full overflow-hidden">
            <div
              className="flex w-max items-center gap-x-8 sm:gap-x-14"
              style={{ animation: 'finflo-marquee 40s linear infinite' }}
            >
              {loop.map((partner, idx) => (
                <PartnerLogo key={idx} partner={partner} aria-hidden={idx >= partners.length} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edge fades so logos dissolve in/out of the slider */}
      <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-slate-50 dark:from-[#020617] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-slate-50 dark:from-[#020617] to-transparent z-10 pointer-events-none" />
    </section>
  );
};

export default TrustedBy;
