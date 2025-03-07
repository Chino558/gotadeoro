import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/theme';

const TABLE_NAMES_KEY = '@table_names';

interface TableTabsProps {
  currentTable: number;
  onTableChange: (table: number) => void;
  onResetNames?: (resetFn: () => Promise<void>) => void;
}

export function TableTabs({ currentTable, onTableChange, onResetNames }: TableTabsProps) {
  const [tableNames, setTableNames] = useState<{[key: number]: string}>({});
  const [tapCount, setTapCount] = useState<{[key: number]: number}>({});
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
    
    const currentCount = tapCount[table] || 0;
    const newCount = currentCount + 1;
    
    setTapCount({ ...tapCount, [table]: newCount });

    if (newCount === 3) {
      setEditingTable(table);
      setNewName(tableNames[table] || `Mesa ${table}`);
      setTapCount({ ...tapCount, [table]: 0 });
    }

    // Reset tap count after delay
    setTimeout(() => {
      setTapCount(prev => ({ ...prev, [table]: 0 }));
    }, 500);
  };

  const saveTableName = async (table: number) => {
    if (newName.trim()) {
      const updatedNames = { ...tableNames, [table]: newName.trim() };
      setTableNames(updatedNames);
      await AsyncStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(updatedNames));
    }
    setEditingTable(null);
  };

  const resetTableNames = async () => {
    setTableNames({});
    await AsyncStorage.removeItem(TABLE_NAMES_KEY);
  };

  useEffect(() => {
    if (onResetNames) {
      onResetNames(() => resetTableNames); // Ensure the function is passed correctly
    }
  }, [onResetNames]);

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((table) => (
        <Pressable
          key={table}
          style={[styles.tab, currentTable === table && styles.activeTab]}
          onPress={() => handleTablePress(table)}
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
            <Text style={[styles.tabText, currentTable === table && styles.activeTabText]}>
              {tableNames[table] || `Mesa ${table}`}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 8,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  activeTabText: {
    color: 'white',
  },
  input: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    width: '100%',
    padding: 0,
  },
  activeInputText: {
    color: 'white',
  },
});
