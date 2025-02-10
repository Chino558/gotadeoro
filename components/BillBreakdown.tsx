import React, { useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  Modal, 
  Pressable, 
  Animated, 
  Dimensions,
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface BillBreakdownProps {
  visible: boolean;
  items: OrderItem[];
  tableNumber: number;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function BillBreakdown({ visible, items, tableNumber, onClose }: BillBreakdownProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.handle} />
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Mesa {tableNumber}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </Pressable>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.billHeader}>
              <Text style={styles.restaurantName}>La Gota de Oro</Text>
              <Text style={styles.billTitle}>Cuenta</Text>
            </View>

            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity} × ${item.price.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>
                  ${(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}

            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: SCREEN_HEIGHT * 0.6,
    maxHeight: SCREEN_HEIGHT * 0.9,
    paddingBottom: 34, // Safe area
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.primary,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  billHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  restaurantName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  billTitle: {
    fontSize: 16,
    color: '#666',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
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
    color: '#666',
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 2,
    borderTopColor: COLORS.primary,
    marginTop: 20,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
  },
});