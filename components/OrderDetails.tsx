import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface OrderDetailsProps {
  items: OrderItem[];
  onClose: () => void;
  onDecrement: (itemId: string) => void;
}

export function OrderDetails({ items, onClose, onDecrement }: OrderDetailsProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Detalles del Pedido</Text>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </Pressable>
      </View>
      <ScrollView style={styles.itemList}>
        {items.map((item) => (
          <View key={item.id} style={styles.item}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>${item.price} × {item.quantity}</Text>
            </View>
            <Text style={styles.itemTotal}>${item.price * item.quantity}</Text>
            <Pressable 
              onPress={() => onDecrement(item.id)}
              style={styles.removeButton}
            >
              <Ionicons name="remove-circle-outline" size={24} color={COLORS.error} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  itemList: {
    padding: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 12,
    color: COLORS.primary,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginHorizontal: 16,
  },
  removeButton: {
    padding: 4,
  },
});