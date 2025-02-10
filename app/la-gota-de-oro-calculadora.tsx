import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { OrderBreakdown } from '../components/OrderBreakdown';
import { TableTabs } from '../components/TableTabs';
import { menuItems } from '../data/menuItems';
import { OrderItem } from '../types';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

interface TableOrders {
  [tableNumber: number]: Record<string, OrderItem>;
}

export default function CalculadoraScreen() {
  const colorScheme = useColorScheme();
  const [tableOrders, setTableOrders] = useState<TableOrders>({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [currentTable, setCurrentTable] = useState(1);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const currentOrderItems = tableOrders[currentTable] || {};

  const handleIncrement = useCallback((itemId: string) => {
    setTableOrders((prev) => {
      const item = menuItems.find((i) => i.id === itemId);
      if (!item) return prev;

      const currentItems = prev[currentTable] || {};
      const existing = currentItems[itemId];

      return {
        ...prev,
        [currentTable]: {
          ...currentItems,
          [itemId]: {
            ...item,
            quantity: (existing?.quantity || 0) + 1,
          },
        },
      };
    });
  }, [currentTable]);

  const handleDecrement = useCallback((itemId: string) => {
    setTableOrders((prev) => {
      const currentItems = prev[currentTable] || {};
      const existing = currentItems[itemId];
      if (!existing || existing.quantity <= 0) return prev;

      const newQuantity = existing.quantity - 1;
      const newItems = { ...currentItems };

      if (newQuantity === 0) {
        delete newItems[itemId];
      } else {
        newItems[itemId] = {
          ...existing,
          quantity: newQuantity,
        };
      }

      return {
        ...prev,
        [currentTable]: newItems,
      };
    });
  }, [currentTable]);

  const total = Object.values(currentOrderItems).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(currentOrderItems).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const orderItemsList = Object.values(currentOrderItems).filter(item => item.quantity > 0);

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS.backgroundDark : COLORS.background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.title}>La Gota de Oro</Text>
      </View>
      <TableTabs
        currentTable={currentTable}
        onTableChange={setCurrentTable}
      />
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <MenuItem
            item={item}
            quantity={currentOrderItems[item.id]?.quantity || 0}
            onIncrement={() => handleIncrement(item.id)}
            onDecrement={() => handleDecrement(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => setShowBreakdown(true)}
      />
      {showBreakdown && (
        <OrderBreakdown
          items={orderItemsList}
          onClose={() => setShowBreakdown(false)}
        />
      )}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  list: {
    padding: 4,
    paddingBottom: 100,
  },
});