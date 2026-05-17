import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  setTheme: () => null,
  primaryColor: '243.4 75.4% 58.6%',
  setPrimaryColor: () => null,
});

export const ThemeProvider = ({
  children,
  storageKey = 'theme',
  colorKey = 'primary-color',
  defaultTheme = 'system',
  defaultColor = '243.4 75.4% 58.6%', // Indigo
}) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(storageKey) || defaultTheme;
  });

  const [primaryColor, setPrimaryColor] = useState(() => {
    // Source-of-truth order:
    //   1. The logged-in user's persisted primaryColor (synced across devices)
    //   2. The previously cached value on this device
    //   3. The app default
    // The user atom isn't loaded yet at provider mount, so we read the
    // serialized copy in localStorage directly. The SocketContext listener
    // keeps this in sync if the color is changed elsewhere.
    try {
      const cached = JSON.parse(localStorage.getItem('user') || '{}');
      if (cached?.primaryColor) return cached.primaryColor;
    } catch {
      // fall through
    }
    return localStorage.getItem(colorKey) || defaultColor;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.style.setProperty('--primary', primaryColor);
    root.style.setProperty('--ring', primaryColor);

    // Calculate gradient colors based on primary color
    // primaryColor format: "H S% L%"
    try {
      const parts = primaryColor.split(' ');
      if (parts.length === 3) {
        const h = parseFloat(parts[0]);
        const s = parts[1];
        const l = parts[2];

        // Shift hue by +20 degrees for the 'to' part of the gradient
        const nextHue = (h + 20) % 360;
        const gradientTo = `${nextHue} ${s} ${l}`;

        root.style.setProperty('--btn-gradient-from', primaryColor);
        root.style.setProperty('--btn-gradient-to', gradientTo);
      }
    } catch (e) {
      console.error('Error setting dynamic gradient colors:', e);
    }
  }, [primaryColor]);

  const value = {
    theme,
    setTheme: (theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    primaryColor,
    setPrimaryColor: (color) => {
      localStorage.setItem(colorKey, color);
      setPrimaryColor(color);
    },
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
