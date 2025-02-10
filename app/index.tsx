import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Text } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { menuItems } from '../data/menuItems';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem>>({});
  const [currentTable, setCurrentTable] = useState(1);

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

  const handleNewTable = () => {
    // Save current order if needed
    // Reset the order items
    setOrderItems({});
    // Increment table number
    setCurrentTable(prev => prev + 1);
  };

  const total = Object.values(orderItems).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(orderItems).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS.backgroundDark : COLORS.background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.tableText}>Mesa {currentTable}</Text>
      </View>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
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
      <FloatingActionButton onPress={handleNewTable} />
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => {
          console.log(`Table ${currentTable} order:`, orderItems);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  tableText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  list: {
    padding: 4,
    paddingBottom: 100, // Extra padding for the order summary
  },
});