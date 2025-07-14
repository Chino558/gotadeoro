import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  TouchableOpacity,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../src/theme'; // Ensure path is correct
// Removed Animatable import as we are using Animated API here

// Define Dollar Green color (or import from theme)
const DOLLAR_GREEN = '#2E8B57'; // Example: SeaGreen

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

  // --- Animated API refs and logic (Keep as is) ---
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const totalTextScaleAnim = useRef(new Animated.Value(1)).current;
  const previousTotal = useRef(total);

  // Entrance animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      Animated.timing(translateYAnim, { toValue: 0, duration: 400, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
    ]).start();
  }, [opacityAnim, translateYAnim]);

  // Animation when total changes
  useEffect(() => {
    if (previousTotal.current !== total) {
      Animated.sequence([
        Animated.timing(totalTextScaleAnim, { toValue: 1.15, duration: 150, useNativeDriver: true }),
        Animated.timing(totalTextScaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();
      previousTotal.current = total;
    }
  }, [total, totalTextScaleAnim]);

  const handleCheckout = () => {
    if (itemCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onCheckout();
    }
  };

  const handleClearAll = () => {
    if (itemCount > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onClearAll();
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [{ translateY: translateYAnim }]
        }
      ]}
    >
      <View style={styles.content}>

        {/* --- TOP SECTION: Total and Clear Button --- */}
        <View style={styles.topSection}>
          {/* Total Amount */}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Animated.Text
              style={[
                styles.totalAmountText,
                { transform: [{ scale: totalTextScaleAnim }] }
              ]}
            >
              ${total.toFixed(2)}
            </Animated.Text>
          </View>

          {/* Clear Button (Moved Up, with text) */}
          {itemCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton} // Keep style with background/padding
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              {/* Keep the Text component */}
              <Text style={styles.clearText}>Limpiar Articulos</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Divider */}
        {itemCount > 0 && <View style={styles.divider} />}

        {/* --- BOTTOM SECTION: Item Count and Checkout Button --- */}
        <View style={styles.bottomSection}>
           {/* Item Count (Aligned Left, text bigger) */}
          <View style={styles.itemCountWrapper}>
            <Ionicons name="cart-outline" size={18} color={COLORS.textSubtle} style={styles.itemCountIcon} />
            <Text style={styles.itemCountText}> {/* Increased font size */}
                {itemCount} {itemCount === 1 ? 'artículo' : 'artículos'}
            </Text>
          </View>

          {/* Checkout Button */}
          <Pressable
             style={({pressed}) => [
                styles.checkoutButton,
                itemCount === 0 && styles.checkoutButtonDisabled,
                pressed && styles.checkoutButtonPressed,
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

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 42,
    borderTopRightRadius: 42,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.borderLight,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align to top
    marginBottom: 12,
  },
  totalContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1, // Let total take available space
    marginRight: 10,
  },
  totalLabel: {
    fontSize: 19,
    color: COLORS.textSubtle,
    marginBottom: 2,
    fontWeight: '700',
  },
  totalAmountText: {
    fontSize: 30,
    fontWeight: 'bold',
    color: DOLLAR_GREEN, // Keep green color
    lineHeight: 34,
  },
  clearButton: { // Style for clear button WITH text
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Adjust padding
    paddingHorizontal: 12, // Adjust padding
    backgroundColor: COLORS.errorLight, // Restore light error background
    borderRadius: 8,
    marginTop: 15, // Align with Total label
  },
  clearText: { // Style for the text inside clear button
    color: COLORS.error,
    fontSize: 18, // Keep size or adjust
    fontWeight: '500',
    marginLeft: 5, // Space from icon
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginVertical: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', // Center items vertically
    marginTop: 8,
  },
  itemCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountIcon: {
    marginRight: 5, // Adjust space
  },
  itemCountText: {
    fontSize: 16, // << Increased font size
    color: COLORS.textSubtle,
    fontWeight: '500',
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 10, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    marginLeft: 10,
  },
  checkoutButtonPressed: {
     backgroundColor: COLORS.primaryDark,
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.subtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutText: {
    color: 'white',
    fontSize: 21,
    fontWeight: '800',
  },
  checkoutIcon: {
    marginLeft: 8,
  },
});