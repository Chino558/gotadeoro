import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Pressable, 
  SafeAreaView,
  StatusBar as ExpoStatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../src/theme';

export default function WeightCalculatorScreen() {
  const [grams, setGrams] = useState<string>('');
  const [calculatedPrice, setCalculatedPrice] = useState<number>(0);
  const PRICE_PER_KILO = 650;

  const calculatePrice = (weight: number) => {
    const price = (weight / 1000) * PRICE_PER_KILO;
    setCalculatedPrice(price);
    setGrams(weight.toString());
  };

  const handleCustomInput = (text: string) => {
    setGrams(text);
    if (text) {
      const weight = parseFloat(text);
      if (!isNaN(weight)) {
        const price = (weight / 1000) * PRICE_PER_KILO;
        setCalculatedPrice(price);
      }
    } else {
      setCalculatedPrice(0);
    }
  };

  const renderWeightCard = (weight: number, label: string) => (
    <Pressable
      style={styles.weightCard}
      onPress={() => calculatePrice(weight)}
    >
      <Text style={styles.weightLabel}>{label}</Text>
      <Text style={styles.weightPrice}>${((weight / 1000) * PRICE_PER_KILO).toFixed(2)}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="dark" />
      
      <View style={styles.header}>
        <Text style={styles.title}>Calculadora de Barbacoa</Text>
        <Text style={styles.subtitle}>Precio por kilo: ${PRICE_PER_KILO}</Text>
      </View>
      
      <View style={styles.cardsContainer}>
        {renderWeightCard(250, '1/4 Kilo')}
        {renderWeightCard(500, '1/2 Kilo')}
        {renderWeightCard(750, '3/4 Kilo')}
        {renderWeightCard(1000, '1 Kilo')}
      </View>
      
      <View style={styles.customContainer}>
        <Text style={styles.customLabel}>Cantidad personalizada (gramos):</Text>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={grams}
          onChangeText={handleCustomInput}
          placeholder="Ingrese gramos"
        />
      </View>
      
      <View style={styles.resultContainer}>
        <Text style={styles.resultLabel}>Precio Total:</Text>
        <Text style={styles.resultPrice}>${calculatedPrice.toFixed(2)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  weightCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weightLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  weightPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customContainer: {
    padding: 16,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  customLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  resultContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  resultPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
});