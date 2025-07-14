import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform, // Added Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar'; // Added StatusBar
import * as Animatable from 'react-native-animatable'; // Added Animatable
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface CheckoutScreenProps {
  items: OrderItem[];
  tableNumber: number;
  onClose: () => void; // Assuming this is for closing a modal or navigating back
}

export function CheckoutScreen({ items, tableNumber, onClose }: CheckoutScreenProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // --- Empty State Rendering ---
  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.emptyContainer]}>
         {/* Use dark status bar icons on light background */}
        <StatusBar style="dark" backgroundColor={COLORS.background} />
        <View style={styles.header}>
          <Text style={styles.title}>Mesa {tableNumber}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close-outline" size={28} color={COLORS.textSubtle} />
          </Pressable>
        </View>
        <View style={styles.emptyStateContent}>
          <Animatable.View animation="bounceIn" duration={600}>
            <Ionicons name="receipt-outline" size={60} color={COLORS.subtle} />
          </Animatable.View>
          <Animatable.Text animation="fadeInUp" delay={200} style={styles.emptyText}>
            No hay artículos en la orden
          </Animatable.Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main Receipt Rendering ---
  return (
    <SafeAreaView style={styles.container}>
       {/* Use dark status bar icons on light background */}
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cuenta - Mesa {tableNumber}</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close-outline" size={28} color={COLORS.textSubtle} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        >
        {/* Receipt Header Section */}
        <Animatable.View animation="fadeInDown" duration={400} style={styles.receiptHeader}>
          <Text style={styles.restaurantName}>La Gota de Oro</Text>
          {/* <Text style={styles.receiptTitle}>Detalle de Cuenta</Text> */}
        </Animatable.View>

        {/* Items List Section */}
        <Animatable.View animation="fadeInUp" duration={500} delay={100} style={styles.itemsSection}>
          {items.map((item, index) => (
            // --- ACTION REQUIRED ---
            // Check for text rendering errors within this mapped view if warnings persist
            <Animatable.View
                key={item.id}
                animation="fadeInUp"
                duration={400}
                delay={index * 50} // Stagger item animation
                useNativeDriver={Platform.OS !== 'web'}
            >
                <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {/* Ensure quantity and price are in Text */}
                    <Text style={styles.itemQuantity}>
                        {item.quantity} <Text style={styles.itemQuantityX}>×</Text> ${item.price.toFixed(2)}
                    </Text>
                    </View>
                    {/* Ensure item total is in Text */}
                    <Text style={styles.itemTotal}>${(item.price * item.quantity).toFixed(2)}</Text>
                </View>
             </Animatable.View>
          ))}
        </Animatable.View>

        {/* Total Section */}
        <Animatable.View animation="fadeInUp" duration={500} delay={200} style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
        </Animatable.View>

        {/* Optional Footer */}
         <Animatable.View animation="fadeInUp" duration={500} delay={300} style={styles.footer}>
             <Text style={styles.footerText}>¡Gracias por su preferencia!</Text>
         </Animatable.View>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles --- (Applied theme and refined appearance)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Use light theme background
  },
  emptyContainer: { // Specific styles when container is empty
     justifyContent: 'flex-start', // Align header top
  },
  // Updated Header Style
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15, // Adjusted padding
    paddingHorizontal: 16,
    backgroundColor: COLORS.background, // Match container background
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
  },
  title: {
    fontSize: 18, // Slightly smaller title for receipt screen
    fontWeight: '600',
    color: COLORS.text, // Use standard text color
  },
  closeButton: {
    padding: 8, // Increase touch area
    marginRight: -8, // Align visually with edge padding
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
     padding: 16, // Padding for the scrollable content
     paddingBottom: 40, // Extra space at bottom
  },
  // Updated Receipt Header Style
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 10, // Add some space at the top
  },
  restaurantName: {
    fontSize: 22, // Adjusted size
    fontWeight: 'bold', // Bolder
    color: COLORS.primary, // Keep primary color
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 16,
    color: COLORS.textSubtle, // Use subtle color
  },
  itemsSection: { // Added container for items list styling
    backgroundColor: COLORS.card, // Use card background
    borderRadius: 12,
    paddingVertical: 8, // Vertical padding inside card
    paddingHorizontal: 16, // Horizontal padding inside card
    marginBottom: 20, // Space below items list
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  // Updated Item Row Style
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
  },
  itemInfo: {
    flex: 1, // Allow item name to take space
    marginRight: 10, // Space before total
  },
  itemName: {
    fontSize: 15, // Adjusted size
    fontWeight: '500',
    color: COLORS.text, // Standard text color
    marginBottom: 4, // Space between name and quantity/price
  },
  itemQuantity: {
    fontSize: 13, // Adjusted size
    color: COLORS.textSubtle, // Subtle color for details
  },
  itemQuantityX: { // Style for the 'x' symbol
    marginHorizontal: 2,
  },
  itemTotal: {
    fontSize: 15, // Match item name size
    fontWeight: '600', // Bolder total for item
    color: COLORS.text,
    marginLeft: 16, // Ensure spacing from item info
  },
  // Updated Total Container Style
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16, // Adjusted margin
    paddingTop: 16,
    paddingBottom: 10, // Add padding below total
    borderTopWidth: 1.5, // Slightly thicker top border
    borderTopColor: COLORS.border, // Use standard border color for emphasis
    // Dashed border style
    borderStyle: 'dashed',
  },
  totalLabel: {
    fontSize: 18, // Adjusted size
    fontWeight: 'bold', // Bold label
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 22, // Adjusted size
    fontWeight: 'bold', // Bold amount
    color: COLORS.primary, // Keep primary color for emphasis
  },
  // Updated Empty State Style
  emptyStateContent: { // Renamed from emptyState for clarity
    flex: 1, // Take remaining space
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 17, // Adjusted size
    color: COLORS.textSubtle, // Use subtle color
    marginTop: 16,
    textAlign: 'center',
  },
  // Optional Footer
  footer: {
    marginTop: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});