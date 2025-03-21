import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity,
  TextInput
} from 'react-native';
import { COLORS } from '../src/theme';

interface TipCalculatorProps {
  billAmount: number;
  onTipCalculated: (tipAmount: number, totalWithTip: number) => void;
}

export function TipCalculator({ billAmount, onTipCalculated }: TipCalculatorProps) {
  const [tipPercentage, setTipPercentage] = useState<number>(15);
  const [customTip, setCustomTip] = useState<string>('');
  const [isCustomTip, setIsCustomTip] = useState<boolean>(false);

  const calculateTip = (percentage: number) => {
    setTipPercentage(percentage);
    setIsCustomTip(false);
    const tipAmount = billAmount * (percentage / 100);
    const totalWithTip = billAmount + tipAmount;
    onTipCalculated(tipAmount, totalWithTip);
  };

  const handleCustomTipChange = (value: string) => {
    setCustomTip(value);
    setIsCustomTip(true);
    const customPercentage = parseFloat(value) || 0;
    const tipAmount = billAmount * (customPercentage / 100);
    const totalWithTip = billAmount + tipAmount;
    onTipCalculated(tipAmount, totalWithTip);
  };

  const tipPresets = [10, 15, 18, 20, 25];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Calculadora de Propina</Text>
      
      <View style={styles.presetContainer}>
        {tipPresets.map(preset => (
          <TouchableOpacity
            key={preset}
            style={[
              styles.presetButton,
              tipPercentage === preset && !isCustomTip && styles.presetButtonActive
            ]}
            onPress={() => calculateTip(preset)}
          >
            <Text 
              style={[
                styles.presetText,
                tipPercentage === preset && !isCustomTip && styles.presetTextActive
              ]}
            >
              {preset}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.customTipContainer}>
        <Text style={styles.customTipLabel}>Propina Personalizada:</Text>
        <View style={styles.customTipInputContainer}>
          <TextInput
            style={styles.customTipInput}
            keyboardType="numeric"
            value={customTip}
            onChangeText={handleCustomTipChange}
            placeholder="Ej: 22"
          />
          <Text style={styles.percentSign}>%</Text>
        </View>
      </View>
      
      <View style={styles.resultContainer}>
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Subtotal:</Text>
          <Text style={styles.resultValue}>${billAmount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.resultRow}>
          <Text style={styles.resultLabel}>Propina ({isCustomTip ? customTip : tipPercentage}%):</Text>
          <Text style={styles.resultValue}>
            ${(billAmount * (isCustomTip ? (parseFloat(customTip) || 0) : tipPercentage) / 100).toFixed(2)}
          </Text>
        </View>
        
        <View style={[styles.resultRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>
            ${(billAmount + (billAmount * (isCustomTip ? (parseFloat(customTip) || 0) : tipPercentage) / 100)).toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 16,
  },
  presetContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetButton: {
    backgroundColor: COLORS.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: COLORS.primary,
  },
  presetText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  presetTextActive: {
    color: 'white',
  },
  customTipContainer: {
    marginBottom: 16,
  },
  customTipLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  customTipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  customTipInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  percentSign: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  resultContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 16,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  resultValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
});