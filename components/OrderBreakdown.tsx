import React, { useCallback } from 'react'; // Added useCallback
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform, // Added Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable'; // Added Animatable
import { OrderItem } from '../types';
import { COLORS } from '../theme';

interface OrderBreakdownProps {
  visible: boolean;
  items: OrderItem[];
  onClose: () => void;
}

export function OrderBreakdown({ visible, items, onClose }: OrderBreakdownProps) {
  const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0); // Added checks for price/quantity

  // Use useCallback for item rendering
  const renderItem = useCallback((item: OrderItem, index: number) => (
    // --- ACTION REQUIRED ---
    // Check for text rendering errors within this mapped view if warnings persist
    <Animatable.View
        key={item.id}
        animation="fadeInUp"
        duration={300}
        delay={index * 40} // Stagger item animation
        useNativeDriver={Platform.OS !== 'web'}
    >
        <View style={styles.item}>
            <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            {/* Ensure quantity/price are in Text */}
            <Text style={styles.itemQuantity}>
                {item.quantity || 0} <Text style={styles.itemQuantityX}>×</Text> ${ (item.price || 0).toFixed(2)}
            </Text>
            </View>
            {/* Ensure item total is in Text */}
            <Text style={styles.itemTotal}>
            ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
            </Text>
        </View>
     </Animatable.View>
  ), []); // Empty dependency array as it only depends on item structure

  return (
    <Modal
      visible={visible}
      animationType="fade" // Fade the overlay
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Animate the content sliding up */}
        <Animatable.View
            animation="slideInUp"
            duration={400} // Adjust speed
            style={styles.content}
            useNativeDriver={Platform.OS !== 'web'} // slideInUp might not work well with native driver always
            >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Desglose de Cuenta</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={10}>
              <Ionicons name="close-outline" size={26} color={COLORS.textSubtle} />
            </Pressable>
          </View>

          {/* Item List */}
          <ScrollView style={styles.itemListScrollView} contentContainerStyle={styles.itemListContentContainer}>
            {items.map(renderItem)}
          </ScrollView>

          {/* Footer / Total */}
          <View style={styles.footer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
          </View>
        </Animatable.View>
      </View>
    </Modal>
  );
}

// --- Styles --- (Applied theme and refinements)
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end', // Aligns content to bottom
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Overlay color
  },
  // Updated Content Style
  content: {
    backgroundColor: COLORS.card, // Use card background
    borderTopLeftRadius: 16, // Consistent radius
    borderTopRightRadius: 16,
    maxHeight: '75%', // Limit height
    borderWidth: 1, // Add border for definition
    borderColor: COLORS.borderLight, // Light border
    borderBottomWidth: 0, // No bottom border needed here
    shadowColor: '#000', // Add shadow for elevation effect
    shadowOffset: { width: 0, height: -3 }, // Shadow pointing upwards
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10, // Elevation for Android
  },
  // Updated Header Style
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14, // Adjust padding
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
    backgroundColor: COLORS.background, // Use main background for header
    borderTopLeftRadius: 16, // Match container radius
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 17, // Adjusted size
    fontWeight: '600',
    color: COLORS.text, // Use standard text color
  },
  closeButton: {
    padding: 4, // Adjust hit slop area
  },
  // Item List Styles
  itemListScrollView: {
    // Max height is controlled by parent 'content' style
  },
  itemListContentContainer: {
    paddingHorizontal: 16, // Padding for items
    paddingBottom: 10, // Space at the bottom of scroll
  },
  // Updated Item Style
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align top
    paddingVertical: 10, // Adjust padding
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight, // Lighter border
  },
  itemInfo: {
    flex: 1, // Allow name to take space
    marginRight: 10,
  },
  itemName: {
    fontSize: 15, // Adjusted size
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 13, // Adjusted size
    color: COLORS.textSubtle,
  },
  itemQuantityX: {
    fontSize: 11,
    marginHorizontal: 2,
  },
  itemTotal: {
    fontSize: 15, // Match item name size
    fontWeight: '500',
    marginLeft: 16,
    color: COLORS.primary, // Use primary color
    paddingTop: 1, // Align text better
  },
  // Updated Footer Style
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16, // Adjust padding
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight, // Lighter border
    backgroundColor: COLORS.cardLight, // Slightly different background for footer
  },
  totalLabel: {
    fontSize: 17, // Adjusted size
    fontWeight: '600',
    color: COLORS.text,
  },
  totalAmount: {
    fontSize: 19, // Adjusted size
    fontWeight: '700',
    color: COLORS.primary,
  },
});