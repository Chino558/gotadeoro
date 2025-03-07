import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  SafeAreaView, 
  Animated,
  TouchableOpacity
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { TableTabs } from '../components/TableTabs';
import { EnhancedOrderSummary } from '../components/EnhancedOrderSummary';
import { ClearAllModal } from '../components/ClearAllModal';
import { MenuItem } from '../components/MenuItem';
import { menuItems } from '../src/data/menuItems';
import { COLORS } from '../src/theme';
import { saveSale } from '../services/storage';
import { Ionicons } from '@expo/vector-icons';
import type { OrderItem } from '../types';

interface TableOrders {
  [key: number]: {
    [key: string]: OrderItem;
  };
}

export default function HomeScreen() {
  const [tableOrders, setTableOrders] = useState<TableOrders>({ 1: {}, 2: {}, 3: {}, 4: {} });
  const [currentTable, setCurrentTable] = useState(1);
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentOrderItems = tableOrders[currentTable] || {};

  const handleClearAll = () => {
    setClearModalVisible(true);
  };

  const confirmClearAll = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    setTableOrders(prev => ({
      ...prev,
      [currentTable]: {},
    }));
    
    setClearModalVisible(false);
  };

  const handleIncrement = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
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

  const handleTableChange = (tableNumber: number) => {
    setCurrentTable(tableNumber);
  };

  const handleCheckout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const items = Object.values(currentOrderItems).filter(item => item.quantity > 0);
    router.push({
      pathname: "/bill",
      params: {
        items: JSON.stringify(items),
        total: total.toString(),
        table: currentTable.toString()
      }
    });
  };

  const handleViewSalesHistory = () => {
    router.push('/sales-history');
  };

  const handleSaveOrder = async () => {
    if (itemCount === 0 || saveInProgress) return;
    
    setSaveInProgress(true);
    try {
      // Save to local storage
      await saveSale(currentTable, orderItemsList, total);
      
      // Clear the current table
      setTableOrders(prev => ({
        ...prev,
        [currentTable]: {},
      }));
      
      // Show success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving order:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaveInProgress(false);
    }
  };

  const total = Object.values(currentOrderItems).reduce(
    (sum: number, item: OrderItem) => sum + item.price * item.quantity,
    0
  );

  const itemCount: number = Object.values(currentOrderItems).reduce(
    (sum: number, item: OrderItem) => sum + item.quantity,
    0
  );

  const orderItemsList = Object.values(currentOrderItems).filter(item => item.quantity > 0);

  const [resetTableNamesFunc, setResetTableNamesFunc] = useState<() => Promise<void>>(() => async () => {});

  const handleResetTableNames = async () => {
    try {
      if (typeof resetTableNamesFunc === 'function') {
        await resetTableNamesFunc();
        alert('Table names have been reset');
      } else {
        console.error('Reset function is not set correctly');
      }
    } catch (error) {
      console.error('Error resetting table names:', error);
    }
  };

  const handleOpenWeightCalculator = () => {
    router.push('/weight-calculator');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>La Gota de Oro</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              onPress={handleResetTableNames}
              style={styles.iconButton}
            >
              <Ionicons name="refresh-circle" size={24} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleViewSalesHistory}
              style={styles.iconButton}
            >
              <Ionicons name="time-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleOpenWeightCalculator}
              style={styles.iconButton}
            >
              <Ionicons name="scale-outline" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <TableTabs
        currentTable={currentTable}
        onTableChange={handleTableChange}
        onResetNames={setResetTableNamesFunc}
      />

      <Animated.View style={{
        flex: 1,
        opacity: fadeAnim,
        transform: [{ scale: scaleAnim }]
      }}>
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
      </Animated.View>

      {itemCount > 0 && (
        <EnhancedOrderSummary
          total={total}
          itemCount={itemCount}
          onCheckout={handleCheckout}
          onClearAll={handleClearAll}
        />
      )}

      <ClearAllModal
        visible={clearModalVisible}
        onClose={() => setClearModalVisible(false)}
        onConfirm={confirmClearAll}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  historyButton: {
    padding: 8,
  },
  list: {
    padding: 4,
    paddingBottom: 120,
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
});
