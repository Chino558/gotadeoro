import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface OrderBreakdownProps {
  visible: boolean;
  items: OrderItem[];
  onClose: () => void;
}

export function OrderBreakdown({ visible, items, onClose }: OrderBreakdownProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Desglose de Cuenta</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.itemList}>
            {items.map((item) => (
              <View key={item.id} style={styles.item}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>{item.quantity} × ${item.price}</Text>
                </View>
                <Text style={styles.itemTotal}>${item.price * item.quantity}</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${total}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
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
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  itemList: {
    padding: 16,
    maxHeight: '60%',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
});