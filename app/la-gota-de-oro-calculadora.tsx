import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { BillBreakdown } from '../components/BillBreakdown';
import { TableTabs } from '../components/TableTabs';
import { menuItems } from '../data/menuItems';
import { COLORS } from '../theme';

export default function CalculadoraScreen() {
  const [tableOrders, setTableOrders] = useState({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [currentTable, setCurrentTable] = useState(1);
  const [showBill, setShowBill] = useState(false);

  const currentOrderItems = tableOrders[currentTable] || {};

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
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(currentOrderItems).reduce(
    (sum, item) => sum + item.quantity,
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
        onShowBill={() => setShowBill(true)}
      />

      <BillBreakdown
        visible={showBill}
        items={orderItemsList}
        tableNumber={currentTable}
        onClose={() => setShowBill(false)}
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