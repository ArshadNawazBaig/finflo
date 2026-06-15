import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  Users,
  Activity,
  Award,
  X,
  ExternalLink,
  Download,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  getAppUrl,
  getLandingUrl,
  IS_LANDING_DOMAIN,
  IS_DEV,
} from '@/lib/constants';

// Minimal system status pill. Pings /api/health once on mount and renders a
// subtle dot + label. Stays muted by design so it doesn't compete with the
// rest of the footer.
const StatusPill = () => {
  const [status, setStatus] = useState('checking'); // 'checking' | 'operational' | 'degraded'

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    fetch('/api/health', { signal: controller.signal })
      .then((res) => {
        if (cancelled) return;
        setStatus(res.ok ? 'operational' : 'degraded');
      })
      .catch(() => {
        if (!cancelled) setStatus('degraded');
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const dotClass =
    status === 'operational'
      ? 'bg-emerald-500'
      : status === 'degraded'
        ? 'bg-amber-500'
        : 'bg-slate-400';
  const label =
    status === 'operational'
      ? 'All systems operational'
      : status === 'degraded'
        ? 'Investigating issues'
        : 'Checking status';

  return (
    <div className="inline-flex items-center gap-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
      <span className="relative flex h-1.5 w-1.5">
        {status === 'operational' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
        )}
        <span
          className={`relative inline-flex h-1.5 w-1.5 rounded-full ${dotClass}`}
        />
      </span>
      {label}
    </div>
  );
};

// On finflo.org, app routes need to cross-domain to app.finflo.org
const FooterLink = ({ to, children, isAppRoute = false, ...props }) => {
  if (isAppRoute && IS_LANDING_DOMAIN && !IS_DEV) {
    return (
      <a href={getAppUrl(to)} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link to={to} {...props}>
      {children}
    </Link>
  );
};

// Apple icon SVG component
const AppleIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 14 17"
    fill="currentColor"
    className={className}
  >
    <path d="M13.163 11.554c-.262.586-.571 1.125-.93 1.62-.488.674-.888 1.14-1.197 1.4-.478.427-.99.645-1.538.658-.394 0-.868-.112-1.422-.34-.556-.226-1.067-.339-1.535-.339-.488 0-1.012.113-1.572.34-.56.227-1.013.345-1.358.358-.527.024-1.051-.2-1.572-.674-.335-.284-.754-.77-1.255-1.46-.537-.74-.979-1.598-1.325-2.578C.153 9.667 0 8.813 0 7.983c0-.95.206-1.77.617-2.457a3.617 3.617 0 0 1 1.293-1.31 3.474 3.474 0 0 1 1.749-.494c.417 0 .965.13 1.646.385.679.256 1.114.386 1.305.386.143 0 .628-.152 1.452-.455.78-.28 1.437-.397 1.976-.352 1.46.118 2.557.694 3.286 1.732-1.305.791-1.95 1.9-1.936 3.323.013 1.108.413 2.03 1.198 2.763.356.338.754.599 1.194.784-.096.278-.197.544-.304.804l-.113.262ZM10.093.34c0 .868-.317 1.679-.949 2.43-.763.893-1.685 1.41-2.685 1.328a2.7 2.7 0 0 1-.02-.329c0-.834.363-1.726.906-2.455.317-.37.72-.677 1.208-.923.487-.243.948-.377 1.383-.4.014.117.02.234.02.35h.137Z" />
  </svg>
);

// Android icon SVG component
const AndroidIcon = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M17.523 2.236a.5.5 0 0 0-.862.01L14.894 5.56a10.1 10.1 0 0 0-5.79 0L7.339 2.246a.5.5 0 0 0-.862-.01.5.5 0 0 0-.05.438l1.62 3.134A9.85 9.85 0 0 0 2 14h20a9.85 9.85 0 0 0-6.047-8.192l1.62-3.134a.5.5 0 0 0-.05-.438ZM7 11.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM3 15.5v5A1.5 1.5 0 0 0 4.5 22h1A1.5 1.5 0 0 0 7 20.5V15H3.5a.5.5 0 0 0-.5.5Zm14-.5v6a1.5 1.5 0 0 0 1.5 1.5h1A1.5 1.5 0 0 0 21 21v-5.5a.5.5 0 0 0-.5-.5H17Zm-13.5.5a.5.5 0 0 0-.5.5v4a1.5 1.5 0 0 0 1.5 1.5.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5H3.5Zm18 0a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5A1.5 1.5 0 0 0 23 20v-4a.5.5 0 0 0-.5-.5h-1Z" />
  </svg>
);

// Share icon (iOS share button appearance)
const ShareIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

// Plus square icon for Add to Home Screen
const PlusSquareIcon = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

// iOS Install Instructions Modal
const IOSInstallModal = ({ isOpen, onClose, appType }) => {
  if (!isOpen) return null;

  const appUrl =
    appType === 'member'
      ? 'https://app.finflo.org?app_mode=member'
      : 'https://app.finflo.org';
  const appName = appType === 'member' ? 'FinFlo Member' : 'FinFlo Business';
  const loginPath = appType === 'member' ? '/member/login' : '/login';

  const steps = [
    {
      number: '1',
      title: 'Open in Safari',
      description: `Tap the button below to open ${appName} in Safari browser`,
      icon: <ExternalLink size={22} />,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '2',
      title: 'Tap the Share button',
      description: 'Tap the share icon at the bottom of Safari',
      icon: <ShareIcon size={22} />,
      color: 'from-indigo-500 to-violet-500',
    },
    {
      number: '3',
      title: 'Add to Home Screen',
      description: 'Scroll down and tap "Add to Home Screen", then tap "Add"',
      icon: <PlusSquareIcon size={22} />,
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X size={16} />
          </Button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-white/10 dark:to-white/5 flex items-center justify-center border border-slate-200 dark:border-white/10">
              <AppleIcon size={22} className="text-white dark:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Install {appName}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                iPhone &amp; iPad
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Install {appName} as a full-screen app on your iPhone. It works just
            like a native app — no App Store needed.
          </p>
        </div>

        {/* Steps */}
        <div className="px-6 pb-2 space-y-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="flex items-start gap-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06]"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}
              >
                {step.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
              <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5">
                {step.number}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <div className="px-6 py-5">
          <a
            href={IS_DEV ? loginPath : appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-gradient-to-r from-slate-800 to-slate-900 dark:from-white/15 dark:to-white/10 text-white font-bold text-sm hover:opacity-90 transition-all hover:-translate-y-0.5 shadow-lg"
          >
            <ExternalLink size={16} />
            Open {appName} in Safari
          </a>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-3 font-medium">
            Must use Safari browser on iPhone/iPad
          </p>
        </div>
      </div>
    </div>
  );
};

const Footer = () => {
  const [iosModal, setIosModal] = useState({ open: false, type: 'member' });

  return (
    <>
      <footer className="dark pt-10 pb-8 lg:pt-16 bg-slate-950 border-t border-white/[0.04] px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Main grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-5">
              <Link
                to="/"
                className="inline-block hover:opacity-80 transition-opacity"
              >
                <Logo showText={true} className="h-10" />
              </Link>
              <p className="text-[14px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-sm">
                The foundational operating layer for modern financial
                institutions. Precision-engineered for global capital flow.
              </p>
              <StatusPill />
              <div className="flex items-center gap-5 pt-1">
                {[
                  {
                    Icon: Globe,
                    link: '#architecture',
                    isApp: false,
                    label: 'Architecture',
                  },
                  { Icon: Users, link: '/join', isApp: true, label: 'Join' },
                  {
                    Icon: Activity,
                    link: '/documentation/api',
                    isApp: false,
                    label: 'API',
                  },
                  {
                    Icon: Award,
                    link: '/privacy',
                    isApp: false,
                    label: 'Privacy',
                  },
                ].map(({ Icon, link, isApp, label }, i) => {
                  const isAnchor = link.startsWith('#');
                  const className =
                    'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors';

                  if (isAnchor) {
                    return (
                      <a
                        key={i}
                        href={link}
                        aria-label={label}
                        className={className}
                      >
                        <Icon size={16} strokeWidth={1.75} />
                      </a>
                    );
                  }
                  return (
                    <FooterLink
                      key={i}
                      to={link}
                      isAppRoute={isApp}
                      aria-label={label}
                      className={className}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </FooterLink>
                  );
                })}
              </div>
            </div>

            {/* Link columns */}
            {[
              {
                title: 'Ecosystem',
                items: [
                  'Ledger Core',
                  'Neural Underwriting',
                  'Neural Risks',
                  'API Gateway',
                ],
              },
              {
                title: 'Company',
                items: ['Global Policy', 'Terms of Service'],
              },
              {
                title: 'Support',
                items: [
                  'Documentation',
                  'API Reference',
                  'Loan Lookup Portal',
                  'Member Console',
                ],
              },
            ].map((col, i) => (
              <div key={i}>
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-6 text-slate-900 dark:text-slate-200">
                  {col.title}
                </h5>
                <ul className="space-y-3">
                  {col.items.map((item, j) => {
                    const linkMap = {
                      'Ledger Core': '/documentation#architecture',
                      'Neural Underwriting': '/documentation#architecture',
                      'Neural Risks': '/documentation#architecture',
                      'API Gateway': '/documentation/api',
                      'Global Policy': '/privacy',
                      'Terms of Service': '/terms',
                      'Loan Lookup Portal': '/loan-lookup',
                      'Member Console': '/member/login',
                      Documentation: '/documentation',
                      'API Reference': '/documentation/api',
                    };
                    const path = linkMap[item];
                    const isAppLink = [
                      'Member Console',
                      'Loan Lookup Portal',
                    ].includes(item);
                    const linkClass =
                      'text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-normal';

                    if (path) {
                      return (
                        <li key={j}>
                          <FooterLink
                            to={path}
                            isAppRoute={isAppLink}
                            className={linkClass}
                          >
                            {item}
                          </FooterLink>
                        </li>
                      );
                    }
                    return (
                      <li key={j} className={`${linkClass} cursor-pointer`}>
                        {item}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          {/* Download Apps Section */}
          <div className="mt-16 pt-10 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-10">
              <div className="max-w-sm">
                <h5 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-200">
                  Get our apps
                </h5>
                <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Native Android builds, plus a single-tap Safari install for
                  iPhone and iPad. Same data, same account.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:max-w-lg lg:ml-auto">
                {/* Android group */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-200">
                      <AndroidIcon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                        Android
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Direct APK download
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/downloads/member-app.apk?v=20260612"
                      download="FinFlo-Member.apk"
                      className="group flex items-center justify-between gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] px-3 py-2 hover:border-slate-300 dark:hover:bg-white/[0.08] transition-colors"
                    >
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        Member
                      </span>
                      <Download
                        size={13}
                        className="flex-shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                      />
                    </a>
                    <a
                      href="/downloads/business-app.apk?v=20260612"
                      download="FinFlo-Business.apk"
                      className="group flex items-center justify-between gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] px-3 py-2 hover:border-slate-300 dark:hover:bg-white/[0.08] transition-colors"
                    >
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        Business
                      </span>
                      <Download
                        size={13}
                        className="flex-shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                      />
                    </a>
                  </div>
                </div>

                {/* iOS group */}
                <div className="rounded-2xl border border-slate-200/70 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2.5 mb-3.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] text-slate-700 dark:text-slate-200">
                      <AppleIcon size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                        iPhone &amp; iPad
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        Add to Home Screen
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => setIosModal({ open: true, type: 'member' })}
                      className="group flex items-center justify-between gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] px-3 py-2 hover:border-slate-300 dark:hover:bg-white/[0.08] transition-colors text-left"
                    >
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        Member
                      </span>
                      <ExternalLink
                        size={13}
                        className="flex-shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setIosModal({ open: true, type: 'business' })}
                      className="group flex items-center justify-between gap-1.5 rounded-xl border border-slate-200/70 dark:border-white/[0.06] bg-white dark:bg-white/[0.05] px-3 py-2 hover:border-slate-300 dark:hover:bg-white/[0.08] transition-colors text-left"
                    >
                      <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200">
                        Business
                      </span>
                      <ExternalLink
                        size={13}
                        className="flex-shrink-0 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white transition-colors"
                      />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-16 pt-6 border-t border-slate-100 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-normal tracking-wide">
              © 2026 Finflo. All rights reserved.
            </p>
            <div className="flex items-center gap-5">
              <Link
                to="/privacy"
                className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-normal"
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-normal"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* iOS Install Modal */}
      <IOSInstallModal
        isOpen={iosModal.open}
        onClose={() => setIosModal({ open: false, type: 'member' })}
        appType={iosModal.type}
      />
    </>
  );
};

export default Footer;
