import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mesa {tableNumber} - Cuenta</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.itemsHeader}>
          <Text style={styles.columnHeader}>Artículo</Text>
          <Text style={styles.columnHeader}>Cant.</Text>
          <Text style={styles.columnHeader}>Precio</Text>
          <Text style={styles.columnHeader}>Total</Text>
        </View>
        
        {items.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQuantity}>{item.quantity}</Text>
            <Text style={styles.itemPrice}>${item.price}</Text>
            <Text style={styles.itemTotal}>${item.price * item.quantity}</Text>
          </View>
        ))}
        
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total a Pagar</Text>
          <Text style={styles.totalAmount}>${total}</Text>
        </View>
      </ScrollView>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    padding: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    marginBottom: 8,
  },
  columnHeader: {
    fontWeight: '600',
    fontSize: 14,
    color: COLORS.primary,
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemName: {
    flex: 2,
    fontSize: 16,
  },
  itemQuantity: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  itemPrice: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
  },
  itemTotal: {
    flex: 1,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '500',
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
});