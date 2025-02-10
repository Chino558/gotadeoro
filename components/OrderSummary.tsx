import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../theme';

interface OrderSummaryProps {
  total: number;
  itemCount: number;
  tableNumber: number;
  items: Record<string, any>;
}

export function OrderSummary({ total, itemCount, tableNumber, items }: OrderSummaryProps) {
  const handleShowBill = () => {
    if (itemCount > 0) {
      const encodedItems = encodeURIComponent(JSON.stringify(items));
      router.push({
        pathname: '/bill',
        params: {
          tableNumber,
          items: encodedItems,
          total: total.toFixed(2),
        },
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.itemCount}>{itemCount} artículos</Text>
          <Text style={styles.total}>${total.toFixed(2)}</Text>
        </View>
        <Pressable 
          style={[styles.checkoutButton, itemCount === 0 && styles.checkoutButtonDisabled]}
          onPress={handleShowBill}
          disabled={itemCount === 0}
        >
          <Text style={styles.checkoutText}>Ver Cuenta</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingBottom: 34,
  },
  content: {
    padding: 16,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemCount: {
    fontSize: 16,
    color: '#666',
  },
  total: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCC',
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});