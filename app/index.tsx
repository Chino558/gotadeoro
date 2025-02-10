import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { MenuItem } from '../components/MenuItem';
import { OrderSummary } from '../components/OrderSummary';
import { TableTabs } from '../components/TableTabs';
import { menuItems } from '../data/menuItems';
import { COLORS } from '../theme';

export default function HomeScreen() {
  // ... rest of your component code ...

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>La Gota de Oro</Text>
      </View>
      
      <TableTabs
        currentTable={currentTable}
        onTableChange={setCurrentTable}
      />

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

      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => {
          router.push({
            pathname: '/bill',
            params: {
              tableNumber: currentTable,
              items: encodeURIComponent(JSON.stringify(orderItemsList)),
              total: total
            }
          });
        }}
      />
    </View>
  );
}

// ... styles remain the same ...