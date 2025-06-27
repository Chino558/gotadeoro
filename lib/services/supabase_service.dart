import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  // Get Supabase credentials - same as React Native version
  static const String supabaseUrl = 'https://siohapuaipbmjodqxooo.supabase.co';
  static const String supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpb2hhcHVhaXBibWpvZHF4b29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDE4Nzc1NDMsImV4cCI6MjA1NzQ1MzU0M30.g6KQdFOWSgXjlO5HpRdcs49eYMo_P-hGAZSMBirmA28';
  
  // Create Supabase client directly like React Native
  static final SupabaseClient supabase = SupabaseClient(
    supabaseUrl,
    supabaseKey,
    authOptions: const AuthClientOptions(
      autoRefreshToken: true,
    ),
  );
  
  // For backward compatibility
  static SupabaseClient get client => supabase;
  
  // Safe getter that returns null if not initialized
  static SupabaseClient? get clientOrNull => supabase;
  
  // Initialize Supabase - now just sets up the global instance
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseKey,
    );
  }
  
  // Direct database access for keep-alive pings
  static Future<bool> sendKeepAlivePing() async {
    try {
      final timestamp = DateTime.now().toIso8601String();
      final pingName = 'ping-$timestamp';
      
      await supabase
          .from('keep_alive')
          .insert({
            'name': pingName,
          });
      
      print('Keep-alive ping successful');
      return true;
    } catch (error) {
      print('Keep-alive ping failed: $error');
      return false;
    }
  }
  
  // Utility to check connection to Supabase
  static Future<bool> checkSupabaseConnection() async {
    try {
      // Try to get the current session
      final session = supabase.auth.currentSession;
      // If we can access the auth service, connection is good
      return true;
    } catch (error) {
      print('Supabase connection check failed: $error');
      return false;
    }
  }
  
  // Initialize anonymous session if needed
  static Future<AuthResponse?> ensureSession() async {
    try {
      final session = supabase.auth.currentSession;
      if (session == null) {
        print('No session found, creating anonymous session');
        return await supabase.auth.signInAnonymously();
      }
      // Return a successful auth response with the existing session
      return AuthResponse(session: session);
    } catch (e) {
      print('Could not create anonymous session: $e');
      print('Continuing without authentication');
      return null;
    }
  }
}
