import {
  LayoutGrid,
  History,
  TrendingUp,
  Building2,
  FileText,
  ShieldCheck,
  MessageSquare,
  Settings,
  HandMetal,
  Landmark,
  FileCheck2,
  WalletMinimal,
  ArrowRightLeft,
  FileChartColumn,
  Settings2,
  Users,
} from 'lucide-react';

export const memberOnboardingSteps = [
  {
    title: 'Welcome to FinFlo',
    description:
      "Your unified banking OS. Let's walk through your navigation menu to master your financial command center.",
    icon: <HandMetal size={32} strokeWidth={2.5} />,
  },
  {
    title: 'Command Center',
    description:
      'This is your Dashboard. Monitor your active loans, main balance, and credit limits at a glance.',
    icon: <LayoutGrid size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-dashboard',
    path: '/member/dashboard',
  },
  {
    title: 'Transaction History',
    description:
      'View every movement of your funds, from deposits to repayments, with regulatory-grade transparency.',
    icon: <History size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-transactions',
    path: '/member/transactions',
  },
  {
    title: 'Term Deposits',
    description:
      'Grow your wealth with fixed-term deposits and track your monthly profit distributions.',
    icon: <TrendingUp size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-term-deposits',
    path: '/member/term-deposits',
  },
  {
    title: 'Business Shares',
    description:
      "Manage your stakes and dividends in the platform's business operations.",
    icon: <Building2 size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-shares',
    path: '/member/shares',
  },
  {
    title: 'Loan Control',
    description:
      'Your central hub for borrowing. Review detailed repayment schedules or start a new loan application.',
    icon: <FileText size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-loans',
    path: '/member/loans',
  },
  {
    title: 'Grantor Network',
    description:
      'Review and approve requests from other members asking for your financial backing.',
    icon: <ShieldCheck size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-grantor',
    path: '/member/grantor-requests',
  },
  {
    title: 'Direct Support',
    description:
      'Need assistance? Chat directly with our staff for instant support on any financial matter.',
    icon: <MessageSquare size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-chat',
    path: '/member/chat',
  },
  {
    title: 'Portal Settings',
    description:
      'Keep your security preferences and profile information updated in your account settings.',
    icon: <Settings size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-settings',
    path: '/member/settings',
  },
];

export const adminOnboardingSteps = [
  {
    title: 'Welcome to FinFlo',
    description:
      'Launch and scale your financial enterprise. Follow this guide to establish your operational command center.',
    icon: <HandMetal size={32} strokeWidth={2.5} />,
  },
  {
    title: 'Strategic Overview',
    description:
      'Monitor total recovery, active loans, and expected profits here on your Dashboard.',
    icon: <LayoutGrid size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-dashboard',
    path: '/dashboard',
  },
  {
    title: 'Infrastructure: Branches',
    description:
      'First, establish your presence. Click "Add Branch" to create your first physical or virtual location.',
    icon: <Building2 size={32} strokeWidth={2.5} />,
    elementId: 'add-branch-button',
    path: '/branches',
  },
  {
    title: 'Infrastructure: Team',
    description:
      'Scale your operations by adding staff members and defining granular access protocols.',
    icon: <Users size={32} strokeWidth={2.5} />,
    elementId: 'add-staff-button',
    path: '/team',
  },
  {
    title: 'Customer Onboarding',
    description:
      'Onboard individuals and corporate entities with digital signatures and OCR scanning.',
    icon: <Users size={32} strokeWidth={2.5} />,
    elementId: 'add-customer-button',
    path: '/customers',
  },
  {
    title: 'Member Ecosystem',
    description:
      'Track investor portals, profit rates, and distribution history with precision.',
    icon: <Landmark size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-members',
    path: '/members',
  },
  {
    title: 'Verification Queue',
    description:
      'Review self-registration credentials in the verification queue to grant secure portal access.',
    icon: <FileCheck2 size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-verification',
    path: '/verification-queue',
  },
  {
    title: 'Financial Product Design',
    description:
      'Create diverse loan products. Define custom interest rates and repayment cycles.',
    icon: <WalletMinimal size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-catalog',
    path: '/loan-products',
  },
  {
    title: 'The Transaction Ledger',
    description:
      'Every deposit and withdrawal is automatically recorded, providing a transparent audit trail.',
    icon: <ArrowRightLeft size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-transactions',
    path: '/transactions',
  },
  {
    title: 'Distribution Hub',
    description:
      'Allocate earnings to members based on investment shares with one click.',
    icon: <FileChartColumn size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-distributions',
    path: '/distributions',
  },
  {
    title: 'Enterprise Chat',
    description:
      'Connect with members via real-time encrypted chat supporting voice and image sharing.',
    icon: <MessageSquare size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-chat',
    path: '/chat',
  },
  {
    title: 'Intelligence & Compliance',
    description:
      'Export reports and monitor every action through permanent audit logs.',
    icon: <FileChartColumn size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-reports',
    path: '/reports',
  },
  {
    title: 'Platform Identity',
    description:
      'Set your business abbreviation and security codes for member registration.',
    icon: <Settings2 size={32} strokeWidth={2.5} />,
    elementId: 'sidebar-settings',
    path: '/settings',
  },
];
