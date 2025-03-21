import React, { createContext, useContext, ReactNode } from 'react';
import { COLORS } from '../src/theme';

// Create a context for the theme
export const ThemeContext = createContext(COLORS);

// Custom hook for accessing the theme
export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
  theme?: typeof COLORS;
}

export function ThemeProvider({ children, theme = COLORS }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
