import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setAppAuthenticated: (isAuth: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('nuris-appearance') || localStorage.getItem('simka_theme') || localStorage.getItem('simka_theme_mode');
      if (saved === 'dark') {
        return 'dark';
      }
      if (saved === 'light') {
        return 'light';
      }
    } catch (e) {
      // fallback
    }
    return 'light'; // Match the default light Mutabaah interface; keep saved user preferences.
  });

  // Default is 'light'. If user chooses 'dark', it applies to Login and the app.
  const resolvedTheme: 'light' | 'dark' = themeMode === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [resolvedTheme]);

  useEffect(() => {
    const sync = (event: Event) => setThemeModeState((event as CustomEvent).detail === 'dark' ? 'dark' : 'light');
    window.addEventListener('nuris-theme', sync);
    return () => window.removeEventListener('nuris-theme', sync);
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    const appearance = (window as any).NurisAppearance;
    if (appearance) { appearance.change(mode === 'dark' ? 'dark' : 'light', document.activeElement); return; }

    const nextMode: ThemeMode = mode === 'dark' ? 'dark' : 'light';
    setThemeModeState(nextMode);
    try {
      localStorage.setItem('simka_theme', nextMode);
      localStorage.setItem('simka_theme_mode', nextMode);
    } catch (e) {
      // ignore
    }
  };

  const toggleTheme = () => {
    const nextMode: ThemeMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
  };

  const setAppAuthenticated = (isAuth: boolean) => {
    setIsAuthenticated(isAuth);
  };

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        resolvedTheme,
        setThemeMode,
        toggleTheme,
        setAppAuthenticated,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};


