import { Link } from 'react-router-dom';
import { Globe, Users, Activity, Award, Download, Smartphone } from 'lucide-react';
import Logo from '@/components/Logo';
import {
  getAppUrl,
  getLandingUrl,
  IS_LANDING_DOMAIN,
  IS_DEV,
} from '@/lib/constants';

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

const Footer = () => {
  return (
    <footer className="pt-10 pb-8 lg:pt-16 bg-white dark:bg-[#020617] border-t border-slate-100 dark:border-white/[0.04] px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-16">
          {/* Brand column */}
          <div className="lg:col-span-2 space-y-6">
            <Link
              to="/"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <Logo showText={true} className="h-10" />
            </Link>
            <p className="text-[15px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed max-w-sm">
              The foundational operating layer for modern financial
              institutions. Precision-engineered for global capital flow.
            </p>
            <div className="flex gap-2.5">
              {[
                { Icon: Globe, link: '#architecture', isApp: false },
                { Icon: Users, link: '/join', isApp: true },
                { Icon: Activity, link: '/documentation/api', isApp: false },
                { Icon: Award, link: '/privacy', isApp: false },
              ].map(({ Icon, link, isApp }, i) => {
                const isAnchor = link.startsWith('#');

                if (isAnchor) {
                  return (
                    <a
                      key={i}
                      href={link}
                      className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 dark:hover:border-primary/20 transition-all group"
                    >
                      <Icon
                        size={17}
                        strokeWidth={2}
                        className="group-hover:scale-110 transition-transform"
                      />
                    </a>
                  );
                }

                return (
                  <FooterLink
                    key={i}
                    to={link}
                    isAppRoute={isApp}
                    className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/20 dark:hover:border-primary/20 transition-all group"
                  >
                    <Icon
                      size={17}
                      strokeWidth={2}
                      className="group-hover:scale-110 transition-transform"
                    />
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
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.15em] mb-8 text-slate-900 dark:text-slate-200">
                {col.title}
              </h5>
              <ul className="space-y-4">
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

                  if (path) {
                    return (
                      <li key={j} className="w-fit">
                        <FooterLink
                          to={path}
                          isAppRoute={isAppLink}
                          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors font-medium relative group block"
                        >
                          {item}
                          <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-primary transition-all group-hover:w-full" />
                        </FooterLink>
                      </li>
                    );
                  }

                  return (
                    <li
                      key={j}
                      className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer font-medium relative group w-fit block"
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-primary transition-all group-hover:w-full" />
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Download Apps Section */}
        <div className="mt-16 pt-10 border-t border-slate-100 dark:border-white/[0.04]">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="space-y-2">
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-900 dark:text-slate-200">
                Download Our Apps
              </h5>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-normal max-w-md">
                Get the FinFlo mobile experience. Download the app for your role and start managing finances on the go.
              </p>
            </div>

            {/* Android Section */}
            <div className="space-y-3 w-full max-w-2xl">
              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 2.236a.5.5 0 0 0-.862.01L14.894 5.56a10.1 10.1 0 0 0-5.79 0L7.339 2.246a.5.5 0 0 0-.862-.01.5.5 0 0 0-.05.438l1.62 3.134A9.85 9.85 0 0 0 2 14h20a9.85 9.85 0 0 0-6.047-8.192l1.62-3.134a.5.5 0 0 0-.05-.438ZM7 11.5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm8 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0ZM3 15.5v5A1.5 1.5 0 0 0 4.5 22h1A1.5 1.5 0 0 0 7 20.5V15H3.5a.5.5 0 0 0-.5.5Zm14-.5v6a1.5 1.5 0 0 0 1.5 1.5h1A1.5 1.5 0 0 0 21 21v-5.5a.5.5 0 0 0-.5-.5H17Zm-13.5.5a.5.5 0 0 0-.5.5v4a1.5 1.5 0 0 0 1.5 1.5.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5H3.5Zm18 0a.5.5 0 0 0-.5.5v5a.5.5 0 0 0 .5.5A1.5 1.5 0 0 0 23 20v-4a.5.5 0 0 0-.5-.5h-1Z"/></svg>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">Android</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/member-app.apk"
                  download="FinFlo-Member.apk"
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download APK</p>
                    <p className="text-sm font-bold -mt-0.5">Member App</p>
                  </div>
                  <Download size={14} className="ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                </a>
                <a
                  href="/business-app.apk"
                  download="FinFlo-Business.apk"
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download APK</p>
                    <p className="text-sm font-bold -mt-0.5">Business App</p>
                  </div>
                  <Download size={14} className="ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                </a>
              </div>
            </div>

            {/* iOS Section */}
            <div className="space-y-3 w-full max-w-2xl">
              <div className="flex items-center justify-center gap-2 text-slate-400 dark:text-slate-500">
                <svg width="14" height="16" viewBox="0 0 14 17" fill="currentColor"><path d="M13.163 11.554c-.262.586-.571 1.125-.93 1.62-.488.674-.888 1.14-1.197 1.4-.478.427-.99.645-1.538.658-.394 0-.868-.112-1.422-.34-.556-.226-1.067-.339-1.535-.339-.488 0-1.012.113-1.572.34-.56.227-1.013.345-1.358.358-.527.024-1.051-.2-1.572-.674-.335-.284-.754-.77-1.255-1.46-.537-.74-.979-1.598-1.325-2.578C.153 9.667 0 8.813 0 7.983c0-.95.206-1.77.617-2.457a3.617 3.617 0 0 1 1.293-1.31 3.474 3.474 0 0 1 1.749-.494c.417 0 .965.13 1.646.385.679.256 1.114.386 1.305.386.143 0 .628-.152 1.452-.455.78-.28 1.437-.397 1.976-.352 1.46.118 2.557.694 3.286 1.732-1.305.791-1.95 1.9-1.936 3.323.013 1.108.413 2.03 1.198 2.763.356.338.754.599 1.194.784-.096.278-.197.544-.304.804l-.113.262ZM10.093.34c0 .868-.317 1.679-.949 2.43-.763.893-1.685 1.41-2.685 1.328a2.7 2.7 0 0 1-.02-.329c0-.834.363-1.726.906-2.455.317-.37.72-.677 1.208-.923.487-.243.948-.377 1.383-.4.014.117.02.234.02.35h.137Z"/></svg>
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em]">iOS</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/member-app.ipa"
                  download="FinFlo-Member.ipa"
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download IPA</p>
                    <p className="text-sm font-bold -mt-0.5">Member App</p>
                  </div>
                  <Download size={14} className="ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                </a>
                <a
                  href="/business-app.ipa"
                  download="FinFlo-Business.ipa"
                  className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:from-orange-600 hover:to-rose-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-orange-500/20 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                    <Smartphone size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download IPA</p>
                    <p className="text-sm font-bold -mt-0.5">Business App</p>
                  </div>
                  <Download size={14} className="ml-1 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-20 pt-8 border-t border-slate-100 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-400 dark:text-slate-500 font-normal">
            © 2026 Finflo. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              to="/privacy"
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors font-normal"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-primary transition-colors font-normal"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
