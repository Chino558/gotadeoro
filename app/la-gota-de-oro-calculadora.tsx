import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { OrderDetails } from '../components/OrderDetails';
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
  const [tableOrders, setTableOrders] = useState<TableOrders>({ 1: {} });
  const [tables, setTables] = useState<number[]>([1]);
  const [currentTable, setCurrentTable] = useState(1);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

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

  const handleAddTable = () => {
    const newTable = Math.max(...tables) + 1;
    setTables(prev => [...prev, newTable]);
    setTableOrders(prev => ({
      ...prev,
      [newTable]: {},
    }));
    setCurrentTable(newTable);
  };

  const handleTableChange = (table: number) => {
    setCurrentTable(table);
    setShowOrderDetails(false);
  };

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
        tables={tables}
        currentTable={currentTable}
        onTableChange={handleTableChange}
        onAddTable={handleAddTable}
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
      <Pressable 
        style={styles.orderDetailsButton}
        onPress={() => setShowOrderDetails(true)}
      >
        <Ionicons name="list" size={24} color={COLORS.primary} />
      </Pressable>
      {showOrderDetails && (
        <OrderDetails
          items={orderItemsList}
          onClose={() => setShowOrderDetails(false)}
          onDecrement={handleDecrement}
        />
      )}
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => {
          console.log(`Table ${currentTable} order:`, currentOrderItems);
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
  orderDetailsButton: {
    position: 'absolute',
    right: 16,
    bottom: 120,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});