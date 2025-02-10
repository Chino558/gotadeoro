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
const NUM_COLUMNS = 3; // Changed to 3 columns
const CARD_WIDTH = (SCREEN_WIDTH - (NUM_COLUMNS + 1) * CARD_MARGIN * 2) / NUM_COLUMNS;

export function MenuItem({ item, quantity, onIncrement, onDecrement }: MenuItemProps) {
  const handleIncrement = () => {
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
    <View style={styles.container}>
      <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.price}>${item.price}</Text>
      <View style={styles.quantityContainer}>
        <Pressable onPress={handleDecrement} style={styles.button}>
          <Ionicons 
            name="remove" 
            size={18} 
            color={quantity > 0 ? COLORS.primary : COLORS.border} 
          />
        </Pressable>
        <Text style={styles.quantity}>{quantity}</Text>
        <Pressable onPress={handleIncrement} style={styles.button}>
          <Ionicons name="add" size={18} color={COLORS.primary} />
        </Pressable>
      </View>
    </View>
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
    marginBottom: 4,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  button: {
    padding: 4,
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 20,
    textAlign: 'center',
  },
});