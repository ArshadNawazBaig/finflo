import { Link } from 'react-router-dom';
import { Globe, Users, Activity, Award } from 'lucide-react';
import Logo from '@/components/Logo';

const Footer = () => {
  return (
    <footer className="py-24 bg-white dark:bg-[#020617] border-t border-slate-200 dark:border-white/5 px-6 relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16">
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center gap-3">
            <Logo showText={true} className="h-12" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-sm">
            The foundational operating layer for modern financial institutions.
            Precision-engineered for global capital flow.
          </p>
          <div className="flex gap-4">
            {[Globe, Users, Activity, Award].map((Icon, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:bg-primary hover:text-white transition-all cursor-pointer group"
              >
                <Icon
                  size={20}
                  strokeWidth={2.5}
                  className="group-hover:scale-110 transition-transform"
                />
              </div>
            ))}
          </div>
        </div>

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
            items: [
              'Nexus Infrastructure',
              'Global Policy',
              'Terms of Service',
              'Security Layer',
              'Partnerships',
            ],
          },
          {
            title: 'Support',
            items: [
              'Documentation',
              'API Reference',
              'Loan Lookup Portal',
              'Member Console',
              'Network Status',
              'Careers',
            ],
          },
        ].map((col, i) => (
          <div key={i}>
            <h5 className="text-[10px] font-black uppercase tracking-[0.4em] mb-10 text-slate-900 dark:text-slate-200">
              {col.title}
            </h5>
            <ul className="space-y-6">
              {col.items.map((item, j) => {
                const linkMap = {
                  'Global Policy': '/privacy',
                  'Terms of Service': '/terms',
                  'Loan Lookup Portal': '/loan-lookup',
                  'Member Console': '/member/login',
                  Documentation: '/documentation',
                  'API Reference': '/documentation/api',
                };
                const path = linkMap[item];

                return path ? (
                  <li key={j} className="w-fit">
                    <Link
                      to={path}
                      className="text-sm font-black text-slate-500 hover:text-primary transition-colors cursor-pointer relative group block"
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                    </Link>
                  </li>
                ) : (
                  <li
                    key={j}
                    className="text-sm font-black text-slate-500 hover:text-primary transition-colors cursor-pointer relative group w-fit"
                  >
                    {item}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="max-w-7xl mx-auto mt-32 pt-12 border-t border-slate-200 dark:border-white/5 text-center">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em] opacity-60">
          © 2026 LOANMASTER INFRASTRUCTURE. OPERATING AT GLOBAL SCALE. ALL DATA
          CRYPTOGRAPHICALLY SECURED.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
