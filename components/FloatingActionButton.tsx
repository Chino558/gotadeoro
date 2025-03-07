import React, { useRef, useEffect } from 'react';
import { 
  StyleSheet, 
  Pressable, 
  ViewStyle, 
  Animated, 
  Easing,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  icon?: 'add' | 'save-outline';
  loading?: boolean;
}

export function FloatingActionButton({
  onPress,
  style,
  icon = 'add',
  loading = false
}: FloatingActionButtonProps) {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Entry animation when component mounts
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate when loading state changes
  useEffect(() => {
    if (loading) {
      // Create continuous rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      // Stop rotation
      rotateAnim.setValue(0);
    }
  }, [loading]);

  const handlePress = () => {
    if (loading) return;
    
    // Trigger haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }),
    ]).start();
    
    onPress();
  };

  // Calculate rotation for animation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container, 
        style,
        {
          transform: [
            { scale: scaleAnim },
            { rotate: spin }
          ]
        },
        loading && styles.loadingContainer
      ]}
    >
      <Pressable 
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed
        ]} 
        onPress={handlePress}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <Ionicons name={icon} size={24} color="white" />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 16,
    bottom: 90, // Above the order summary
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#888',
  },
  button: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    backgroundColor: `${COLORS.primary}80`,
  },
});
