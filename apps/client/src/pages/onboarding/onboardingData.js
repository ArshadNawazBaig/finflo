/**
 * Onboarding slide content for Member and Business app modes.
 * Each slide contains: id, title, subtitle, description, gradient colors,
 * and an icon key used by OnboardingSlide to render animated SVG art.
 */

export const memberSlides = [
  {
    id: 'member-1',
    icon: 'wallet',
    title: 'Your Finances,',
    titleAccent: 'Simplified',
    description:
      'Track your loans, investments, and wallet all in one secure place. Get real-time updates on every transaction.',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    accentColor: '#a78bfa',
    bgGlow: 'from-indigo-500/20 via-purple-500/15 to-violet-500/10',
  },
  {
    id: 'member-2',
    icon: 'transfer',
    title: 'Instant',
    titleAccent: 'Transfers',
    description:
      'Send and receive funds seamlessly between members with real-time transaction tracking and instant confirmations.',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    accentColor: '#34d399',
    bgGlow: 'from-emerald-500/20 via-teal-500/15 to-green-500/10',
  },
  {
    id: 'member-3',
    icon: 'analytics',
    title: 'Smart',
    titleAccent: 'Analytics',
    description:
      'Visualize your spending patterns, track investment growth, and get intelligent insights into your financial health.',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    accentColor: '#fbbf24',
    bgGlow: 'from-amber-500/20 via-yellow-500/15 to-orange-500/10',
  },
  {
    id: 'member-4',
    icon: 'notifications',
    title: 'Stay',
    titleAccent: 'Informed',
    description:
      'Never miss a payment deadline or important update. Smart notifications keep you on top of your financial commitments.',
    gradientFrom: '#0ea5e9',
    gradientTo: '#0284c7',
    accentColor: '#38bdf8',
    bgGlow: 'from-sky-500/20 via-blue-500/15 to-cyan-500/10',
  },
  {
    id: 'member-5',
    icon: 'security',
    title: 'Bank-Grade',
    titleAccent: 'Security',
    description:
      'Your data is protected with end-to-end encryption and two-factor authentication. Banking-level security you can trust.',
    gradientFrom: '#f43f5e',
    gradientTo: '#ec4899',
    accentColor: '#fb7185',
    bgGlow: 'from-rose-500/20 via-pink-500/15 to-red-500/10',
  },
];

export const businessSlides = [
  {
    id: 'business-1',
    icon: 'dashboard',
    title: 'Complete Business',
    titleAccent: 'Control',
    description:
      'Manage loans, members, branches, and finances from a single powerful dashboard designed for modern banking operations.',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    accentColor: '#a78bfa',
    bgGlow: 'from-indigo-500/20 via-purple-500/15 to-violet-500/10',
  },
  {
    id: 'business-2',
    icon: 'analytics',
    title: 'AI-Powered',
    titleAccent: 'Insights',
    description:
      'Get intelligent analytics, automated financial reports, and smart recommendations to make data-driven decisions.',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    accentColor: '#fbbf24',
    bgGlow: 'from-amber-500/20 via-yellow-500/15 to-orange-500/10',
  },
  {
    id: 'business-3',
    icon: 'transfer',
    title: 'Seamless',
    titleAccent: 'Operations',
    description:
      'Process deposits, withdrawals, loan disbursements, and repayments with a streamlined teller experience.',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    accentColor: '#34d399',
    bgGlow: 'from-emerald-500/20 via-teal-500/15 to-green-500/10',
  },
  {
    id: 'business-4',
    icon: 'notifications',
    title: 'Real-Time',
    titleAccent: 'Monitoring',
    description:
      'Track every transaction as it happens. Automated alerts for overdue payments, branch performance, and compliance.',
    gradientFrom: '#0ea5e9',
    gradientTo: '#0284c7',
    accentColor: '#38bdf8',
    bgGlow: 'from-sky-500/20 via-blue-500/15 to-cyan-500/10',
  },
  {
    id: 'business-5',
    icon: 'scale',
    title: 'Scale Your',
    titleAccent: 'Operations',
    description:
      'From a single branch to enterprise, FinFlo grows with your business. Multi-branch support, team management, and more.',
    gradientFrom: '#f43f5e',
    gradientTo: '#ec4899',
    accentColor: '#fb7185',
    bgGlow: 'from-rose-500/20 via-pink-500/15 to-red-500/10',
  },
];
