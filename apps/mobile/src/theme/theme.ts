export const colors = {
  // Brand (Vibrant Indigo-Violet)
  primary: '#6d75ff', // HSL equivalent to web --primary
  primaryDark: '#4f5ae5',
  secondary: '#a78bfa',
  accent: '#f43f5e',

  // Gradients (use as LinearGradient colors)
  gradient: {
    primary: ['#6d75ff', '#a78bfa', '#f43f5e'] as string[],
    card: ['#1e293b', '#0f172a'] as string[],
    header: ['#0f172a', '#1e293b'] as string[],
  },

  // Semantic
  success: '#10b981', // Emerald 500
  danger: '#e11d48', // Rose 600
  warning: '#f59e0b', // Amber 500
  info: '#38bdf8', // Sky 400

  background: {
    screen: '#050a16', // Deep Slate/Navy
    dark: '#0a101f', // Slightly lighter slate
    card: '#0a101f',
    elevated: '#111827',
    input: '#111827',
    glass: 'rgba(15, 23, 42, 0.45)', // More translucent
  },

  text: {
    primary: '#f8fafc', // Slate 50
    secondary: '#cbd5e1', // Slate 300
    muted: '#64748b', // Slate 500
    accent: '#818cf8', // Indigo 400
  },

  border: '#1e293b',
  borderLight: '#334155',
  borderGlow: 'rgba(99,102,241,0.4)',
};

export const typography = {
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    lg: 17,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 38,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    black: '900' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

export const shadows = {
  card: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
};
