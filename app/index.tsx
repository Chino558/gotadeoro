import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Animated,
  TouchableOpacity,
  Image,
  ToastAndroid,
  Platform
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State, Direction } from 'react-native-gesture-handler';
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
      // PROPERLY ACCESS TABLE NAMES
      const { getTableNames, saveTableName } = await import('../services/tableNames');
      const currentTableName = (await getTableNames())[currentTable] || `Mesa ${currentTable}`;
      
      // Save to local storage
      await saveSale(currentTable, orderItemsList, total);
  
      // Reset table name to default if it was changed
      if (currentTableName !== `Mesa ${currentTable}`) {
        await saveTableName(currentTable, `Mesa ${currentTable}`);
      }
  
      // Clear current table
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

  // Handle swipe to change tables
  const handleSwipeLeft = () => {
    // Move to next table (if not at table 4)
    if (currentTable < 4) {
      const nextTable = currentTable + 1;
      setCurrentTable(nextTable);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Show toast on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Cambiado a Mesa ${nextTable}`, ToastAndroid.SHORT);
      }
    }
  };

  const handleSwipeRight = () => {
    // Move to previous table (if not at table 1)
    if (currentTable > 1) {
      const prevTable = currentTable - 1;
      setCurrentTable(prevTable);
      
      // Provide haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Show toast on Android
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Cambiado a Mesa ${prevTable}`, ToastAndroid.SHORT);
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Status bar with app's primary color */}
      <StatusBar style="light" translucent backgroundColor={COLORS.primary} />
      
      {/* Add extra space at the top for the status bar (50% smaller) */}
      <View style={styles.statusBarSpace} />
      
      <SafeAreaView style={styles.safeArea}>

      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>La Gota de Oro</Text>
          <Text style={styles.subtitle}>Auténtica barbacoa mexicana</Text>
        </View>
        
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
            <Ionicons name="time-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleOpenWeightCalculator}
            style={styles.iconButton}
          >
            <Ionicons name="scale-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <TableTabs
        currentTable={currentTable}
        onTableChange={handleTableChange}
        onResetNames={setResetTableNamesFunc}
      />

      <PanGestureHandler
        // Only detect horizontal gestures, ignoring vertical ones
        activeOffsetX={[-20, 20]} // Start capturing when moved 20px horizontally
        failOffsetY={[-20, 20]}   // Fail the gesture if moved 20px vertically
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.END) {
            const { translationX } = event.nativeEvent;
            
            // Threshold for swipe detection (50 pixels)
            const SWIPE_THRESHOLD = 50;
            
            if (translationX > SWIPE_THRESHOLD) {
              // Swiped right - go to previous table
              handleSwipeRight();
            } else if (translationX < -SWIPE_THRESHOLD) {
              // Swiped left - go to next table
              handleSwipeLeft();
            }
          }
        }}
      >
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
            columnWrapperStyle={styles.columnWrapper}
            initialNumToRender={15} // Render more items initially
            windowSize={5} // Increase window size for better perf
            maxToRenderPerBatch={12} // Render more items in each batch
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </PanGestureHandler>

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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 0, // No padding at top to accommodate status bar
  },
  header: {
    paddingVertical: 5,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
    width: '65%', // Reduce width to make more space for buttons
  },
  title: {
    fontSize: 21.6, // 10% smaller than original 24
    fontWeight: '700',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 13, // Also slightly reduced
    color: COLORS.textLight,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%', // Allocate more space for buttons
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6, // Reduced margin between buttons slightly
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
  },
  statusBarSpace: {
    height: 34.5, // Height reduced by 50% from 35
    backgroundColor: COLORS.primary,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  list: {
    padding: 4, // Reduced padding
    paddingBottom: 180, // Keep the bottom padding for scrolling
  },
  swipeIndicator: {
    width: 10,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  columnWrapper: {
    justifyContent: 'space-between', // Ensure cards are evenly distributed
    paddingHorizontal: 2, // Small horizontal padding
  },
});