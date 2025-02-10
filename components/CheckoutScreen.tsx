import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface CheckoutScreenProps {
  items: OrderItem[];
  tableNumber: number;
  onClose: () => void;
}

export function CheckoutScreen({ items, tableNumber, onClose }: CheckoutScreenProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Mesa {tableNumber}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.primary} />
          <Text style={styles.emptyText}>No hay artículos en la orden</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesa {tableNumber}</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="white" />
        </Pressable>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.receiptHeader}>
          <Text style={styles.restaurantName}>La Gota de Oro</Text>
          <Text style={styles.receiptTitle}>Cuenta</Text>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>{item.quantity} × ${item.price}</Text>
            </View>
            <Text style={styles.itemTotal}>${item.price * item.quantity}</Text>
          </View>
        ))}
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>${total}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 18,
    color: '#666',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemQuantity: {
    fontSize: 14,
    color: COLORS.primary,
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
});