import { useTheme } from '../contexts/ThemeContext';
import { CSSProperties } from 'react';

export const useThemedStyles = () => {
  const { currentColors } = useTheme();

  const getButtonStyles = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary'): CSSProperties => {
    const styles: Record<string, CSSProperties> = {
      primary: {
        backgroundColor: currentColors.buttonPrimary,
        color: 'white',
        transition: 'all 0.2s',
      },
      secondary: {
        backgroundColor: currentColors.buttonSecondary,
        color: currentColors.text,
        transition: 'all 0.2s',
      },
      success: {
        backgroundColor: currentColors.success,
        color: 'white',
        transition: 'all 0.2s',
      },
      warning: {
        backgroundColor: currentColors.warning,
        color: 'white',
        transition: 'all 0.2s',
      },
      error: {
        backgroundColor: currentColors.error,
        color: 'white',
        transition: 'all 0.2s',
      },
    };

    return styles[variant];
  };

  const getButtonHoverStyles = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' = 'primary'): CSSProperties => {
    const styles: Record<string, CSSProperties> = {
      primary: {
        backgroundColor: currentColors.buttonPrimaryHover,
      },
      secondary: {
        backgroundColor: currentColors.buttonSecondaryHover,
      },
      success: {
        backgroundColor: currentColors.success,
        filter: 'brightness(1.1)',
      },
      warning: {
        backgroundColor: currentColors.warning,
        filter: 'brightness(1.1)',
      },
      error: {
        backgroundColor: currentColors.error,
        filter: 'brightness(1.1)',
      },
    };

    return styles[variant];
  };

  const getBadgeStyles = (variant: 'success' | 'warning' | 'error' | 'info' = 'info'): CSSProperties => {
    const styles: Record<string, CSSProperties> = {
      success: {
        backgroundColor: currentColors.badgeSuccess,
        color: currentColors.success,
      },
      warning: {
        backgroundColor: currentColors.badgeWarning,
        color: currentColors.warning,
      },
      error: {
        backgroundColor: currentColors.badgeError,
        color: currentColors.error,
      },
      info: {
        backgroundColor: currentColors.badgeInfo,
        color: currentColors.info,
      },
    };

    return styles[variant];
  };

  const getCardStyles = (): CSSProperties => {
    return {
      backgroundColor: currentColors.cardBg,
      borderColor: currentColors.cardBorder,
    };
  };

  const getLinkStyles = (isActive: boolean = false): CSSProperties => {
    return {
      color: isActive ? currentColors.primary : currentColors.textSecondary,
      transition: 'color 0.2s',
    };
  };

  const getLinkHoverStyles = (): CSSProperties => {
    return {
      color: currentColors.primaryHover,
    };
  };

  return {
    currentColors,
    getButtonStyles,
    getButtonHoverStyles,
    getBadgeStyles,
    getCardStyles,
    getLinkStyles,
    getLinkHoverStyles,
  };
};
