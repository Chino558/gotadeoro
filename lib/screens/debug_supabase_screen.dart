import 'package:flutter/material.dart';
import 'dart:convert';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';

class DebugSupabaseScreen extends StatefulWidget {
  const DebugSupabaseScreen({super.key});

  @override
  State<DebugSupabaseScreen> createState() => _DebugSupabaseScreenState();
}

class _DebugSupabaseScreenState extends State<DebugSupabaseScreen> {
  String _logs = '';
  bool _isLoading = false;

  void _addLog(String message) {
    setState(() {
      _logs += '${DateTime.now().toIso8601String()}: $message\n\n';
    });
  }

  Future<void> _testSupabaseConnection() async {
    setState(() {
      _isLoading = true;
      _logs = '';
    });

    try {
      _addLog('Testing Supabase connection...');
      
      // Check if Supabase is initialized
      try {
        final client = SupabaseService.supabase;
        _addLog('✅ Supabase client is initialized');
        _addLog('URL: ${SupabaseService.supabaseUrl}');
      } catch (e) {
        _addLog('❌ Supabase not initialized: $e');
        return;
      }

      // Check connection
      final connected = await SupabaseService.checkSupabaseConnection();
      _addLog('Connection check: ${connected ? "✅ Connected" : "❌ Not connected"}');

      // Check session
      final session = SupabaseService.supabase.auth.currentSession;
      if (session != null) {
        _addLog('✅ Session exists');
        _addLog('User ID: ${session.user.id}');
      } else {
        _addLog('⚠️ No session found');
        
        // Try to create anonymous session
        _addLog('Creating anonymous session...');
        try {
          final response = await SupabaseService.ensureSession();
          _addLog('✅ Anonymous session created');
        } catch (e) {
          _addLog('❌ Failed to create session: $e');
        }
      }

      // Test direct table access
      _addLog('Testing direct table access...');
      try {
        final response = await SupabaseService.supabase
            .from('sales')
            .select()
            .limit(1);
        _addLog('✅ Can access sales table');
        _addLog('Response: $response');
      } catch (e) {
        _addLog('❌ Cannot access sales table: $e');
        _addLog('This might mean:');
        _addLog('1. Table does not exist');
        _addLog('2. RLS policies are blocking access');
        _addLog('3. Anonymous access is not enabled');
      }

    } catch (e) {
      _addLog('❌ Unexpected error: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testSimpleInsert() async {
    setState(() {
      _isLoading = true;
    });

    try {
      _addLog('Testing simple insert...');
      
      final testData = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'table_number': 1,
        'table_name': 'Test Table',
        'items': [
          {
            'id': 'test1',
            'name': 'Test Item',
            'quantity': 1,
            'price': 10.0
          }
        ],
        'total': 10.0,
        'timestamp': DateTime.now().toIso8601String(),
        'local_date': DateTime.now().toIso8601String(),
      };

      _addLog('Inserting data: ${json.encode(testData)}');

      try {
        await SupabaseService.supabase
            .from('sales')
            .insert(testData);
        _addLog('✅ Insert successful!');
      } catch (e) {
        _addLog('❌ Insert failed: $e');
      }

    } catch (e) {
      _addLog('❌ Unexpected error: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkPendingSyncs() async {
    try {
      final pending = await StorageService.getPendingSyncs();
      final sales = await StorageService.getSales();
      
      _addLog('Local sales count: ${sales.length}');
      _addLog('Pending syncs: ${pending.length}');
      
      if (pending.isNotEmpty) {
        _addLog('Pending sync IDs: ${pending.join(', ')}');
      }
      
      // Show unsynced sales
      final unsyncedSales = sales.where((s) => !s.synced).toList();
      _addLog('Unsynced sales: ${unsyncedSales.length}');
      
      for (final sale in unsyncedSales) {
        _addLog('Sale ${sale.id}: Table ${sale.tableNumber}, Total: \$${sale.total}');
      }
    } catch (e) {
      _addLog('Error checking pending syncs: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Supabase'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: () {
              setState(() {
                _logs = '';
              });
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (_isLoading)
            const LinearProgressIndicator(),
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              children: [
                ElevatedButton(
                  onPressed: _isLoading ? null : _testSupabaseConnection,
                  child: const Text('Test Supabase Connection'),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: _isLoading ? null : _testSimpleInsert,
                  child: const Text('Test Simple Insert'),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: _isLoading ? null : _checkPendingSyncs,
                  child: const Text('Check Pending Syncs'),
                ),
              ],
            ),
          ),
          Expanded(
            child: Container(
              color: Colors.black12,
              padding: const EdgeInsets.all(8.0),
              child: SingleChildScrollView(
                child: SelectableText(
                  _logs.isEmpty ? 'Logs will appear here...' : _logs,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}