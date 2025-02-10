import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { menuItems } from '../data/menuItems';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem>>({});

  const handleIncrement = useCallback((itemId: string) => {
    setOrderItems((prev) => {
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return prev;

      const existing = prev[itemId];
      return {
        ...prev,
        [itemId]: {
          ...item,
          quantity: (existing?.quantity || 0) + 1,
        },
      };
    });
  }, []);

  const handleDecrement = useCallback((itemId: string) => {
    setOrderItems((prev) => {
      const existing = prev[itemId];
      if (!existing || existing.quantity <= 0) return prev;

      const newQuantity = existing.quantity - 1;
      if (newQuantity === 0) {
        const { [itemId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [itemId]: {
          ...existing,
          quantity: newQuantity,
        },
      };
    });
  }, []);

  const total = Object.values(orderItems).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(orderItems).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const handleCheckout = () => {
    // Implement checkout logic
    console.log('Order:', orderItems);
  };

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS.backgroundDark : COLORS.background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MenuItem
            item={item}
            quantity={orderItems[item.id]?.quantity || 0}
            onIncrement={() => handleIncrement(item.id)}
            onDecrement={() => handleDecrement(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={handleCheckout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    paddingVertical: 16,
  },
});