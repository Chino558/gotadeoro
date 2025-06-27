import 'package:flutter/material.dart';
import '../services/storage_service.dart';
import '../services/supabase_service.dart';
import '../models/order_item.dart';

class TestSupabaseSyncScreen extends StatefulWidget {
  const TestSupabaseSyncScreen({super.key});

  @override
  State<TestSupabaseSyncScreen> createState() => _TestSupabaseSyncScreenState();
}

class _TestSupabaseSyncScreenState extends State<TestSupabaseSyncScreen> {
  String _status = 'Ready to test';
  bool _isLoading = false;

  Future<void> _testSaveAndSync() async {
    setState(() {
      _isLoading = true;
      _status = 'Testing save and sync...';
    });

    try {
      // Create test order items
      final testItems = [
        OrderItem(
          id: 'test1',
          name: 'Test Item 1',
          category: 'Test',
          basePrice: 10.0,
          price: 10.0,
          imageUrl: '',
          isVegan: false,
          availableUpgrades: [],
          selectedUpgrades: [],
          quantity: 2,
        ),
        OrderItem(
          id: 'test2',
          name: 'Test Item 2',
          category: 'Test',
          basePrice: 15.0,
          price: 15.0,
          imageUrl: '',
          isVegan: false,
          availableUpgrades: [],
          selectedUpgrades: [],
          quantity: 1,
        ),
      ];

      // Save the sale
      final sale = await StorageService.saveSale(
        1, // Table number
        testItems,
        35.0, // Total
        tableName: 'Test Table',
      );

      setState(() {
        _status = 'Sale saved with ID: ${sale.id}\n'
            'Synced: ${sale.synced}\n'
            'Checking Supabase...';
      });

      // Wait a bit for sync
      await Future.delayed(const Duration(seconds: 2));

      // Check if it was synced
      final pending = await StorageService.getPendingSyncs();
      
      setState(() {
        _status += '\n\nPending syncs: ${pending.length}';
        if (sale.synced) {
          _status += '\n✅ Sale was synced to Supabase!';
        } else if (pending.contains(sale.id)) {
          _status += '\n⏳ Sale is pending sync (might be offline)';
        }
      });

    } catch (error) {
      setState(() {
        _status = 'Error: $error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _checkConnection() async {
    setState(() {
      _isLoading = true;
      _status = 'Checking connection...';
    });

    try {
      final isOnline = await StorageService.isOnline();
      final supabaseConnected = await SupabaseService.checkSupabaseConnection();
      
      setState(() {
        _status = 'Network: ${isOnline ? "✅ Online" : "❌ Offline"}\n'
            'Supabase: ${supabaseConnected ? "✅ Connected" : "❌ Not connected"}';
      });
    } catch (error) {
      setState(() {
        _status = 'Error: $error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _processPending() async {
    setState(() {
      _isLoading = true;
      _status = 'Processing pending syncs...';
    });

    try {
      await StorageService.processPendingSyncs();
      final pending = await StorageService.getPendingSyncs();
      
      setState(() {
        _status = 'Processing complete!\n'
            'Remaining pending syncs: ${pending.length}';
      });
    } catch (error) {
      setState(() {
        _status = 'Error: $error';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Supabase Sync'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Text(
                      'Status',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _status,
                      style: const TextStyle(fontSize: 14),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else ...[
              ElevatedButton(
                onPressed: _checkConnection,
                child: const Text('Check Connection'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _testSaveAndSync,
                child: const Text('Test Save & Sync'),
              ),
              const SizedBox(height: 8),
              ElevatedButton(
                onPressed: _processPending,
                child: const Text('Process Pending Syncs'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}