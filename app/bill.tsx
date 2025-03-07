import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '../src/theme';
import { OrderItem } from '../types';
import { saveSale } from '../services/storage';
import { calculateChange, suggestPaymentAmount } from '../src/utils/changeCalculator';
import { sendOrderToWhatsApp } from '../services/whatsapp';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function BillScreen() {
  const params = useLocalSearchParams<{ items: string, total: string, table: string }>();
  const items: OrderItem[] = params.items ? JSON.parse(params.items) : [];
  const total = params.total ? parseFloat(params.total) : 0;
  const table = params.table ? parseInt(params.table) : 1;

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [change, setChange] = useState<any>(null);
  const suggestedPayments = suggestPaymentAmount(total);

  const handlePaymentChange = (amount: string) => {
    setPaymentAmount(amount);
    if (amount) {
      const payment = parseFloat(amount);
      const changeResult = calculateChange(total, payment);
      setChange(changeResult);
    } else {
      setChange(null);
    }
  };

  const handleSave = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await saveSale(table, items, total);
      router.back();
    } catch (error) {
      console.error('Error saving sale:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleShareWhatsApp = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await sendOrderToWhatsApp(table, items, total);
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>La Gota de Oro</Text>
          <Text style={styles.subtitle}>Mesa {table}</Text>
        </View>

        <View style={styles.itemsContainer}>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemPrice}>Precio: ${item.price.toFixed(2)}</Text>
                  <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Pago y Cambio</Text>
          
          <View style={styles.suggestedPayments}>
            <Text style={styles.suggestedLabel}>Pagos Sugeridos:</Text>
            <View style={styles.suggestedButtons}>
              {suggestedPayments.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={styles.suggestedButton}
                  onPress={() => handlePaymentChange(amount.toString())}
                >
                  <Text style={styles.suggestedButtonText}>${amount}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.paymentInput}>
            <Text style={styles.inputLabel}>Cantidad Pagada:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={paymentAmount}
              onChangeText={handlePaymentChange}
              placeholder="Ingrese el monto"
              placeholderTextColor="#999"
            />
          </View>

          {change && (
            <View style={styles.changeResult}>
              {!change.isValid ? (
                <Text style={styles.errorText}>{change.message}</Text>
              ) : (
                <>
                  <Text style={styles.changeTotal}>
                    Cambio Total: ${change.total.toFixed(2)}
                  </Text>
                  <View style={styles.changeBreakdown}>
                    <Text style={styles.breakdownTitle}>Desglose del Cambio:</Text>
                    {Object.entries(change.breakdown).map(([denomination, count]) => (
                      <Text key={denomination} style={styles.breakdownItem}>
                        ${denomination} x {count}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.whatsappButton]}
          onPress={handleShareWhatsApp}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.buttonText}>Compartir</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
        >
          <Ionicons name="save-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Guardar Venta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textLight,
    marginTop: 5,
  },
  itemsContainer: {
    padding: 20,
    backgroundColor: COLORS.card,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  itemDetails: {
    flexDirection: 'row',
    marginTop: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary, // Changed from default text color to primary blue
    marginRight: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.text,
    opacity: 0.7,
    marginLeft: 10,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.border,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 15,
  },
  suggestedPayments: {
    marginBottom: 20,
  },
  suggestedLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  suggestedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestedButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  suggestedButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  paymentInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  changeResult: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
  },
  changeTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: 10,
  },
  changeBreakdown: {
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  breakdownItem: {
    fontSize: 14,
    color: COLORS.text,
    marginVertical: 2,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  whatsappButton: {
    backgroundColor: '#25D366', // WhatsApp green
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});