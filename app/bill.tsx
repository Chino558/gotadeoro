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
  const params = useLocalSearchParams<{ 
    items: string, 
    total: string, 
    table: string,
    viewOnly: string, // Add viewOnly parameter
    timestamp: string 
  }>();
  
  // Parse parameters
  const items: OrderItem[] = params.items ? JSON.parse(decodeURIComponent(params.items)) : [];
  const total = params.total ? parseFloat(params.total) : 0;
  const table = params.table ? parseInt(params.table) : 1;
  const viewOnly = params.viewOnly === 'true'; // Check if we're in view-only mode
  const timestamp = params.timestamp ? new Date(parseInt(params.timestamp)) : new Date();

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
      
      // Save the sale
      await saveSale(table, items, total);
      
      // Reset the table name to default
      const { saveTableName } = await import('../services/tableNames');
      await saveTableName(table, `Mesa ${table}`);
      
      // Navigate to home screen instead of going back
      router.replace("/");
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

  const handleGoBack = () => {
    router.back();
  };

  // Format the date if we're in view-only mode
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>La Gota de Oro</Text>
          <Text style={styles.subtitle}>Mesa {table}</Text>
          {viewOnly && (
            <Text style={styles.dateLabel}>
              {formatDate(timestamp)}
            </Text>
          )}
        </View>

        <View style={styles.itemsContainer}>
          <Text style={styles.sectionHeading}>
            {viewOnly ? 'Detalle de Venta' : 'Artículos Ordenados'}
          </Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                  <View style={styles.priceBadge}>
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.quantityBadge}>
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total a Pagar:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </View>

        {/* Only show payment section if not in view-only mode */}
        {!viewOnly && (
          <View style={styles.paymentSection}>
            <Text style={styles.sectionHeading}>Pago y Cambio</Text>

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
                placeholderTextColor={COLORS.textLight}
              />
            </View>

            {change && (
              <View style={styles.changeResult}>
                {!change.isValid ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning" size={24} color={COLORS.error} />
                    <Text style={styles.errorText}>{change.message}</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.changeHeader}>
                      <Ionicons name="cash-outline" size={24} color={COLORS.success} style={styles.changeIcon} />
                      <Text style={styles.changeTotal}>
                        Cambio Total: ${change.total.toFixed(2)}
                      </Text>
                    </View>
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
        )}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {viewOnly ? (
          // View-only mode buttons
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
            <Text style={styles.buttonText}>Regresar</Text>
          </TouchableOpacity>
        ) : (
          // Regular mode buttons
          <>
            <TouchableOpacity
              style={[styles.button, styles.whatsappButton]}
              onPress={handleShareWhatsApp}
            >
              <Ionicons name="logo-whatsapp" size={22} color="#fff" />
              <Text style={styles.buttonText}>Compartir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Ionicons name="save-outline" size={22} color="#fff" />
              <Text style={styles.buttonText}>Guardar Venta</Text>
            </TouchableOpacity>
          </>
        )}
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
    padding: 24,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.textLight,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 6,
  },
  dateLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  itemsContainer: {
    padding: 20,
    backgroundColor: COLORS.card,
    margin: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
    marginBottom: 6,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  quantityBadge: {
    backgroundColor: COLORS.subtle,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  paymentSection: {
    padding: 20,
    backgroundColor: COLORS.card,
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestedPayments: {
    marginBottom: 20,
  },
  suggestedLabel: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 10,
    fontWeight: '500',
  },
  suggestedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestedButton: {
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
  },
  paymentInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: COLORS.textLight,
    marginBottom: 10,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  changeResult: {
    backgroundColor: COLORS.primaryLight,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    marginLeft: 8,
    flex: 1,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  changeIcon: {
    marginRight: 8,
  },
  changeTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  changeBreakdown: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  breakdownTitle: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    color: COLORS.textLight,
  },
  breakdownItem: {
    fontSize: 14,
    color: COLORS.text,
    marginVertical: 3,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
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
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  whatsappButton: {
    backgroundColor: '#25D366', // WhatsApp green
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  backButton: {
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});