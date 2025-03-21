import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { TableTabs } from '../components/TableTabs';
import { EnhancedOrderSummary } from '../components/OrderSummary';
import { MenuItem } from '../types';
import type { OrderItem } from '../types';
import { menuItems } from '../data/menuItems';
import { COLORS } from '../theme';
interface TableOrders {
  [key: number]: {
    [key: string]: OrderItem;
  };
}

export default function CalculadoraScreen() {
  const [tableOrders, setTableOrders] = useState<TableOrders>({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [currentTable, setCurrentTable] = useState(1);

  const currentOrderItems = tableOrders[currentTable] || {};

  const handleClearAll = () => {
    setTableOrders({ 1: {}, 2: {}, 3: {}, 4: {} });
  };

  const handleIncrement = (itemId: string) => {
    setTableOrders(prev => {
      const item = menuItems.find(i => i.id === itemId);
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
  };

  const handleDecrement = (itemId: string) => {
    setTableOrders(prev => {
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
  };

  const total = Object.values(currentOrderItems).reduce(
    (sum: number, item: OrderItem) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(currentOrderItems).reduce(
    (sum: number, item: OrderItem) => sum + item.quantity,
    0
  );

  const orderItemsList = Object.values(currentOrderItems).filter(item => item.quantity > 0);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>La Gota de Oro</Text>
      </View>
      
      <TableTabs
        currentTable={currentTable}
        onTableChange={setCurrentTable}
      />

      <FlatList
        data={menuItems}
        keyExtractor={item => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <TableTabs
            currentTable={currentTable}
            onTableChange={setCurrentTable}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <EnhancedOrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => {
          router.push({
            pathname: '/bill',
            params: {
              tableNumber: currentTable,
              items: JSON.stringify(orderItemsList),
              total: total
            }
          });
        }}
        onClearAll={handleClearAll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  list: {
    padding: 4,
    paddingBottom: 120,
  },
});
