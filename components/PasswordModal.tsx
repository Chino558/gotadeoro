import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Text, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/theme';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

const PASSWORD_KEY = '@gota_de_oro_admin_password';
const DEFAULT_PASSWORD = 'admin123'; // Default password

export const PasswordModal = ({ visible, onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const verifyPassword = async () => {
    setLoading(true);
    try {
      // Get stored password
      let storedPassword = await AsyncStorage.getItem(PASSWORD_KEY);
      
      // First-time setup if no password exists
      if (!storedPassword) {
        await AsyncStorage.setItem(PASSWORD_KEY, DEFAULT_PASSWORD);
        storedPassword = DEFAULT_PASSWORD;
      }
      
      // Compare passwords
      if (password === storedPassword) {
        onSuccess();
      } else {
        Alert.alert('Error', 'Contraseña incorrecta');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      Alert.alert('Error', 'No se pudo verificar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={24} color={COLORS.primary} />
          <Text style={styles.title}>Acceso Restringido</Text>
        </View>
        
        <Text style={styles.subtitle}>Ingrese la contraseña para ver las ventas</Text>
        
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor={COLORS.textLight}
        />
        
        <View style={styles.buttons}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={onCancel}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.accessButton, (!password || loading) && styles.buttonDisabled]} 
            onPress={verifyPassword}
            disabled={loading || !password}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.buttonText}>Acceder</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  content: {
    width: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 10,
  },
  subtitle: {
    marginBottom: 20,
    color: COLORS.textLight,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.text,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.subtle,
    marginRight: 10,
  },
  accessButton: {
    backgroundColor: COLORS.primary,
    marginLeft: 10,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
