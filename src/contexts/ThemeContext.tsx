import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getThemeByRole, ThemeConfig, ThemeColors, UserRole } from '../config/themes';

interface ThemeContextType {
  theme: ThemeConfig;
  currentColors: ThemeColors;
  darkMode: boolean;
  toggleDarkMode: () => void;
  role: UserRole;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { userProfile, hasRole } = useAuth();
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const getUserRole = (): UserRole => {
    const profileRole = userProfile?.role as UserRole;
    if (profileRole && ['patient', 'provider', 'pharmacy', 'admin', 'clinic'].includes(profileRole)) {
      return profileRole;
    }
    if (hasRole('admin')) return 'admin';
    if (hasRole('provider')) return 'provider';
    if (hasRole('pharmacy')) return 'pharmacy';
    return 'patient';
  };

  const role = getUserRole();
  const theme = getThemeByRole(role);
  const currentColors = darkMode ? theme.colors.dark : theme.colors.light;

  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => {
      const newMode = !prev;
      localStorage.setItem('darkMode', JSON.stringify(newMode));
      return newMode;
    });
  };

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentColors.primary);
    root.style.setProperty('--color-primary-hover', currentColors.primaryHover);
    root.style.setProperty('--color-primary-light', currentColors.primaryLight);
    root.style.setProperty('--color-primary-dark', currentColors.primaryDark);
    root.style.setProperty('--color-secondary', currentColors.secondary);
    root.style.setProperty('--color-secondary-hover', currentColors.secondaryHover);
    root.style.setProperty('--color-accent', currentColors.accent);
    root.style.setProperty('--color-accent-hover', currentColors.accentHover);
    root.style.setProperty('--color-navbar-bg', currentColors.navbarBg);
    root.style.setProperty('--color-navbar-text', currentColors.navbarText);
    root.style.setProperty('--color-sidebar-bg', currentColors.sidebarBg);
    root.style.setProperty('--color-sidebar-active-bg', currentColors.sidebarActiveBg);
    root.style.setProperty('--color-sidebar-active-border', currentColors.sidebarActiveBorder);
    root.style.setProperty('--color-sidebar-hover', currentColors.sidebarHover);
    root.style.setProperty('--color-button-primary', currentColors.buttonPrimary);
    root.style.setProperty('--color-button-primary-hover', currentColors.buttonPrimaryHover);
  }, [darkMode, currentColors]);

  return (
    <ThemeContext.Provider value={{ theme, currentColors, darkMode, toggleDarkMode, role }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
