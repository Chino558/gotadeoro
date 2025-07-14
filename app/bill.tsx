import React, { useState, useEffect } from 'react'; // Added useEffect if needed later
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform, // Added Platform
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '../src/theme';
import { OrderItem } from '../types';
import { saveSale } from '../services/storage';
import { calculateChange, suggestPaymentAmount } from '../src/utils/changeCalculator';
import { sendOrderToWhatsApp } from '../services/whatsapp';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable'; // Added Animatable
import { StatusBar } from 'expo-status-bar'; // Added StatusBar

export default function BillScreen() {
  const params = useLocalSearchParams<{
    items: string,
    total: string,
    tableNumber: string,
    viewOnly: string,
    timestamp: string
  }>();

  const items: OrderItem[] = params.items ? JSON.parse(decodeURIComponent(params.items)) : [];
  const total = params.total ? parseFloat(params.total) : 0;
  const tableNumber = params.tableNumber ? parseInt(params.tableNumber) : 1;
  const viewOnly = params.viewOnly === 'true';
  const timestamp = params.timestamp ? new Date(parseInt(params.timestamp)) : new Date();

  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [change, setChange] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [supabase, setSupabase] = useState<any>(null); // State to hold Supabase client
  const suggestedPayments = suggestPaymentAmount(total);

  useEffect(() => {
    if (Platform.OS !== 'web') {
      // Dynamically import supabase only when not in a web environment
      import('../services/supabase')
        .then((module) => {
          setSupabase(module);
        })
        .catch((error) => {
          console.error('Error importing supabase:', error);
        });
    }
  }, []);

  const handlePaymentChange = (amount: string) => {
    // Keep original logic, ensure input value updates
    const numericAmount = amount.replace(/[^0-9.]/g, ''); // Allow only numbers and decimal
    setPaymentAmount(numericAmount);
    if (numericAmount) {
      const payment = parseFloat(numericAmount);
      if (!isNaN(payment)) { // Check if parsing was successful
         const changeResult = calculateChange(total, payment);
         setChange(changeResult);
      } else {
         setChange(null); // Clear change if input is invalid
      }
    } else {
      setChange(null);
    }
  };

  const handleSave = async () => {
    // Keep original logic
    try {
      console.log('Save button pressed');
      setSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('Saving sale:', { tableNumber, items: items.length, total });
      await saveSale(tableNumber, items, total);
      console.log('Sale saved successfully');
      try {
        const { saveTableName } = await import('../services/tableNames');
        await saveTableName(tableNumber, `Mesa ${tableNumber}`);
        console.log('Table name reset to default');
      } catch (tableError) {
        console.error('Error resetting table name:', tableError);
      }
      router.replace("/");
    } catch (error) {
      console.error('Error saving sale:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "No se pudo guardar la venta. Intente de nuevo.", [{ text: "OK" }]);
    } finally {
      setSaving(false);
    }
  };

  const handleShareWhatsApp = async () => {
    // Keep original logic
    try {
      setSharing(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await sendOrderToWhatsApp(tableNumber, items, total);
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "No se pudo compartir. Intente de nuevo.", [{ text: "OK" }]);
    } finally {
      setSharing(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <View style={styles.container}>
      {/* Use dark status bar icons on light background */}
      <StatusBar style="dark" backgroundColor={COLORS.background} />

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <Animatable.View animation="fadeInDown" duration={400} style={styles.header}>
          <Text style={styles.title}>La Gota de Oro</Text>
          {/* Keep subtitle styling, adjust color if needed */}
          <Text style={styles.subtitle}>Mesa {tableNumber}</Text>
          {viewOnly && (
            <Text style={styles.dateLabel}>
              {formatDate(timestamp)}
            </Text>
          )}
        </Animatable.View>

        {/* Items Section */}
        <Animatable.View animation="fadeInUp" duration={500} delay={100} style={styles.itemsContainer}>
          <Text style={styles.sectionHeading}>
            {viewOnly ? 'Detalle de Venta' : 'Artículos Ordenados'}
          </Text>
          {items.map((item, index) => (
            // --- ACTION REQUIRED ---
            // Check for text rendering errors within this mapped view if warnings persist
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <View style={styles.itemDetails}>
                  <View style={styles.priceBadge}>
                    <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                  </View>
                  <View style={styles.quantityBadge}>
                     {/* Ensure quantity is in Text */}
                    <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                  </View>
                </View>
              </View>
              {/* Ensure total is in Text */}
              <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </Animatable.View>

        {/* Total Section */}
        <Animatable.View animation="fadeInUp" duration={500} delay={200} style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total a Pagar:</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </Animatable.View>

        {/* Payment Section (Conditional) */}
        {!viewOnly && (
          <Animatable.View animation="fadeInUp" duration={500} delay={300} style={styles.paymentSection}>
            <Text style={styles.sectionHeading}>Pago y Cambio</Text>

            {/* Suggested Payments */}
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

            {/* Payment Input */}
            <View style={styles.paymentInput}>
              <Text style={styles.inputLabel}>Cantidad Pagada:</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={paymentAmount}
                onChangeText={handlePaymentChange}
                placeholder="Ingrese el monto"
                placeholderTextColor={COLORS.textSubtle} // Use subtle color for placeholder
              />
            </View>

            {/* Change Result */}
            {change && (
              <Animatable.View animation="fadeIn" duration={300} style={styles.changeResult}>
                {!change.isValid ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="warning-outline" size={20} color={COLORS.error} />
                    {/* Ensure message is in Text */}
                    <Text style={styles.errorText}>{change.message}</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.changeHeader}>
                      <Ionicons name="cash-outline" size={22} color={COLORS.successDark} style={styles.changeIcon} />
                      <Text style={styles.changeTotal}>
                        Cambio: ${change.total.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.changeBreakdown}>
                      <Text style={styles.breakdownTitle}>Desglose:</Text>
                      {Object.entries(change.breakdown).map(([denomination, count]) => (
                         // Ensure count is in Text
                        <Text key={denomination} style={styles.breakdownItem}>
                          ${denomination} x <Text style={styles.breakdownCount}>{count}</Text>
                        </Text>
                      ))}
                    </View>
                  </>
                )}
              </Animatable.View>
            )}
          </Animatable.View>
        )}
      </ScrollView>

      {/* Button Container */}
      <View style={styles.buttonContainer}>
        {viewOnly ? (
          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={handleGoBack}
          >
            <Ionicons name="arrow-back-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Regresar</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.whatsappButton, sharing && styles.buttonDisabled]}
              onPress={handleShareWhatsApp}
              disabled={sharing || items.length === 0} // Disable if no items
            >
              {sharing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-whatsapp" size={22} color="#fff" />
                  <Text style={styles.buttonText}>Compartir</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving || items.length === 0} // Disable if no items
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={22} color="#fff" />
                  <Text style={styles.buttonText}>Guardar Venta</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// --- Styles --- (Applied theme and card styling)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Light background
  },
  scrollContainer: {
    flex: 1,
  },
  // Updated Header Style
  header: {
    paddingTop: 20, // More padding on top
    paddingBottom: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: COLORS.background, // Match container background
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
  },
  title: {
    fontSize: 24, // Slightly smaller title
    fontWeight: 'bold',
    color: COLORS.primary, // Keep primary color
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 16, // Slightly smaller
    color: COLORS.textSubtle, // More subtle color for table number
    // Removed background badge for cleaner look, adjust if preferred
    // backgroundColor: COLORS.primaryLight,
    // paddingHorizontal: 12,
    // paddingVertical: 4,
    // borderRadius: 14,
    marginBottom: 4,
  },
  dateLabel: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 6,
  },
  // Card Style Applied
  itemsContainer: {
    padding: 16, // Standard padding
    backgroundColor: COLORS.card,
    marginHorizontal: 16, // Consistent margin
    marginTop: 16, // Add top margin
    borderRadius: 12, // Consistent radius
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, // Softer shadow
    shadowRadius: 4,
    elevation: 2, // Softer elevation
    borderWidth: 1,
    borderColor: COLORS.borderLight, // Lighter border
  },
  sectionHeading: {
    fontSize: 17, // Slightly adjusted
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Adjust padding
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter separator
  },
  itemInfo: {
    flex: 1,
    marginRight: 10, // Space before total
  },
  itemName: {
    fontSize: 15, // Adjusted size
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: 6,
  },
  itemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Updated Badge Styles
  priceBadge: {
    backgroundColor: COLORS.primaryLight, // Keep light primary
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  itemPrice: {
    fontSize: 13, // Adjusted size
    color: COLORS.primaryDark, // Darker primary text
    fontWeight: '600',
  },
  quantityBadge: {
    backgroundColor: COLORS.cardLight, // Use very light grey
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  itemQuantity: {
    fontSize: 13, // Adjusted size
    color: COLORS.textSubtle, // Subtle text color
    fontWeight: '500',
  },
  itemTotal: {
    fontSize: 15, // Adjusted size
    fontWeight: '600',
    color: COLORS.text,
  },
  // Card Style Applied
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16, // Add top margin
    paddingVertical: 16, // Adjust padding
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  totalLabel: {
    fontSize: 17, // Adjusted size
    fontWeight: '600', // Bolder label
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 20, // Adjusted size
    fontWeight: 'bold',
    color: COLORS.primaryDark, // Darker primary for better contrast
    backgroundColor: COLORS.primaryLight, // Keep light background
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10, // Slightly adjusted radius
  },
  // Card Style Applied
  paymentSection: {
    padding: 16, // Standard padding
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    marginTop: 16, // Add top margin
    marginBottom: 16, // Add bottom margin before buttons
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  suggestedPayments: {
    marginBottom: 20,
  },
  suggestedLabel: {
    fontSize: 14, // Adjusted size
    color: COLORS.textLight,
    marginBottom: 10,
    fontWeight: '500',
  },
  suggestedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8, // Slightly smaller gap
  },
  // Updated Suggested Button Style
  suggestedButton: {
    backgroundColor: COLORS.cardLight, // Very light background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderLight, // Light border
  },
  suggestedButtonText: {
    color: COLORS.textSubtle, // Use subtle text color
    fontWeight: '600',
    fontSize: 14, // Adjusted size
  },
  paymentInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14, // Adjusted size
    color: COLORS.textLight,
    marginBottom: 8, // Adjust spacing
    fontWeight: '500',
  },
  // Updated Input Style
  input: {
    borderWidth: 1,
    borderColor: COLORS.border, // Keep standard border
    backgroundColor: COLORS.background, // Use main background for input field
    borderRadius: 10, // Slightly adjusted radius
    padding: 12, // Adjust padding
    fontSize: 16,
    color: COLORS.text,
  },
  // Updated Change Result Style
  changeResult: {
    backgroundColor: COLORS.background, // Use main background
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderLight, // Light border
    marginTop: 10, // Add top margin
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Add some padding
  },
  errorText: {
    color: COLORS.error,
    fontSize: 15, // Slightly smaller error text
    marginLeft: 8,
    flex: 1,
  },
  changeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10, // Adjust spacing
  },
  changeIcon: {
    marginRight: 8,
  },
  changeTotal: {
    fontSize: 17, // Adjusted size
    fontWeight: '600',
    color: COLORS.successDark, // Use darker success color
  },
  changeBreakdown: {
    marginTop: 8, // Adjust spacing
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight, // Lighter separator
    paddingTop: 8,
  },
  breakdownTitle: {
    fontSize: 14, // Adjusted size
    fontWeight: '500',
    marginBottom: 6,
    color: COLORS.textLight,
  },
  breakdownItem: {
    fontSize: 14,
    color: COLORS.text,
    marginVertical: 2, // Adjust spacing
    fontWeight: '500',
  },
  breakdownCount: { // Style for the count number itself
     fontWeight: 'bold',
     color: COLORS.primaryDark,
  },
  // Updated Button Container Style
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: COLORS.background, // Match background
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight, // Light border
  },
  // Updated Button Style (Subtle shadow)
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14, // Adjust padding
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Softer shadow
    shadowRadius: 2,
    elevation: 3, // Slightly reduced elevation
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
  },
  backButton: {
    backgroundColor: COLORS.textSubtle, // Use subtle color for back
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
