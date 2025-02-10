import React from 'react';
import { StyleSheet, Pressable, View, Text, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { MenuItem as MenuItemType } from '../types';
import { COLORS } from '../theme';

interface MenuItemProps {
  item: MenuItemType;
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_MARGIN = 4;
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

  return (
    <Pressable 
      style={styles.container} 
      onPress={handlePress}
    >
      {quantity > 0 && (
        <Pressable 
          onPress={handleDecrement}
          style={styles.minusButton}
        >
          <Ionicons name="remove-circle" size={22} color={COLORS.error} />
        </Pressable>
      )}
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <Text style={styles.price}>${item.price}</Text>
      {quantity > 0 && (
        <View style={styles.quantityBadge}>
          <Text style={styles.quantityText}>{quantity}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    backgroundColor: 'white',
    borderRadius: 12,
    margin: CARD_MARGIN,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 80,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
    height: 36,
  },
  price: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  quantityBadge: {
    position: 'absolute',
    right: -8,
    top: -8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  quantityText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  minusButton: {
    position: 'absolute',
    left: -8,
    top: -8,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});