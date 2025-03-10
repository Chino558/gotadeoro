import { Stack } from 'expo-router';
import { useCallback } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../src/theme';

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
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.primaryLight,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: '600',
          color: COLORS.primary,
        },
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
    </Stack>
  );
}
