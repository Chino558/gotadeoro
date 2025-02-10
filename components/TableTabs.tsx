import React from 'react';
import { StyleSheet, ScrollView, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

interface TableTabsProps {
  tables: number[];
  currentTable: number;
  onTableChange: (table: number) => void;
  onAddTable: () => void;
}

export function TableTabs({ tables, currentTable, onTableChange, onAddTable }: TableTabsProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tables.map((table) => (
          <Pressable
            key={table}
            style={[
              styles.tab,
              currentTable === table && styles.activeTab
            ]}
            onPress={() => onTableChange(table)}
          >
            <Text style={[
              styles.tabText,
              currentTable === table && styles.activeTabText
            ]}>
              Mesa {table}
            </Text>
          </Pressable>
        ))}
        <Pressable
          style={styles.addButton}
          onPress={onAddTable}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.primary} />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  scrollContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: 'white',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
  },
});