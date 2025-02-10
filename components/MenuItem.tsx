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
const CARD_MARGIN = 8;
const NUM_COLUMNS = 2;
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
      <View style={styles.iconContainer}>
        <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
        <Text style={styles.price}>${item.price}</Text>
      </View>
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <View style={styles.quantityContainer}>
        <Pressable onPress={handleDecrement} style={styles.button}>
          <Ionicons 
            name="remove-circle-outline" 
            size={24} 
            color={quantity > 0 ? COLORS.primary : COLORS.border} 
          />
        </Pressable>
        <Text style={styles.quantity}>{quantity}</Text>
        <Pressable onPress={handleIncrement} style={styles.button}>
          <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
        </Pressable>
      </View>
    </View>
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
  },
  iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    height: 40, // Fixed height for 2 lines
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  quantityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  button: {
    padding: 4,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
});