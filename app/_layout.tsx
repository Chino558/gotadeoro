import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index"
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="bill"
        options={{
          headerTitle: "Cuenta",
          headerBackTitle: "Regresar",
          // Optional: Add more styling if needed
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#FF6B6B', // Matches COLORS.primary
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      />
    </Stack>
  );
}