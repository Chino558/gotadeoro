import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  TouchableOpacity,
  Platform // Added Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../src/theme'; // Ensure path is correct
import * as Animatable from 'react-native-animatable'; // Use Animatable for consistency if preferred over Animated API

interface EnhancedOrderSummaryProps {
  total: number;
  itemCount: number;
  onCheckout: () => void;
  onClearAll: () => void;
}

export function EnhancedOrderSummary({
  total,
  itemCount,
  onCheckout,
  onClearAll
}: EnhancedOrderSummaryProps) {

  // --- Original Animated API refs and logic ---
  // If you prefer Animatable, you can replace these with state/refs managed by Animatable
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const totalTextAnim = useRef(new Animated.Value(1)).current;
  const previousTotal = useRef(total);

  // Entrance animation (Kept original Animated logic)
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  }, [opacityAnim, translateYAnim]); // Added dependencies

  // Animation when total changes (Kept original Animated logic)
  useEffect(() => {
    if (previousTotal.current !== total) {
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 0.1, duration: 150, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(scaleAnim, { toValue: 0, duration: 150, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
      ]).start();
      Animated.sequence([
        Animated.timing(totalTextAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }), // Slightly smaller pulse
        Animated.timing(totalTextAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      previousTotal.current = total;
    }
  }, [total, scaleAnim, totalTextAnim]); // Added dependencies

  const handleCheckout = () => {
    if (itemCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onCheckout();
    }
  };

  const handleClearAll = () => {
    if (itemCount > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); // Use warning for clear all
      onClearAll();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim, // Apply entrance animation
          transform: [{ translateY: translateYAnim }]
        }
      ]}
    >
      {/* Use standard View, Animated.View applied to container */}
      <View style={styles.content}>
        {/* Top Row: Item Count & Clear Button */}
        <View style={styles.topRow}>
          <View style={styles.itemCountWrapper}>
            <Ionicons name="cart-outline" size={18} color={COLORS.textSubtle} style={styles.itemCountIcon} />
             {/* Ensure itemCount is in Text */}
            <Text style={styles.itemCountText}>{itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}</Text>
          </View>

          {/* Render clear button only if items exist */}
          {itemCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Bottom Row: Total & Checkout Button */}
        <View style={styles.infoRow}>
          {/* Total Amount */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            {/* Apply total change animation here */}
            <Animated.Text
              style={[
                styles.totalAmountText,
                { transform: [{ scale: totalTextAnim }] } // Apply text pulse animation
                // Note: The scaleAnim on the container might be redundant if totalTextAnim is used.
                // Consider removing the scaleAnim logic if this looks better.
              ]}
            >
               {/* Ensure total is formatted correctly */}
              ${total.toFixed(2)}
            </Animated.Text>
          </View>

          {/* Checkout Button */}
          <Pressable
             style={({pressed}) => [
                styles.checkoutButton,
                itemCount === 0 && styles.checkoutButtonDisabled,
                pressed && styles.checkoutButtonPressed, // Added pressed state
             ]}
            onPress={handleCheckout}
            disabled={itemCount === 0}
          >
            <Text style={styles.checkoutText}>Ver Cuenta</Text>
            <Ionicons name="receipt-outline" size={20} color="white" style={styles.checkoutIcon} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

// --- Styles --- (Applied theme and refinements)
const styles = StyleSheet.create({
  container: {
    // Keep position absolute if this component is rendered overlaying the main screen
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card, // Use card background
    borderTopLeftRadius: 16, // Consistent radius
    borderTopRightRadius: 16,
    borderTopWidth: 1, // Add border
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.borderLight, // Use light border
    // Adjust padding based on safe area needs, typically handled by parent or using react-native-safe-area-context
    paddingBottom: Platform.OS === 'ios' ? 24 : 16, // Add some bottom padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 }, // Shadow points up
    shadowOpacity: 0.1, // Subtle shadow
    shadowRadius: 6,
    elevation: 8, // Standard elevation
  },
  content: {
    paddingHorizontal: 16, // Horizontal padding
    paddingTop: 12, // Top padding within the card
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8, // Space before divider
  },
  itemCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4, // Add some padding
  },
  itemCountIcon: {
    marginRight: 6,
  },
  itemCountText: { // Renamed from itemCount for clarity
    fontSize: 14, // Adjusted size
    color: COLORS.textSubtle, // Use subtle color
    fontWeight: '500',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6, // Adjust padding
    paddingHorizontal: 10,
    backgroundColor: COLORS.errorLight, // Use light error background
    borderRadius: 8, // Consistent radius
  },
  clearText: {
    color: COLORS.error, // Error color for text
    fontSize: 13, // Adjusted size
    fontWeight: '500',
    marginLeft: 4, // Space from icon
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight, // Use light border for divider
    marginVertical: 8, // Adjust spacing around divider
  },
  infoRow: { // Renamed from info for clarity
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Align items to bottom for better total alignment
    marginTop: 4, // Space after divider
  },
  totalContainer: {
    flexDirection: 'column', // Stack label and amount vertically
    alignItems: 'flex-start', // Align text left
    flexShrink: 1, // Allow total to shrink if needed
    marginRight: 10, // Space before button
  },
  totalLabel: {
    fontSize: 13, // Slightly smaller label
    color: COLORS.textSubtle, // Subtle color
    marginBottom: 2,
    fontWeight: '500',
  },
  totalAmountText: { // Renamed from total for clarity
    fontSize: 24, // Larger total amount
    fontWeight: 'bold',
    color: COLORS.primary, // Use primary color for total amount
    lineHeight: 28, // Adjust line height for font
  },
  checkoutButton: {
    backgroundColor: COLORS.primary, // Keep primary color
    paddingVertical: 12, // Adjust padding
    paddingHorizontal: 18,
    borderRadius: 10, // Consistent radius
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryDark, // Use primary shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Subtle shadow
    shadowRadius: 4,
    elevation: 3, // Standard elevation
    minWidth: 140, // Ensure minimum width
  },
  checkoutButtonPressed: {
     backgroundColor: COLORS.primaryDark, // Darker feedback on press
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.subtle, // Use subtle color when disabled
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutIcon: {
    marginLeft: 8,
  },
});