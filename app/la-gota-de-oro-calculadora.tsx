import React, { useState, useCallback } from 'react';
import { StyleSheet, View, FlatList, useColorScheme, Text, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { OrderDetails } from '../components/OrderDetails';
import { FloatingActionButton } from '../components/FloatingActionButton';
import { menuItems } from '../data/menuItems';
import { OrderItem } from '../types';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function CalculadoraScreen() {
  const colorScheme = useColorScheme();
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem>>({});
  const [currentTable, setCurrentTable] = useState(1);
  const [showOrderDetails, setShowOrderDetails] = useState(false);

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
    setOrderItems({});
    setCurrentTable(prev => prev + 1);
    setShowOrderDetails(false);
  };

  const total = Object.values(orderItems).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const itemCount = Object.values(orderItems).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const orderItemsList = Object.values(orderItems).filter(item => item.quantity > 0);

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS.backgroundDark : COLORS.background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.title}>La Gota de Oro</Text>
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
      <FloatingActionButton 
        onPress={handleNewTable} 
        style={styles.fab}
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  tableText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  list: {
    padding: 4,
    paddingBottom: 100,
  },
  fab: {
    bottom: 160, // Moved higher up
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