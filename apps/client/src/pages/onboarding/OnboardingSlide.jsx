import { motion } from 'framer-motion';

/**
 * Animated SVG illustrations for onboarding slides.
 * Each icon key maps to a unique, brand-consistent illustration.
 */

const WalletIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="wallet-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
      <linearGradient id="wallet-g2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
        <stop offset="100%" stopColor={from} stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Background circle glow */}
    <motion.circle cx="140" cy="140" r="120" fill="url(#wallet-g2)"
      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.15 }}
      transition={{ duration: 1 }} />
    {/* Wallet body */}
    <motion.rect x="60" y="90" width="160" height="110" rx="20" fill="url(#wallet-g)"
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2, type: 'spring' }} />
    {/* Wallet flap */}
    <motion.path d="M60 110C60 98.95 68.95 90 80 90H200C211.05 90 220 98.95 220 110V130H60V110Z" fill={accent} opacity="0.3"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ duration: 0.5, delay: 0.5 }} />
    {/* Card slot */}
    <motion.rect x="150" y="140" width="50" height="35" rx="8" fill="white" opacity="0.25"
      initial={{ x: 220, opacity: 0 }} animate={{ x: 150, opacity: 0.25 }}
      transition={{ duration: 0.6, delay: 0.7 }} />
    {/* Coins */}
    <motion.circle cx="100" cy="165" r="18" fill={accent} opacity="0.5"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 0.8, type: 'spring' }} />
    <motion.circle cx="120" cy="155" r="14" fill="white" opacity="0.2"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ duration: 0.5, delay: 0.9, type: 'spring' }} />
    {/* Decorative floating dots */}
    <motion.circle cx="200" cy="70" r="6" fill={accent} opacity="0.6"
      animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity }} />
    <motion.circle cx="80" cy="60" r="4" fill={from} opacity="0.4"
      animate={{ y: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
    <motion.circle cx="230" cy="200" r="5" fill={to} opacity="0.5"
      animate={{ y: [0, -12, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 1 }} />
  </svg>
);

const TransferIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="transfer-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <motion.circle cx="140" cy="140" r="110" fill={from} opacity="0.08"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
    {/* Left phone */}
    <motion.rect x="40" y="80" width="80" height="130" rx="14" fill="url(#transfer-g)"
      initial={{ x: -50, opacity: 0 }} animate={{ x: 40, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2, type: 'spring' }} />
    <motion.rect x="52" y="100" width="56" height="80" rx="4" fill="white" opacity="0.15"
      initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
      transition={{ duration: 0.5, delay: 0.5 }} />
    {/* Right phone */}
    <motion.rect x="160" y="80" width="80" height="130" rx="14" fill="url(#transfer-g)"
      initial={{ x: 280, opacity: 0 }} animate={{ x: 160, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.3, type: 'spring' }} />
    <motion.rect x="172" y="100" width="56" height="80" rx="4" fill="white" opacity="0.15"
      initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
      transition={{ duration: 0.5, delay: 0.6 }} />
    {/* Transfer arrow */}
    <motion.path d="M125 145H155M155 145L145 135M155 145L145 155" stroke={accent} strokeWidth="4" strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.8 }} />
    {/* Flying money particles */}
    <motion.circle cx="140" cy="130" r="5" fill={accent}
      animate={{ x: [0, 15, 0], y: [0, -15, 0], opacity: [0, 1, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 1 }} />
    <motion.circle cx="140" cy="160" r="4" fill="white" opacity="0.6"
      animate={{ x: [0, 12, 0], y: [0, 10, 0], opacity: [0, 0.6, 0] }}
      transition={{ duration: 2.2, repeat: Infinity, delay: 1.3 }} />
    {/* Checkmark */}
    <motion.path d="M190 195L198 203L210 188" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, delay: 1.2 }} />
  </svg>
);

const SecurityIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="security-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <motion.circle cx="140" cy="140" r="110" fill={from} opacity="0.08"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
    {/* Shield */}
    <motion.path d="M140 60L200 90V150C200 190 170 220 140 235C110 220 80 190 80 150V90L140 60Z"
      fill="url(#security-g)"
      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2, type: 'spring' }} />
    {/* Shield inner glow */}
    <motion.path d="M140 75L190 100V150C190 182 165 207 140 220C115 207 90 182 90 150V100L140 75Z"
      fill={accent} opacity="0.15"
      initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
      transition={{ duration: 0.5, delay: 0.5 }} />
    {/* Lock body */}
    <motion.rect x="120" y="135" width="40" height="35" rx="6" fill="white" opacity="0.3"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ duration: 0.4, delay: 0.7, type: 'spring' }} />
    {/* Lock arc */}
    <motion.path d="M125 135V122C125 113 131 107 140 107C149 107 155 113 155 122V135"
      stroke="white" strokeWidth="4" strokeLinecap="round" opacity="0.4"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ duration: 0.6, delay: 0.9 }} />
    {/* Keyhole */}
    <motion.circle cx="140" cy="148" r="5" fill="white" opacity="0.5"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 1.1, type: 'spring' }} />
    {/* Orbiting particles */}
    <motion.circle cx="60" cy="100" r="4" fill={accent} opacity="0.5"
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '140px 140px' }} />
    <motion.circle cx="220" cy="180" r="3" fill={from} opacity="0.4"
      animate={{ rotate: -360 }}
      transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      style={{ transformOrigin: '140px 140px' }} />
  </svg>
);

const DashboardIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="dash-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
      <linearGradient id="dash-g2" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={accent} stopOpacity="0.6" />
        <stop offset="100%" stopColor={from} stopOpacity="0.3" />
      </linearGradient>
    </defs>
    {/* Background glow */}
    <motion.circle cx="140" cy="140" r="120" fill="url(#dash-g2)"
      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 0.12 }}
      transition={{ duration: 1 }} />
    {/* Pulsing outer ring */}
    <motion.circle cx="140" cy="140" r="100" stroke={accent} strokeWidth="1.5" fill="none" opacity="0.12"
      animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.06, 0.12] }}
      transition={{ duration: 3, repeat: Infinity }} />
    {/* Orbit ring */}
    <motion.circle cx="140" cy="140" r="80" stroke={from} strokeWidth="1" fill="none" opacity="0.15"
      strokeDasharray="6 8"
      initial={{ opacity: 0 }} animate={{ opacity: 0.15 }}
      transition={{ delay: 0.3 }} />
    {/* Central hub */}
    <motion.circle cx="140" cy="140" r="38" fill="url(#dash-g)"
      initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.2, type: 'spring' }} />
    <motion.circle cx="140" cy="140" r="28" fill={accent} opacity="0.2"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 0.4, type: 'spring' }} />
    {/* Hub icon - grid */}
    <motion.rect x="130" y="130" width="8" height="8" rx="2" fill="white" opacity="0.7"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 }} />
    <motion.rect x="142" y="130" width="8" height="8" rx="2" fill="white" opacity="0.5"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.65 }} />
    <motion.rect x="130" y="142" width="8" height="8" rx="2" fill="white" opacity="0.5"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.7 }} />
    <motion.rect x="142" y="142" width="8" height="8" rx="2" fill="white" opacity="0.7"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.75 }} />
    {/* Connecting lines to orbiting nodes */}
    {[[140, 60], [220, 140], [140, 220], [60, 140]].map(([cx, cy], i) => (
      <motion.line key={`line-${i}`} x1="140" y1="140" x2={cx} y2={cy}
        stroke={accent} strokeWidth="1.5" opacity="0.15"
        initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.15 }}
        transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }} />
    ))}
    {/* Orbiting node - Members (top) */}
    <motion.circle cx="140" cy="60" r="22" fill="url(#dash-g)" opacity="0.9"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 0.9, type: 'spring' }} />
    <motion.path d="M134 58a6 6 0 1 1 12 0M130 68c0-5.5 4.5-8 10-8s10 2.5 10 8"
      stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.7"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }} />
    {/* Orbiting node - Loans (right) */}
    <motion.circle cx="220" cy="140" r="22" fill="url(#dash-g)" opacity="0.9"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 1.0, type: 'spring' }} />
    <motion.text x="220" y="145" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" opacity="0.7"
      initial={{ opacity: 0 }} animate={{ opacity: 0.7 }}
      transition={{ delay: 1.2 }}>$</motion.text>
    {/* Orbiting node - Branches (bottom) */}
    <motion.circle cx="140" cy="220" r="22" fill="url(#dash-g)" opacity="0.9"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 1.1, type: 'spring' }} />
    <motion.rect x="131" y="212" width="18" height="16" rx="3" fill="white" opacity="0.6"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 1.3, type: 'spring' }} />
    <motion.rect x="135" y="216" width="10" height="2" rx="1" fill={from} opacity="0.6"
      initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 1.4 }} />
    <motion.rect x="135" y="221" width="7" height="2" rx="1" fill={from} opacity="0.4"
      initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.45 }} />
    {/* Orbiting node - Reports (left) */}
    <motion.circle cx="60" cy="140" r="22" fill="url(#dash-g)" opacity="0.9"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 1.2, type: 'spring' }} />
    <motion.path d="M53 133v14M57 133v14M61 133v14M65 133v14"
      stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.6"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ delay: 1.4, duration: 0.4 }} style={{ transformOrigin: 'bottom' }} />
    {/* Sparkle accents */}
    <motion.circle cx="190" cy="75" r="3" fill={accent} opacity="0.5"
      animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 2, repeat: Infinity }} />
    <motion.circle cx="85" cy="85" r="4" fill={accent} opacity="0.4"
      animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.9, 1.3, 0.9] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
    <motion.circle cx="195" cy="200" r="3" fill={from} opacity="0.4"
      animate={{ opacity: [0.2, 0.6, 0.2] }}
      transition={{ duration: 3, repeat: Infinity, delay: 1 }} />
  </svg>
);

const AnalyticsIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="analytics-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <motion.circle cx="140" cy="140" r="110" fill={from} opacity="0.08"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
    {/* Brain / AI shape */}
    <motion.circle cx="140" cy="120" r="55" fill="url(#analytics-g)"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ duration: 0.7, delay: 0.2, type: 'spring' }} />
    {/* Neural connections */}
    <motion.path d="M110 100C120 80 160 80 170 100" stroke={accent} strokeWidth="2" opacity="0.5"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ delay: 0.6, duration: 0.6 }} />
    <motion.path d="M105 125C115 110 165 110 175 125" stroke="white" strokeWidth="2" opacity="0.3"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }} />
    <motion.path d="M115 140C125 130 155 130 165 140" stroke={accent} strokeWidth="2" opacity="0.4"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ delay: 1.0, duration: 0.6 }} />
    {/* Neural nodes */}
    {[
      [110, 100], [170, 100], [140, 90],
      [105, 125], [175, 125], [140, 115],
      [115, 140], [165, 140], [140, 135],
    ].map(([cx, cy], i) => (
      <motion.circle key={i} cx={cx} cy={cy} r="3" fill="white" opacity="0.6"
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.5 + i * 0.1, type: 'spring' }} />
    ))}
    {/* Insight cards */}
    <motion.rect x="65" y="190" width="65" height="40" rx="8" fill="url(#analytics-g)" opacity="0.9"
      initial={{ y: 240, opacity: 0 }} animate={{ y: 190, opacity: 0.9 }}
      transition={{ delay: 1.2, type: 'spring' }} />
    <motion.rect x="75" y="200" width="30" height="4" rx="2" fill="white" opacity="0.4"
      initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.4 }} />
    <motion.rect x="75" y="210" width="45" height="3" rx="1.5" fill="white" opacity="0.2"
      initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.5 }} />
    <motion.rect x="150" y="190" width="65" height="40" rx="8" fill="url(#analytics-g)" opacity="0.9"
      initial={{ y: 240, opacity: 0 }} animate={{ y: 190, opacity: 0.9 }}
      transition={{ delay: 1.3, type: 'spring' }} />
    <motion.rect x="160" y="200" width="30" height="4" rx="2" fill="white" opacity="0.4"
      initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ delay: 1.5 }} />
    <motion.rect x="160" y="210" width="45" height="3" rx="1.5" fill="white" opacity="0.2"
      initial={{ opacity: 0 }} animate={{ opacity: 0.2 }} transition={{ delay: 1.6 }} />
    {/* Sparkle particles */}
    <motion.circle cx="80" cy="80" r="3" fill={accent}
      animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 2, repeat: Infinity }} />
    <motion.circle cx="200" cy="85" r="4" fill={accent}
      animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.3, 0.9] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
  </svg>
);

const ScaleIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="scale-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <motion.circle cx="140" cy="140" r="110" fill={from} opacity="0.08"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
    {/* Rocket body */}
    <motion.path d="M140 70L165 130H115L140 70Z" fill="url(#scale-g)"
      initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.3, type: 'spring' }} />
    <motion.rect x="125" y="130" width="30" height="40" rx="6" fill="url(#scale-g)"
      initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4, type: 'spring' }} />
    {/* Window */}
    <motion.circle cx="140" cy="120" r="8" fill="white" opacity="0.3"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 0.7, type: 'spring' }} />
    {/* Fins */}
    <motion.path d="M115 140L100 165H115V140Z" fill={accent} opacity="0.5"
      initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.8 }} />
    <motion.path d="M165 140L180 165H165V140Z" fill={accent} opacity="0.5"
      initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.8 }} />
    {/* Exhaust flames */}
    <motion.path d="M130 170Q140 200 150 170" fill="#f97316" opacity="0.7"
      animate={{ scaleY: [1, 1.3, 1], opacity: [0.7, 0.4, 0.7] }}
      transition={{ duration: 0.5, repeat: Infinity }} />
    <motion.path d="M133 170Q140 190 147 170" fill="#fbbf24" opacity="0.5"
      animate={{ scaleY: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
      transition={{ duration: 0.4, repeat: Infinity, delay: 0.1 }} />
    {/* Stars / buildings growing */}
    <motion.rect x="60" y="210" width="25" height="35" rx="4" fill={from} opacity="0.2"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ delay: 1.0, duration: 0.5 }} style={{ transformOrigin: 'bottom' }} />
    <motion.rect x="95" y="200" width="25" height="45" rx="4" fill={from} opacity="0.3"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ delay: 1.1, duration: 0.5 }} style={{ transformOrigin: 'bottom' }} />
    <motion.rect x="160" y="195" width="25" height="50" rx="4" fill={from} opacity="0.35"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ delay: 1.2, duration: 0.5 }} style={{ transformOrigin: 'bottom' }} />
    <motion.rect x="195" y="205" width="25" height="40" rx="4" fill={from} opacity="0.25"
      initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
      transition={{ delay: 1.3, duration: 0.5 }} style={{ transformOrigin: 'bottom' }} />
    {/* Sparkle trail */}
    <motion.circle cx="130" cy="55" r="3" fill={accent}
      animate={{ opacity: [0, 1, 0], y: [0, 10, 20] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }} />
    <motion.circle cx="155" cy="50" r="2" fill="white"
      animate={{ opacity: [0, 0.7, 0], y: [0, 8, 16] }}
      transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }} />
  </svg>
);

const NotificationsIllustration = ({ from, to, accent }) => (
  <svg viewBox="0 0 280 280" fill="none" className="w-full h-full">
    <defs>
      <linearGradient id="notif-g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={from} />
        <stop offset="100%" stopColor={to} />
      </linearGradient>
    </defs>
    <motion.circle cx="140" cy="140" r="110" fill={from} opacity="0.08"
      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.8 }} />
    {/* Pulse rings */}
    <motion.circle cx="140" cy="130" r="70" stroke={accent} strokeWidth="2" fill="none" opacity="0.15"
      animate={{ scale: [1, 1.4], opacity: [0.15, 0] }}
      transition={{ duration: 2, repeat: Infinity }} />
    <motion.circle cx="140" cy="130" r="50" stroke={from} strokeWidth="2" fill="none" opacity="0.2"
      animate={{ scale: [1, 1.5], opacity: [0.2, 0] }}
      transition={{ duration: 2, repeat: Infinity, delay: 0.5 }} />
    {/* Bell body */}
    <motion.path d="M140 75C118 75 100 93 100 115V145L90 165H190L180 145V115C180 93 162 75 140 75Z"
      fill="url(#notif-g)"
      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.3, type: 'spring' }} />
    {/* Bell clapper */}
    <motion.circle cx="140" cy="178" r="12" fill="url(#notif-g)"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 0.6, type: 'spring' }} />
    {/* Bell inner highlight */}
    <motion.path d="M115 115C115 101 126 90 140 90C154 90 165 101 165 115V140H115V115Z"
      fill={accent} opacity="0.2"
      initial={{ opacity: 0 }} animate={{ opacity: 0.2 }}
      transition={{ delay: 0.5 }} />
    {/* Notification badge */}
    <motion.circle cx="175" cy="85" r="18" fill="#ef4444"
      initial={{ scale: 0 }} animate={{ scale: 1 }}
      transition={{ delay: 0.8, type: 'spring', stiffness: 300 }} />
    <motion.text x="175" y="91" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ delay: 1.0 }}>3</motion.text>
    {/* Message lines floating */}
    <motion.rect x="60" y="200" width="50" height="8" rx="4" fill={from} opacity="0.3"
      initial={{ x: -20, opacity: 0 }} animate={{ x: 60, opacity: 0.3 }}
      transition={{ delay: 1.0, type: 'spring' }} />
    <motion.rect x="65" y="215" width="35" height="6" rx="3" fill={accent} opacity="0.2"
      initial={{ x: -20, opacity: 0 }} animate={{ x: 65, opacity: 0.2 }}
      transition={{ delay: 1.1, type: 'spring' }} />
    <motion.rect x="170" y="200" width="50" height="8" rx="4" fill={from} opacity="0.3"
      initial={{ x: 280, opacity: 0 }} animate={{ x: 170, opacity: 0.3 }}
      transition={{ delay: 1.2, type: 'spring' }} />
    <motion.rect x="175" y="215" width="35" height="6" rx="3" fill={accent} opacity="0.2"
      initial={{ x: 280, opacity: 0 }} animate={{ x: 175, opacity: 0.2 }}
      transition={{ delay: 1.3, type: 'spring' }} />
    {/* Sparkle particles */}
    <motion.circle cx="90" cy="70" r="3" fill={accent}
      animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
      transition={{ duration: 2, repeat: Infinity }} />
    <motion.circle cx="210" cy="60" r="4" fill={accent}
      animate={{ opacity: [0.3, 0.9, 0.3], scale: [0.9, 1.3, 0.9] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }} />
  </svg>
);

export const illustrations = {
  wallet: WalletIllustration,
  transfer: TransferIllustration,
  security: SecurityIllustration,
  dashboard: DashboardIllustration,
  analytics: AnalyticsIllustration,
  scale: ScaleIllustration,
  notifications: NotificationsIllustration,
};

const OnboardingSlide = ({ slide, isActive }) => {
  const Illustration = illustrations[slide.icon];

  return (
    <motion.div
      className="flex flex-col items-center justify-center px-8 pt-8 pb-4 h-full w-full"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={isActive ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Illustration container */}
      <motion.div
        className="w-56 h-56 sm:w-64 sm:h-64 mb-10 relative"
        initial={{ y: 20 }}
        animate={isActive ? { y: 0 } : { y: 20 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        {/* Background glow */}
        <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${slide.bgGlow} blur-3xl scale-150`} />
        <div className="relative z-10">
          {Illustration && (
            <Illustration from={slide.gradientFrom} to={slide.gradientTo} accent={slide.accentColor} />
          )}
        </div>
      </motion.div>

      {/* Text content */}
      <motion.div
        className="text-center space-y-4 max-w-sm"
        initial={{ y: 30, opacity: 0 }}
        animate={isActive ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[-0.03em] leading-tight text-slate-900 dark:text-white">
          {slide.title}{' '}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${slide.gradientFrom}, ${slide.gradientTo})`,
            }}
          >
            {slide.titleAccent}
          </span>
        </h2>
        <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed font-normal px-2">
          {slide.description}
        </p>
      </motion.div>
    </motion.div>
  );
};

export default OnboardingSlide;
