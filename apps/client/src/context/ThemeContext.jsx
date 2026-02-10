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
