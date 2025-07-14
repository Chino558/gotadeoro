import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  Text,
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Animatable from 'react-native-animatable';
import { COLORS } from '../src/theme';

const TABLE_NAMES_KEY = '@table_names';

// Define colors locally or import from theme
const ORANGE_ACTIVE = '#FFA500'; // Vibrant Orange
const ORANGE_DARK = '#E69500'; // Darker Orange for border/shadow
const EDIT_HIGHLIGHT_BORDER = '#00BCD4'; // Cyan/Teal for editing border
const EDIT_HIGHLIGHT_UNDERLINE = '#0097A7'; // Darker Cyan/Teal for underline

interface TableTabsProps {
  currentTable: number;
  onTableChange: (table: number) => void;
  // Removed onResetNames prop
}

const getDefaultName = (table: number) => `Mesa ${table}`;

export function TableTabs({ currentTable, onTableChange }: TableTabsProps) {
  const [tableNames, setTableNames] = useState<{[key: number]: string}>({});
  const [editingTable, setEditingTable] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const activeTabRef = useRef<Animatable.View & View>(null);

  // Load names on mount - Now simpler
  const loadTableNames = useCallback(async () => {
    console.log("TableTabs: Loading names..."); // Add log
    try {
      const namesJson = await AsyncStorage.getItem(TABLE_NAMES_KEY);
      let loadedNames: { [key: number]: string } = {};
      if (namesJson) {
        loadedNames = JSON.parse(namesJson);
        console.log("TableTabs: Loaded names:", loadedNames);
      } else {
          console.log("TableTabs: No names found in storage.");
      }
      // Ensure default names exist if not loaded
      const defaultNames: { [key: number]: string } = {};
      [1, 2, 3, 4].forEach(num => {
        if (!loadedNames[num]) {
          defaultNames[num] = getDefaultName(num);
        }
      });
      setTableNames({ ...defaultNames, ...loadedNames }); // Merge defaults and loaded
    } catch (error) {
      console.error('Error loading table names:', error);
      const defaultNames: { [key: number]: string } = {};
       [1, 2, 3, 4].forEach(num => { defaultNames[num] = getDefaultName(num); });
       setTableNames(defaultNames);
    }
  }, []);

  useEffect(() => {
    loadTableNames();
    // Add listener or mechanism here if needed to refresh names after external reset
  }, []); // Removed dependency on potentially non-existent reset logic

  useEffect(() => {
    if (activeTabRef.current && !editingTable) {
      activeTabRef.current.pulse(600);
    }
  }, [currentTable, editingTable]);


  const handleTablePress = useCallback((table: number) => {
    if (editingTable === null) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onTableChange(table);
    }
  }, [editingTable, onTableChange]);

  const handleTableLongPress = useCallback((table: number) => {
     if (editingTable !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingTable(table);
    setNewName(tableNames[table] || getDefaultName(table));
  }, [tableNames, editingTable]);

  const saveTableNameLocal = useCallback(async (table: number) => {
    // Log input length for debugging
    console.log(`Table name input length: ${newName.length}`);
    let finalName = newName.trim();
    console.log(`Trimmed name length: ${finalName.length}`);
    if (!finalName) {
      finalName = getDefaultName(table);
    }
    // Check if name actually changed before saving
    if (finalName !== (tableNames[table] || getDefaultName(table))) {
        const updatedNames = { ...tableNames, [table]: finalName };
        setTableNames(updatedNames); // Optimistic UI update

        try {
            await AsyncStorage.setItem(TABLE_NAMES_KEY, JSON.stringify(updatedNames));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Error saving table name:', error);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            // Revert UI on error
            setTableNames(prev => ({...prev, [table]: tableNames[table] || getDefaultName(table)}));
        }
    } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Feedback even if no change
    }

    setEditingTable(null); // Exit editing mode regardless of save success/failure
    setNewName('');
    Keyboard.dismiss();
  }, [newName, tableNames]); // Removed loadTableNames dependency

  // Removed resetLocalStateAndStorage and related useEffect

  return (
    <View style={styles.container}>
      {[1, 2, 3, 4].map((table, index) => {
        const isActive = currentTable === table;
        const isEditingThis = editingTable === table;

        return (
          <Animatable.View
              key={`tab-anim-${table}`}
              ref={isActive ? activeTabRef : null}
              animation="fadeIn"
              duration={400}
              delay={index * 80}
              style={styles.tabWrapper}
              useNativeDriver={Platform.OS !== 'web'}
          >
              <Pressable
                style={({pressed}) => [
                    styles.tab,
                    !isActive && !isEditingThis && styles.inactiveTab,
                    isActive && !isEditingThis && styles.activeTab,
                    isEditingThis && styles.editingTab,
                    pressed && (isActive ? styles.activeTabPressed : styles.inactiveTabPressed)
                ]}
                onPress={() => handleTablePress(table)}
                onLongPress={() => handleTableLongPress(table)}
                delayLongPress={500}
                disabled={editingTable !== null && !isEditingThis}
              >
                {isEditingThis ? (
                  <TextInput
                    style={[
                      styles.input,
                      isActive ? styles.activeInputText : styles.inactiveInputText
                    ]}
                    value={newName}
                    onChangeText={setNewName}
                    onBlur={() => saveTableNameLocal(table)}
                    onSubmitEditing={() => saveTableNameLocal(table)}
                    autoFocus
                    maxLength={100} // Set an explicit, very generous character limit
                    selectTextOnFocus
                    underlineColorAndroid="transparent"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="restaurant"
                      size={16}
                      color={isActive ? 'white' : COLORS.textSubtle}
                      style={styles.tabIcon}
                    />
                    <Text
                      style={[
                          styles.tabText,
                          isActive ? styles.activeTabText : styles.inactiveTabText
                      ]}
                      numberOfLines={1}
                      ellipsizeMode='tail'
                    >
                      {tableNames[table] || getDefaultName(table)}
                    </Text>
                  </>
                )}
              </Pressable>
          </Animatable.View>
        );
      })}
    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  tabWrapper: {
    flex: 1,
    marginHorizontal: 5,
  },
  tab: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  inactiveTab: {
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.borderLight,
  },
  inactiveTabPressed: {
    backgroundColor: COLORS.border,
  },
  activeTab: {
    backgroundColor: ORANGE_ACTIVE,
    borderColor: ORANGE_DARK,
    shadowColor: ORANGE_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  activeTabPressed: {
      backgroundColor: ORANGE_DARK,
  },
  editingTab: {
      borderColor: EDIT_HIGHLIGHT_BORDER,
      borderWidth: 2,
      backgroundColor: COLORS.card, // Use light card background when editing
      shadowColor: EDIT_HIGHLIGHT_BORDER,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 3,
      elevation: 3,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
  inactiveTabText: {
    color: COLORS.textSubtle,
  },
  // Fix the text color for active tabs to match the input text color
  activeTabText: {
    color: 'white', // Changed from 'black' to 'white' to match the active state
  },
  
  // --- Input Style Adjustments ---
  input: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '95%',
    paddingHorizontal: 2,
    margin: 0,
    borderBottomWidth: 2,
    paddingVertical: Platform.OS === 'ios' ? 2 : 0,
    color: 'black', // Explicitly set input text color to black for visibility
  },
  
  inactiveInputText: {
    color: COLORS.text, // Ensure dark text on light card background
    borderBottomColor: EDIT_HIGHLIGHT_UNDERLINE,
  },
  
  activeInputText: {
    color: 'black', // Changed from 'white' to 'black' for better visibility
    borderBottomColor: 'rgba(0, 0, 0, 0.8)',
  },
  // height: 20, // Explicit height might help sometimes, adjust value
});