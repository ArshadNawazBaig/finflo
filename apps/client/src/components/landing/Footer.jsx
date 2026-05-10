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
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="space-y-2">
              <h5 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-900 dark:text-slate-200">
                Download Our Apps
              </h5>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-normal max-w-md">
                Get the FinFlo mobile experience. Download the APK for your role and start managing finances on the go.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a
                href="/member-app.apk"
                download="FinFlo-Member.apk"
                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-500/20 group"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download APK</p>
                  <p className="text-sm font-bold -mt-0.5">Member App</p>
                </div>
                <Download size={16} className="ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
              </a>
              <a
                href="/business-app.apk"
                download="FinFlo-Business.apk"
                className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 group"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div className="text-left">
                  <p className="text-[9px] font-semibold uppercase tracking-wider opacity-80">Download APK</p>
                  <p className="text-sm font-bold -mt-0.5">Business App</p>
                </div>
                <Download size={16} className="ml-2 opacity-60 group-hover:opacity-100 group-hover:translate-y-0.5 transition-all" />
              </a>
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
