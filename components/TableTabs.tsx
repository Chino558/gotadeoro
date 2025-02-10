import React from 'react';
import { StyleSheet, View, Pressable, Text } from 'react-native';
import { COLORS } from '../theme';

interface TableTabsProps {
  currentTable: number;
  onTableChange: (table: number) => void;
}

export function TableTabs({ currentTable, onTableChange }: TableTabsProps) {
  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((table) => (
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 8,
    shadowColor: '#000',
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
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
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
});