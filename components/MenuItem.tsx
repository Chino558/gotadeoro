import React from 'react';
import { StyleSheet, Pressable, View, Text, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MenuItem as MenuItemType } from '../types';
import { COLORS } from '../src/theme';

interface MenuItemProps {
  item: MenuItemType;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 3; // Reduced margin
const NUM_COLUMNS = 3;
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * CARD_MARGIN * 2) / NUM_COLUMNS;

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Ignore haptics errors
    }
  }
};

export function MenuItem({ item, quantity, onIncrement, onDecrement }: MenuItemProps) {
  const handlePress = () => {
    triggerHaptic();
    onIncrement();
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      triggerHaptic();
      onDecrement();
    }
  };
  
  // Determine if this is a long item name that needs special styling
  const isLongName = item.name.length > 20; // Reduced threshold for long names

  return (
    <Pressable
      style={[styles.container, quantity > 0 && styles.activeContainer]}
      onPress={handlePress}
    >
      <View style={styles.contentWrapper}>
        <Text 
          style={[styles.name, isLongName && styles.smallerText]} 
          numberOfLines={isLongName ? 3 : 2}
        >
          {item.name}
        </Text>
        <View style={styles.priceTag}>
          <Text style={styles.price}>${item.price}</Text>
        </View>
      </View>

      {quantity > 0 && (
        <>
          <Pressable
            onPress={handleDecrement}
            style={styles.minusButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="remove" size={14} color="white" />
          </Pressable>

          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    margin: CARD_MARGIN,
    padding: 8, // Reduced padding
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4, // Reduced shadow
    elevation: 2, // Reduced elevation
    minHeight: 80, // Reduced height
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    position: 'relative',
    overflow: 'visible',
  },
  activeContainer: {
    borderColor: COLORS.primaryLight,
    backgroundColor: '#FFFDF5', // Very subtle cream background when active
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
    paddingBottom: 4,
  },
  name: {
    fontSize: 13, // Smaller font
    fontWeight: '600',
    marginBottom: 6, // Reduced margin
    textAlign: 'center',
    color: COLORS.text,
    minHeight: 32, // Reduced height
    lineHeight: 16, // Reduced line height
  },
  smallerText: {
    fontSize: 11, // Smaller font for long names
    lineHeight: 14, // Tighter line height
    minHeight: 42, // Reduced but still gives space for 3 lines
  },
  priceTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 45,
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D9534F',
    textAlign: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 3,
  },
  quantityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  minusButton: {
    position: 'absolute',
    left: -6,
    top: -6,
    zIndex: 5,
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
});