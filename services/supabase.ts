import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Get Supabase credentials from .env file
const supabaseUrl = 'https://siohapuaipbmjodqxooo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpb2hhcHVhaXBibWpvZHF4b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Nzc1NDMsImV4cCI6MjA1NzQ1MzU0M30.g6KQdFOWSgXjlO5HpRdcs49eYMo_P-hGAZSMBirmA28';

// Create Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: AsyncStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

// Direct database access for keep-alive pings (bypassing auth)
export const sendKeepAlivePing = async () => {
  try {
    const timestamp = new Date().toISOString();
    const pingName = `ping-${timestamp}`;
    
    // Use the correct schema and table name based on your Supabase setup
    const { error, data } = await supabase
      .from('public.keep_alive')
      .insert({ 
        name: pingName,
        // Don't specify id or random as they appear to be auto-generated
      });
    
    if (error) {
      console.error('Keep-alive ping failed:', error.message, error.details);
      return false;
    }
    
    console.log('Keep-alive ping successful');
    return true;
  } catch (error) {
    console.error('Keep-alive exception:', error);
    return false;
  }
};

// Utility to check connection to Supabase
// Alternative connection check that doesn't rely on specific tables
export const checkSupabaseConnection = async () => {
  try {
    // Just check if we can connect to Supabase at all
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection check failed:', error.message);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Supabase connection exception:', error);
    return false;
  }
};

// Initialize anonymous session if needed
export const ensureSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    console.log('No session found, creating anonymous session');
    return supabase.auth.signInAnonymously();
  }
  return { data: { session } };
};
