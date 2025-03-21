import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../src/theme';

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
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const totalTextAnim = useRef(new Animated.Value(1)).current;
  const previousTotal = useRef(total);

  // Entrance animation
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
  }, []);

  // Animation when total changes
  useEffect(() => {
    if (previousTotal.current !== total) {
      // If the total increases, scale up and down quickly
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
      ]).start();

      // Pulse animation for the total text
      Animated.sequence([
        Animated.timing(totalTextAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(totalTextAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      previousTotal.current = total;
    }
  }, [total]);

  const handleCheckout = () => {
    if (itemCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onCheckout();
    }
  };

  const handleClearAll = () => {
    if (itemCount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        <View style={styles.topRow}>
          <View style={styles.itemCountWrapper}>
            <Ionicons name="cart-outline" size={16} color={COLORS.textLight} style={styles.itemCountIcon} />
            <Text style={styles.itemCount}>{itemCount} artículos</Text>
          </View>
          
          {itemCount > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearAll}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              <Text style={styles.clearText}>Limpiar Todo</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.info}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Animated.Text
              style={[
                styles.total,
                {
                  transform: [
                    { scale: totalTextAnim },
                    {
                      scale: scaleAnim.interpolate({
                        inputRange: [0, 0.1],
                        outputRange: [1, 1.2]
                      })
                    }
                  ]
                }
              ]}
            >
              ${total.toFixed(2)}
            </Animated.Text>
          </View>
          
          <Pressable
            style={[
              styles.checkoutButton,
              itemCount === 0 && styles.checkoutButtonDisabled
            ]}
            onPress={handleCheckout}
            disabled={itemCount === 0}
          >
            <Text style={styles.checkoutText}>Ver Cuenta</Text>
            <Ionicons name="receipt-outline" size={18} color="white" style={styles.checkoutIcon} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  content: {
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemCountWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCountIcon: {
    marginRight: 6,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
  },
  clearText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  totalContainer: {
    flexDirection: 'column',
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 15,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  total: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: COLORS.subtle,
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