import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { COLORS } from '../src/theme';
import * as Haptics from 'expo-haptics';

const PRICE_PER_KILO = 650;

export default function WeightCalculatorScreen() {
  const [grams, setGrams] = useState<string>('');
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

  const calculatePrice = useCallback((weight: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const price = (weight / 1000) * PRICE_PER_KILO;
    setCalculatedPrice(price);
    setGrams(weight.toString());
  }, []);

  const handleCustomInput = useCallback((text: string) => {
    const numericText = text.replace(/[^0-9]/g, '');
    setGrams(numericText);
    if (numericText) {
      const weight = parseFloat(numericText);
      if (!isNaN(weight)) {
        const price = (weight / 1000) * PRICE_PER_KILO;
        setCalculatedPrice(price);
      } else {
         setCalculatedPrice(0);
      }
    } else {
      setCalculatedPrice(0);
    }
  }, []);

  // Render card with zoomIn animation, useNativeDriver explicitly set to false
  const renderWeightCard = (weight: number, label: string, index: number) => (
    <Animatable.View
        animation="zoomIn"
        duration={400}
        delay={index * 100}
        style={styles.weightCardContainer}
        useNativeDriver={false} // <-- Disable native driver for zoomIn
    >
        <Pressable
            style={({ pressed }) => [
                styles.weightCard,
                pressed && styles.weightCardPressed
            ]}
            onPress={() => calculatePrice(weight)}
        >
            <Text style={styles.weightLabel}>{label}</Text>
            <Text style={styles.weightPrice}>${((weight / 1000) * PRICE_PER_KILO).toFixed(2)}</Text>
        </Pressable>
    </Animatable.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
            headerTitle: "Calculadora de Barbacoa",
            headerStyle: { backgroundColor: COLORS.background },
            headerTitleStyle: styles.headerTitleStyle,
            headerShadowVisible: false,
        }}
      />
      <ExpoStatusBar style="dark" backgroundColor={COLORS.background} />

        <ScrollView contentContainerStyle={styles.scrollContentContainer}>

            <View style={styles.priceInfoHeader}>
                <Text style={styles.priceInfoText}>Precio por Kilo: <Text style={styles.priceValue}>${PRICE_PER_KILO}</Text></Text>
            </View>

            {/* --- Removed Animatable wrapper --- */}
            <Text style={styles.sectionTitle}>Cantidades Comunes</Text>
            <View style={styles.cardsContainer}>
                {renderWeightCard(250, '1/4 Kilo', 0)}
                {renderWeightCard(500, '1/2 Kilo', 1)}
                {renderWeightCard(750, '3/4 Kilo', 2)}
                {renderWeightCard(1000, '1 Kilo', 3)}
            </View>
            {/* --- End Removed Wrapper --- */}


            {/* --- Removed Animatable wrapper --- */}
            <View style={styles.customContainer}>
                <Text style={styles.customLabel}>Cantidad Personalizada (gramos)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={grams}
                    onChangeText={handleCustomInput}
                    placeholder="Ej: 350"
                    placeholderTextColor={COLORS.textSubtle}
                />
            </View>
             {/* --- End Removed Wrapper --- */}


            {/* Result Section - Use simple fadeIn */}
            {(grams !== '' || calculatedPrice > 0) && (
                <Animatable.View
                    animation="fadeIn" // <-- Changed to simple fadeIn
                    duration={400}
                    // delay={300} // Delay might not be needed for fadeIn
                    style={styles.resultContainer}
                    useNativeDriver={true} // FadeIn is usually safe with native driver
                >
                    <Text style={styles.resultLabel}>Precio Total:</Text>
                    <Text style={styles.resultPrice}>${calculatedPrice.toFixed(2)}</Text>
                </Animatable.View>
            )}

        </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles --- (Keep styles as they were defined previously)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContentContainer: {
    paddingBottom: 30,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  headerTitleStyle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: COLORS.text,
  },
  priceInfoHeader: {
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priceInfoText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.primaryDark,
  },
  priceValue: {
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  weightCardContainer: {
     width: '48%',
     marginBottom: 16,
  },
  weightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minHeight: 100,
    justifyContent: 'center',
  },
  weightCardPressed: {
     backgroundColor: COLORS.cardLight,
     transform: [{ scale: 0.98 }],
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  weightPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customContainer: {
    padding: 16,
    backgroundColor: COLORS.card,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  customLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textSubtle,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  resultContainer: {
    marginVertical: 20,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: 'white',
  },
  resultPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
});