import React from 'react';
import { StyleSheet, Pressable, View, Text, Dimensions } from 'react-native';
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

export function MenuItem({ item, quantity, onIncrement, onDecrement }: MenuItemProps) {
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onIncrement();
  };

  const handleDecrement = () => {
    if (quantity > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
          style={styles.decrementButton}
        >
          <Ionicons name="remove-circle" size={20} color={COLORS.error} />
        </Pressable>
      )}
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
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
    borderRadius: 8,
    margin: CARD_MARGIN,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 60,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quantityBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  decrementButton: {
    position: 'absolute',
    left: -5,
    top: -5,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
  },
});