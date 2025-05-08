/**
 * Never Forget Theme System
 * A comprehensive theme system for consistent design across the application
 */

import { Platform } from 'react-native';

// Color System
export const colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  // Secondary accent colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03',
  },
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a',
  },
  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },
  // Core colors
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

// Spacing System (in pixels)
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 56,
  // Screen-level spacing
  screenPadding: 16,
  screenWidth: '100%',
};

// Typography System
export const typography = {
  fontFamily: {
    primary: Platform.OS === 'ios' ? 'System' : 'Roboto',
    mono: 'SpaceMono-Regular',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
  },
  fontWeight: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Border Radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// Shadows
export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  xl: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 12,
  },
};

// Animation durations
export const animation = {
  fast: 200,
  normal: 300,
  slow: 500,
};

// Z-index system
export const zIndex = {
  base: 0,
  above: 1,
  dropdown: 10,
  modal: 100,
  overlay: 1000,
};

// Layout constants
export const layout = {
  maxWidth: 480, // Max content width for tablets/desktops
  bottomTabHeight: 70,
  headerHeight: 60,
};

// Theme export (light mode is default)
export const lightTheme = {
  background: colors.white,
  surface: colors.neutral[50],
  surfaceElevated: colors.white,
  text: colors.secondary[900],
  textSecondary: colors.secondary[600],
  textDisabled: colors.secondary[400],
  border: colors.secondary[200],
  divider: colors.secondary[200],
  icon: colors.secondary[500],
  iconActive: colors.primary[600],
};

// Dark theme variant
export const darkTheme = {
  background: colors.secondary[900],
  surface: colors.secondary[800],
  surfaceElevated: colors.secondary[700],
  text: colors.neutral[100],
  textSecondary: colors.neutral[300],
  textDisabled: colors.neutral[500],
  border: colors.secondary[700],
  divider: colors.secondary[700],
  icon: colors.neutral[400],
  iconActive: colors.primary[400],
};

// Export the theme object
export default {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  animation,
  zIndex,
  layout,
  lightTheme,
  darkTheme,
}; 