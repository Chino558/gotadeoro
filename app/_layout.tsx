import { Stack } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { COLORS } from '../src/theme';
import { ThemeProvider } from '../components/ThemeProvider';
// Import NetInfo
import NetInfo from '@react-native-community/netinfo';
// Import supabase
import { supabase } from '../services/supabase';
// backgroundSync module has been removed

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    // Add any custom fonts here if needed
  });

  // Handle network connectivity
  useEffect(() => {
    // Set up network change listener with proper session handling
    const netInfoUnsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('Network connected, verifying session...');
        
        // Add a small delay for network stabilization
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              console.log('Performing background session refresh...');
              await supabase.auth.refreshSession();
            }
          } catch (error) {
            console.error('Network reconnect error:', error);
          }
        }, 2000);
      }
    });
    
    // Cleanup on unmount
    return () => {
      netInfoUnsubscribe();
    };
  }, []);

  // Rest of your component remains the same
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
            headerTitle: "",
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