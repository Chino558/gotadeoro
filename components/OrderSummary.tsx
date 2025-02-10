import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { COLORS } from '../theme';

interface OrderSummaryProps {
  total: number;
  itemCount: number;
  onCheckout: () => void;
  onPress: () => void;
}

export function OrderSummary({ total, itemCount, onCheckout, onPress }: OrderSummaryProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.content} onPress={onPress}>
        <View style={styles.info}>
          <Text style={styles.itemCount}>{itemCount} artículos</Text>
          <Text style={styles.total}>${total}</Text>
        </View>
      </Pressable>
      <Pressable 
        style={[styles.checkoutButton, itemCount === 0 && styles.checkoutButtonDisabled]}
        onPress={onCheckout}
        disabled={itemCount === 0}
      >
        <Text style={styles.checkoutText}>Ver Cuenta</Text>
      </Pressable>
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
    borderTopColor: COLORS.border,
    paddingBottom: 34,
  },
  content: {
    padding: 16,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});