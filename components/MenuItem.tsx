import React, { useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  Text,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MenuItem as MenuItemType } from '../types'; // Ensure this path is correct
import { COLORS } from '../src/theme'; // Ensure this path is correct

interface MenuItemProps {
  item: MenuItemType;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

// --- Adjusted Card Size Calculation ---
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_HORIZONTAL_PADDING = 8; // Padding of the FlatList container (in index.tsx)
const CARD_MARGIN = 6; // << Increased margin slightly for spacing between smaller cards
const NUM_COLUMNS = 3;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CARD_HORIZONTAL_PADDING * 2);
// Calculate width based on available space, accounting for increased margins
const CARD_WIDTH = (AVAILABLE_WIDTH / NUM_COLUMNS) - (CARD_MARGIN * 2);
// Adjust min height for smaller content area
const CARD_MIN_HEIGHT = 80; // << Reduced min height


// Keep haptic utility function
const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.log("Haptic feedback failed:", error);
    }
  }
};

export function MenuItem({ item, quantity, onIncrement, onDecrement }: MenuItemProps) {

  const handlePress = useCallback(() => {
    triggerHaptic();
    onIncrement();
  }, [onIncrement]);

  const handleDecrementPress = useCallback(() => {
    if (quantity > 0) {
      triggerHaptic();
      onDecrement();
    }
  }, [quantity, onDecrement]);

  const price = typeof item.price === 'number' ? item.price : 0;

  return (
    // Main Pressable Container for the Card
    <Pressable
      style={({ pressed }) => [
        styles.container, // Uses the smaller CARD_WIDTH now
        quantity > 0 && styles.activeContainer,
        pressed && styles.containerPressed
      ]}
      onPress={handlePress}
      accessibilityLabel={`Añadir ${item.name || 'producto'}`}
      accessibilityHint={`Precio ${price.toFixed(2)}`}
      accessibilityRole="button"
      accessibilityState={{ selected: quantity > 0 }}
    >
      {/* Content Wrapper - Adjust padding and layout */}
      <View style={styles.contentWrapper}>
        <Text style={styles.name} numberOfLines={2}>{item.name || 'Producto'}</Text>
        {/* Price Container (no specific style needed now) */}
        <View>
            <Text style={styles.price}>${price.toFixed(2)}</Text>
        </View>
      </View>

      {/* --- Quantity Controls --- */}
      {quantity > 0 && (
        <>
          {/* Minus Button */}
          <Pressable
            onPress={handleDecrementPress}
            style={({pressed}) => [
                styles.minusButton,
                pressed && styles.buttonPressedFeedback
            ]}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 10 }}
            accessibilityLabel={`Quitar uno de ${item.name || 'producto'}`}
            accessibilityRole="button"
          >
            <Ionicons name="remove-circle" size={24} color={COLORS.error} />
          </Pressable>

          {/* Quantity Badge */}
          <View style={styles.quantityBadge} pointerEvents="none">
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
        </>
      )}
      {/* --- End Quantity Controls --- */}

    </Pressable>
  );
}

// --- Styles --- (Adjusted for smaller size and content spacing)
const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH, // Use adjusted width
    minHeight: CARD_MIN_HEIGHT, // Use adjusted height
    backgroundColor: COLORS.card,
    borderRadius: 8, // Slightly less radius for smaller card
    margin: CARD_MARGIN, // Use adjusted margin
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    position: 'relative',
    overflow: 'visible',
    // justifyContent: 'center', // Let contentWrapper handle alignment
    // alignItems: 'center',
  },
  containerPressed: {
    backgroundColor: COLORS.cardLight,
    transform: [{ scale: 0.97 }], // Adjust press scale
  },
  activeContainer: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  contentWrapper: {
    flexGrow: 1, // Allow wrapper to fill available space
    width: '100%',
    justifyContent: 'center', // Center content vertically now
    alignItems: 'center', // Center content horizontally
    paddingVertical: 10, // Adjust vertical padding inside card
    paddingHorizontal: 6, // Adjust horizontal padding inside card
  },
  name: {
    fontSize: 12, // Slightly smaller font for smaller card
    fontWeight: '600',
    marginBottom: 4, // << Reduced space between name and price
    textAlign: 'center',
    color: COLORS.text,
    minHeight: 30, // Adjust height for 2 lines of smaller text
    lineHeight: 15, // Adjust line height
  },
  // priceContainer style removed
  price: {
    fontSize: 13, // Slightly smaller font
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  // Controls adjusted slightly for potentially smaller card corners
  quantityBadge: {
    position: 'absolute',
    right: -7, // Adjusted position
    top: -7,   // Adjusted position
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
  },
  quantityText: {
    color: 'white',
    fontSize: 11, // Slightly smaller text
    fontWeight: '700',
  },
  minusButton: {
    position: 'absolute',
    left: -8, // Adjusted position
    top: -8,  // Adjusted position
    zIndex: 10,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 5,
  },
  buttonPressedFeedback: {
      backgroundColor: COLORS.errorLight,
  },
});