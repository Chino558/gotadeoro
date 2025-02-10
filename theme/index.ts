import { DarkTheme, DefaultTheme } from '@react-navigation/native';

export const COLORS = {
  primary: '#FF6B6B',
  secondary: '#4ECDC4',
  background: '#FFFFFF',
  backgroundDark: '#121212',
  text: '#2D3436',
  textDark: '#FFFFFF',
  border: '#E0E0E0',
  borderDark: '#333333',
  success: '#00B894',
  error: '#FF7675',
};

export const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.background,
    text: COLORS.text,
    border: COLORS.border,
  },
};

export const darkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: COLORS.primary,
    background: COLORS.backgroundDark,
    text: COLORS.textDark,
    border: COLORS.borderDark,
  },
};