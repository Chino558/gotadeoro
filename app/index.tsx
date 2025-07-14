import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // <-- Added useCallback, useMemo
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Animated, // <-- Keep original Animated import
  TouchableOpacity,
  Platform, // <-- Added Platform
  Alert, // <-- Added Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable'; // <-- Added Animatable
import { TableTabs } from '../components/TableTabs';
import { EnhancedOrderSummary } from '../components/EnhancedOrderSummary';
import { ClearAllModal } from '../components/ClearAllModal';
import { MenuItem } from '../components/MenuItem';
import { menuItems } from '../src/data/menuItems';
import { COLORS } from '../src/theme';
import { saveSale } from '../services/storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // <-- Added MaterialCommunityIcons
import type { OrderItem } from '../types';
import { PasswordModal } from '../components/PasswordModal';
// --- Keep original table name import ---
// Note: If reset doesn't work, the issue IS in this file or the import path/export name.
import { getTableNames, saveTableName } from '../services/tableNames';

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
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Keep original Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const currentOrderItems = tableOrders[currentTable] || {};

  const handleClearAll = () => {
    // Keep original logic
    setClearModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Keep Haptics
  };

  const confirmClearAll = () => {
    // Keep original logic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTableOrders(prev => ({
      ...prev,
      [currentTable]: {},
    }));
    setClearModalVisible(false);
  };

  // --- Keep original handlers, wrapped in useCallback ---
  const handleIncrement = useCallback((itemId: string) => {
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
          [itemId]: { ...item, quantity: (existing?.quantity || 0) + 1 },
        },
      };
    });
  }, [currentTable]);

  const handleDecrement = useCallback((itemId: string) => {
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
        newItems[itemId] = { ...existing, quantity: newQuantity };
      }
      return { ...prev, [currentTable]: newItems };
    });
  }, [currentTable]);

  const handleTableChange = (tableNumber: number) => {
    // Keep original logic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Keep Haptics
    setCurrentTable(tableNumber);
  };

  const handleCheckout = () => {
    // Keep original logic
    if (itemCount === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const items = Object.values(currentOrderItems).filter(item => item.quantity > 0);
    router.push({
      pathname: "/bill",
      params: {
        items: JSON.stringify(items),
        total: total.toString(),
        tableNumber: currentTable.toString() // Ensure consistency
      }
    });
  };

  const handleViewSalesHistory = () => {
    // Keep original logic
    setPasswordModalVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Keep Haptics
  };

  const handlePasswordSuccess = () => {
    // Keep original logic
    setPasswordModalVisible(false);
    router.push('/sales-history');
  };

  // Keep original handleSaveOrder - if you remove it, ensure saving happens elsewhere
  const handleSaveOrder = async () => {
    if (itemCount === 0 || saveInProgress) return;
    setSaveInProgress(true);
    try {
      const { getTableNames, saveTableName } = await import('../services/tableNames');
      const currentTableName = (await getTableNames())[currentTable] || `Mesa ${currentTable}`;
      await saveSale(currentTable, orderItemsList, total);
      if (currentTableName !== `Mesa ${currentTable}`) {
        await saveTableName(currentTable, `Mesa ${currentTable}`);
      }
      setTableOrders(prev => ({ ...prev, [currentTable]: {} }));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving order:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaveInProgress(false);
    }
  };

  // --- Keep original calculations, wrapped in useMemo ---
  const orderItemsList = Object.values(currentOrderItems).filter(item => item.quantity > 0);
  const { total, itemCount } = useMemo(() => {
    let calculatedTotal = 0;
    let calculatedCount = 0;
    for (const item of orderItemsList) {
        const price = typeof item.price === 'number' ? item.price : 0;
        const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
        calculatedTotal += price * quantity;
        calculatedCount += quantity;
    }
    return { total: calculatedTotal, itemCount: calculatedCount };
}, [orderItemsList]);


  // --- Keep original reset function state and handler ---
  const [resetTableNamesFunc, setResetTableNamesFunc] = useState<() => Promise<void>>(() => async () => {});
  const handleResetTableNames = async () => {
    // Keep original logic - relies on TableTabs passing the actual reset function via onResetNames
    try {
      if (typeof resetTableNamesFunc === 'function') {
         // --- ALERT ---
         // This approach relies on TableTabs correctly importing and passing the *actual* reset function.
         // The previous error suggests this might be where the problem lies.
         // If TableTabs cannot access `resetAllTableNames` from `tableNames.ts`, this will fail.
         await resetTableNamesFunc();
         Alert.alert('Nombres Restablecidos', 'Los nombres de las mesas han sido restablecidos.');
      } else {
        console.error('Reset function is not set correctly via TableTabs onResetNames prop');
        Alert.alert('Error', 'La función para restablecer no está configurada.');
      }
    } catch (error) {
      console.error('Error resetting table names via passed function:', error);
       Alert.alert('Error', 'No se pudieron restablecer los nombres.');
    }
  };


  const handleOpenWeightCalculator = () => {
    // Keep original logic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Keep Haptics
    router.push('/weight-calculator');
  };

   // --- Render Item for FlatList (with Animation) ---
   const renderMenuItem = useCallback(({ item, index }: { item: typeof menuItems[0], index: number }) => (
    // --- ACTION REQUIRED ---
    // TEXT ERROR: Check INSIDE the MenuItem component's render method.
    <Animatable.View
      animation="fadeInUp"
      duration={400}
      delay={index * 50}
      useNativeDriver={Platform.OS !== 'web'}
      style={styles.menuItemContainer}
    >
      <MenuItem // Ensure MenuItem itself is okay
        item={item}
        quantity={currentOrderItems[item.id]?.quantity || 0}
        onIncrement={() => handleIncrement(item.id)}
        onDecrement={() => handleDecrement(item.id)}
      />
    </Animatable.View>
  ), [currentOrderItems, handleIncrement, handleDecrement]); // Keep dependencies


  return (
    <View style={styles.container}>
      {/* Status bar with dark text for light background, keep translucent */}
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      {/* Keep original statusBarSpace but use light background */}
      <View style={styles.statusBarSpace} />

      <SafeAreaView style={styles.safeArea}>

        {/* Original Header Structure with updated styles */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>La aaaGota de Oro</Text>
            <Text style={styles.subtitle}>Auténtica barbacoa mexicana</Text>
          </View>

          <View style={styles.headerButtons}>
             {/* Reset Names Button */}
             <TouchableOpacity
                onPress={handleResetTableNames}
                style={styles.iconButton} // Use updated style
            >
                {/* Use Material Community Icon */}
                <MaterialCommunityIcons name="eraser-variant" size={22} color={COLORS.textSubtle} />
            </TouchableOpacity>

            {/* History Button */}
            <TouchableOpacity
                onPress={handleViewSalesHistory}
                style={styles.iconButton} // Use updated style
            >
                <Ionicons name="time-outline" size={22} color={COLORS.textSubtle} />
            </TouchableOpacity>

            {/* Weight Calc Button */}
            <TouchableOpacity
                onPress={handleOpenWeightCalculator}
                style={styles.iconButton} // Use updated style
            >
                <Ionicons name="scale-outline" size={22} color={COLORS.textSubtle} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- ACTION REQUIRED --- */}
        {/* TEXT ERROR / TABLE SELECTION: Check INSIDE TableTabs component */}
        <TableTabs
          currentTable={currentTable}
          onTableChange={handleTableChange}
          onResetNames={setResetTableNamesFunc} // Keep original prop passing
        />

        {/* Keep original Animated.View wrapping FlatList */}
        <Animated.View style={{
          flex: 1,
          opacity: fadeAnim, // Keep original animations if desired
          transform: [{ scale: scaleAnim }] // Keep original animations if desired
        }}>
          <FlatList
            data={menuItems}
            keyExtractor={item => item.id}
            numColumns={3}
            renderItem={renderMenuItem} // Use animated render function
            contentContainerStyle={styles.listContentContainer} // Use updated padding style
            showsVerticalScrollIndicator={false}
            initialNumToRender={12} // Keep optimizations
            maxToRenderPerBatch={10}
            windowSize={10}
          />
        </Animated.View>

        {/* Animated Order Summary */}
        {itemCount > 0 && (
          // --- ACTION REQUIRED ---
          // TEXT ERROR: Check INSIDE EnhancedOrderSummary component
          <Animatable.View animation="slideInUp" duration={300} useNativeDriver={true}>
              <EnhancedOrderSummary
                total={total}
                itemCount={itemCount}
                onCheckout={handleCheckout}
                onClearAll={handleClearAll}
              />
          </Animatable.View>
        )}

        {/* Keep original modals */}
        <ClearAllModal
          visible={clearModalVisible}
          onClose={() => setClearModalVisible(false)}
          onConfirm={confirmClearAll}
        />
        <PasswordModal
          visible={passwordModalVisible}
          onSuccess={handlePasswordSuccess}
          onCancel={() => setPasswordModalVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

// --- Styles --- (Applied visual changes)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background, // Use light theme background
    // paddingTop: 0, // Not needed if using statusBarSpace
  },
  safeArea: {
    flex: 1,
  },
  // Updated Header Style
  header: {
    paddingTop: 10, // Keep original vertical padding structure (adjust value if needed)
    paddingBottom: 10,
    paddingHorizontal: 16, // Use consistent horizontal padding
    backgroundColor: COLORS.background, // Light background
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 22, // Keep original size
    fontWeight: '700',
    color: COLORS.primary, // Keep primary title color
  },
  subtitle: {
    fontSize: 13, // Keep original size
    color: COLORS.textLight, // Keep subtitle color
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Updated Icon Button Style
  iconButton: {
    width: 40, // Keep original size or adjust
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Keep original spacing or adjust
    borderRadius: 20, // Make circular
    backgroundColor: COLORS.cardLight, // Very light button background
  },
  // Updated statusBarSpace Style
  statusBarSpace: {
    height: Platform.OS === 'android' ? 25 : 40, // Adjust height as needed for different platforms
    backgroundColor: COLORS.background, // Use light background color
    width: '100%',
  },
  listContentContainer: { // Renamed from 'list'
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 180, // Keep generous bottom padding
  },
  menuItemContainer: { // Style for column layout
    flex: 1 / 3,
    padding: 4,
  },
});