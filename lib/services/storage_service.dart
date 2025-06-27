import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:convert';
import '../models/order_item.dart';
import 'supabase_service.dart';
import 'table_names_service.dart';

// SaleRecord matching React Native structure
class SaleRecord {
  final String id;
  final int tableNumber;
  final String tableName;
  final List<OrderItem> items;
  final double total;
  final int timestamp;
  final String date;
  bool synced;

  SaleRecord({
    required this.id,
    required this.tableNumber,
    required this.tableName,
    required this.items,
    required this.total,
    required this.timestamp,
    required this.date,
    this.synced = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'tableNumber': tableNumber,
      'tableName': tableName,
      'items': items.map((item) => item.toJson()).toList(),
      'total': total,
      'timestamp': timestamp,
      'date': date,
      'synced': synced,
    };
  }
  factory SaleRecord.fromJson(Map<String, dynamic> json) {
    return SaleRecord(
      id: json['id'],
      tableNumber: json['tableNumber'],
      tableName: json['tableName'],
      items: (json['items'] as List)
          .map((item) => OrderItem.fromJson(item))
          .toList(),
      total: json['total'].toDouble(),
      timestamp: json['timestamp'],
      date: json['date'],
      synced: json['synced'] ?? false,
    );
  }
}

class StorageService {
  // Storage keys matching React Native
  static const String salesStorageKey = 'la_gota_de_oro_sales';
  static const String pendingSyncKey = 'la_gota_de_oro_pending_syncs';
  static const String syncAttemptsKey = 'la_gota_de_oro_sync_attempts';
  static const int maxSyncAttempts = 3;

  // Check if online
  static Future<bool> isOnline() async {
    var connectivityResult = await Connectivity().checkConnectivity();
    return connectivityResult != ConnectivityResult.none;
  }

  // Sync a single sale to Supabase
  static Future<bool> syncSaleToSupabase(SaleRecord sale) async {
    try {
      // Clean items data to ensure proper JSON formatting
      final cleanItems = json.decode(json.encode(sale.items));
      
      print('Attempting to sync sale to Supabase: ${json.encode({
        'id': sale.id,
        'tableNumber': sale.tableNumber,
        'tableName': sale.tableName,
        'itemsCount': cleanItems?.length ?? 0
      })}');
      
      await SupabaseService.supabase
          .from('sales')
          .insert({
            'id': sale.id,
            'table_number': sale.tableNumber,
            'table_name': sale.tableName,
            'items': cleanItems,
            'total': sale.total,
            'timestamp': DateTime.fromMillisecondsSinceEpoch(sale.timestamp).toIso8601String(),
            'local_date': sale.date,
          });

      print('Sale synced successfully');
      return true;
    } catch (error) {
      print('Error syncing sale to Supabase: $error');
      return false;
    }
  }

  // Add a sale to the pending sync queue
  static Future<void> addToPendingSync(String saleId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingJson = prefs.getString(pendingSyncKey);
      final List<String> pending = pendingJson != null 
          ? List<String>.from(json.decode(pendingJson))
          : [];
      
      if (!pending.contains(saleId)) {
        pending.add(saleId);
        await prefs.setString(pendingSyncKey, json.encode(pending));
      }

      // Reset sync attempts for this sale
      final attemptsJson = prefs.getString(syncAttemptsKey);
      final Map<String, dynamic> attempts = attemptsJson != null 
          ? Map<String, dynamic>.from(json.decode(attemptsJson))
          : {};
      attempts[saleId] = 0;
      await prefs.setString(syncAttemptsKey, json.encode(attempts));
    } catch (error) {
      print('Error adding to pending sync: $error');
    }
  }
  // Remove a sale from the pending sync queue
  static Future<void> removeFromPendingSync(String saleId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingJson = prefs.getString(pendingSyncKey);
      if (pendingJson != null) {
        final List<String> pending = List<String>.from(json.decode(pendingJson));
        pending.removeWhere((id) => id == saleId);
        await prefs.setString(pendingSyncKey, json.encode(pending));
      }
      
      // Remove sync attempts for this sale
      final attemptsJson = prefs.getString(syncAttemptsKey);
      if (attemptsJson != null) {
        final Map<String, dynamic> attempts = Map<String, dynamic>.from(json.decode(attemptsJson));
        attempts.remove(saleId);
        await prefs.setString(syncAttemptsKey, json.encode(attempts));
      }
    } catch (error) {
      print('Error removing from pending sync: $error');
    }
  }

  // Increment sync attempts for a sale
  static Future<int> incrementSyncAttempts(String saleId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final attemptsJson = prefs.getString(syncAttemptsKey);
      final Map<String, dynamic> attempts = attemptsJson != null 
          ? Map<String, dynamic>.from(json.decode(attemptsJson))
          : {};
      
      // Initialize if not exists
      if (!attempts.containsKey(saleId)) {
        attempts[saleId] = 0;
      }
      
      // Increment
      attempts[saleId] = (attempts[saleId] as int) + 1;
      await prefs.setString(syncAttemptsKey, json.encode(attempts));
      
      return attempts[saleId] as int;
    } catch (error) {
      print('Error incrementing sync attempts: $error');
      return 0;
    }
  }
  // Get all pending syncs
  static Future<List<String>> getPendingSyncs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingJson = prefs.getString(pendingSyncKey);
      return pendingJson != null 
          ? List<String>.from(json.decode(pendingJson))
          : [];
    } catch (error) {
      print('Error getting pending syncs: $error');
      return [];
    }
  }

  // Process all pending syncs
  static Future<void> processPendingSyncs() async {
    if (!(await isOnline())) {
      print('Not online, skipping sync processing');
      return;
    }

    final pendingIds = await getPendingSyncs();
    print('Processing ${pendingIds.length} pending syncs');
    if (pendingIds.isEmpty) return;

    final allSales = await getSales();
    bool updateSales = false;
    
    for (final saleId in pendingIds) {
      SaleRecord? sale;
      try {
        sale = allSales.firstWhere((s) => s.id == saleId);
      } catch (e) {
        sale = null;
      }
      
      if (sale != null) {
        print('Syncing sale $saleId');
        final attemptCount = await incrementSyncAttempts(saleId);
        
        if (attemptCount > maxSyncAttempts) {
          print('Exceeded max attempts ($maxSyncAttempts) for sale $saleId, removing from queue');
          await removeFromPendingSync(saleId);
          continue;
        }
        
        final success = await syncSaleToSupabase(sale);
        if (success) {
          sale.synced = true;
          updateSales = true;
          await removeFromPendingSync(saleId);
        } else {
          print('Failed to sync sale $saleId, attempt $attemptCount/$maxSyncAttempts');
        }
      } else {
        print('Sale $saleId not found, removing from pending sync');
        await removeFromPendingSync(saleId);
      }
    }
    // Update all sales with sync status only if needed
    if (updateSales) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(salesStorageKey, json.encode(allSales.map((s) => s.toJson()).toList()));
    }
  }

  // Save a new sale to storage and Supabase (if online)
  static Future<SaleRecord> saveSale(
    int tableNumber, 
    List<OrderItem> items, 
    double total,
    {String? tableName}
  ) async {
    try {
      print('Saving sale: tableNumber=$tableNumber, itemsCount=${items.length}, total=$total');
      
      // Get existing sales
      final existingSales = await getSales();
      
      // Get table name from storage if not provided
      String actualTableName = tableName ?? '';
      if (actualTableName.isEmpty) {
        try {
          final tableNames = await TableNamesService.getTableNames();
          actualTableName = tableNames[tableNumber] ?? 'Mesa $tableNumber';
        } catch (error) {
          print('Error getting table name: $error');
          actualTableName = 'Mesa $tableNumber';
        }
      }
      
      // Create new sale record
      final now = DateTime.now();
      final newSale = SaleRecord(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        tableNumber: tableNumber,
        tableName: actualTableName,
        items: items,
        total: total,
        timestamp: now.millisecondsSinceEpoch,
        date: now.toIso8601String(),
        synced: false,
      );
      
      print('Created new sale record: ${newSale.id}');
      
      // Add new sale to existing sales
      existingSales.add(newSale);
      
      // Save to storage first
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(salesStorageKey, json.encode(existingSales.map((s) => s.toJson()).toList()));
      print('Saved sale to local storage');
      // Try to sync immediately if online
      final online = await isOnline();
      if (online) {
        print('Online, attempting immediate sync');
        final synced = await syncSaleToSupabase(newSale);
        if (synced) {
          newSale.synced = true;
          // Update in storage
          existingSales.last.synced = true;
          await prefs.setString(salesStorageKey, json.encode(existingSales.map((s) => s.toJson()).toList()));
          print('Updated sync status in storage');
        } else {
          // Add to pending sync if sync failed
          print('Sync failed, adding to pending');
          await addToPendingSync(newSale.id);
        }
      } else {
        // Add to pending sync if offline
        print('Offline, adding to pending sync');
        await addToPendingSync(newSale.id);
      }
      
      return newSale;
    } catch (error) {
      print('Error saving sale: $error');
      rethrow;
    }
  }

  // Get all sales from storage
  static Future<List<SaleRecord>> getSales() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final salesJson = prefs.getString(salesStorageKey);
      if (salesJson != null) {
        final List<dynamic> decoded = json.decode(salesJson);
        return decoded.map((sale) => SaleRecord.fromJson(sale)).toList();
      }
      return [];
    } catch (error) {
      print('Error getting sales: $error');
      return [];
    }
  }
  // Get all sales including processing pending syncs
  static Future<List<SaleRecord>> getSalesAndSync() async {
    try {
      // Try to process any pending syncs first
      await processPendingSyncs();
      return getSales();
    } catch (error) {
      print('Error in getSalesAndSync: $error');
      return getSales();
    }
  }

  // Clear all sales from storage (for admin purposes)
  static Future<void> clearAllSales() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(salesStorageKey);
      await prefs.remove(pendingSyncKey);
      await prefs.remove(syncAttemptsKey);
      
      // Also clear from Supabase if online
      if (await isOnline()) {
        try {
          await SupabaseService.supabase
              .from('sales')
              .delete()
              .gte('id', '0');
        } catch (e) {
          print('Could not clear Supabase data: $e');
        }
      }
    } catch (error) {
      print('Error clearing sales: $error');
      rethrow;
    }
  }

  // Get sales for a specific date range
  static Future<List<SaleRecord>> getSalesByDateRange(DateTime startDate, DateTime endDate) async {
    try {
      final allSales = await getSales();
      return allSales.where((sale) {
        final saleDate = DateTime.fromMillisecondsSinceEpoch(sale.timestamp);
        return saleDate.isAfter(startDate) && saleDate.isBefore(endDate);
      }).toList();
    } catch (error) {
      print('Error getting sales by date range: $error');
      return [];
    }
  }
  // Get sales for today
  static Future<List<SaleRecord>> getTodaySales() async {
    final today = DateTime.now();
    final startOfDay = DateTime(today.year, today.month, today.day);
    final tomorrow = startOfDay.add(const Duration(days: 1));
    
    return getSalesByDateRange(startOfDay, tomorrow);
  }

  // Get sales for current week (starting from Saturday)
  static Future<List<SaleRecord>> getCurrentWeekSales() async {
    final today = DateTime.now();
    // Calculate days since last Saturday (where Saturday is 6)
    int daysSinceSaturday = today.weekday;
    if (daysSinceSaturday < 6) {
      daysSinceSaturday = daysSinceSaturday + 1;
    } else {
      daysSinceSaturday = 0; // It's Saturday
    }
    
    final startDate = today.subtract(Duration(days: daysSinceSaturday));
    final startOfWeek = DateTime(startDate.year, startDate.month, startDate.day);
    final endDate = startOfWeek.add(const Duration(days: 7));
    
    return getSalesByDateRange(startOfWeek, endDate);
  }
}

// Backward compatibility - keep the old Sale class for existing code
class Sale {
  final DateTime date;
  final int tableNumber;
  final List<OrderItem> items;
  final double total;

  Sale({
    required this.date,
    required this.tableNumber,
    required this.items,
    required this.total,
  });

  Map<String, dynamic> toJson() {
    return {
      'date': date.toIso8601String(),
      'tableNumber': tableNumber,
      'items': items.map((item) => item.toJson()).toList(),
      'total': total,
    };
  }

  factory Sale.fromJson(Map<String, dynamic> json) {
    return Sale(
      date: DateTime.parse(json['date']),
      tableNumber: json['tableNumber'],
      items: (json['items'] as List)
          .map((item) => OrderItem.fromJson(item))
          .toList(),
      total: json['total'].toDouble(),
    );
  }
}