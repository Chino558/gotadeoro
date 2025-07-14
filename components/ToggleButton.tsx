import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';

interface ToggleButtonProps {
  value: boolean;
  onToggle: () => void;
  label: string;
}

export const ToggleButton = ({ value, onToggle, label }: ToggleButtonProps) => {
  return (
    <TouchableOpacity 
      style={[styles.container, value ? styles.containerActive : styles.containerInactive]} 
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <Ionicons 
        name={value ? "cloud-done" : "cloud-offline"} 
        size={14} 
        color={value ? 'white' : COLORS.textLight} 
      />
      <Text style={[styles.label, value ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
  },
  containerActive: {
    backgroundColor: '#E0E0E0', // Light grey background
    borderColor: '#AAAAAA',
  },
  containerInactive: {
    backgroundColor: COLORS.subtle,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  labelActive: {
    color: 'white',
  },
  labelInactive: {
    color: COLORS.textLight,
  },
});
