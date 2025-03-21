import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../src/theme';
import { ThemeProvider } from '../components/ThemeProvider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Add any custom fonts here if needed
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.card,
          },
          headerTintColor: COLORS.primary,
          headerTitleStyle: {
            fontWeight: '600',
            color: COLORS.text,
          },
          headerShadowVisible: false,
          headerBackTitleStyle: {
            color: COLORS.primary,
          },
          contentStyle: {
            backgroundColor: COLORS.background,
          }
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />
        <Stack.Screen
          name="bill"
          options={{
            headerTitle: "Cuenta",
            headerBackTitle: "Regresar",
          }}
        />
        <Stack.Screen
          name="sales-history"
          options={{
            headerTitle: "Historial de Ventas",
            headerBackTitle: "Regresar",
          }}
        />
        <Stack.Screen
          name="weight-calculator"
          options={{
            headerTitle: "Calculadora de Barbacoa",
            headerBackTitle: "Regresar",
          }}
        />
        <Stack.Screen
          name="chart-detail"
          options={{
            headerTitle: "Detalles de Ventas",
            headerBackTitle: "Regresar",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}