import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'; // Import haptics for feedback
import { COLORS } from '../src/theme';

const TABLE_NAMES_KEY = '@table_names';

interface TableTabsProps {
  currentTable: number;
  onTableChange: (table: number) => void;
  onResetNames?: (resetFn: () => Promise<void>) => void;
}

export function TableTabs({ currentTable, onTableChange, onResetNames }: TableTabsProps) {
  const [tableNames, setTableNames] = useState<{[key: number]: string}>({});
  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadTableNames();
  }, []);

  const loadTableNames = async () => {
    try {
      const names = await AsyncStorage.getItem(TABLE_NAMES_KEY);
      if (names) {
        setTableNames(JSON.parse(names));
      }
    } catch (error) {
      console.error('Error loading table names:', error);
    }
  };

  const handleTablePress = (table: number) => {
    onTableChange(table);
  };

  // New long press handler
  const handleTableLongPress = (table: number) => {
    // Provide haptic feedback to indicate the long press was registered
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Start editing the table name
    setEditingTable(table);
    setNewName(tableNames[table] || `Mesa ${table}`);
  };

  const saveTableName = async (table: number) => {
    if (newName.trim()) {
      const updatedNames = { ...tableNames, [table]: newName.trim() };
      setTableNames(updatedNames);
      await AsyncStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(updatedNames));
      
      // Provide haptic feedback to confirm saving
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditingTable(null);
  };

  const resetTableNames = async () => {
    setTableNames({});
    await AsyncStorage.removeItem(TABLE_NAMES_KEY);
    
    // Provide haptic feedback to confirm reset
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    if (onResetNames) {
      onResetNames(() => resetTableNames);
    }
  }, [onResetNames]);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((table) => (
        <Pressable
          key={table}
          style={[styles.tab, currentTable === table && styles.activeTab]}
          onPress={() => handleTablePress(table)}
          onLongPress={() => handleTableLongPress(table)} // Add long press handler
          delayLongPress={500} // Set delay to 500ms for long press
        >
          {editingTable === table ? (
            <TextInput
              style={[
                styles.input,
                currentTable === table ? styles.activeInputText : {}
              ]}
              value={newName}
              onChangeText={setNewName}
              onBlur={() => saveTableName(table)}
              onSubmitEditing={() => saveTableName(table)}
              autoFocus
            />
          ) : (
            <>
              <Ionicons 
                name="restaurant-outline" 
                size={16} 
                color={currentTable === table ? 'white' : COLORS.primary} 
                style={styles.tabIcon}
              />
              <Text style={[styles.tabText, currentTable === table && styles.activeTabText]}>
                {tableNames[table] || `Mesa ${table}`}
              </Text>
            </>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    padding: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 12,
    backgroundColor: COLORS.subtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  activeTabText: {
    color: 'white',
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  activeInputText: {
    color: 'white',
  },
});