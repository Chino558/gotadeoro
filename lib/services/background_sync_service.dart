import 'dart:async';
import 'storage_service.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class BackgroundSyncService {
  static Timer? _syncTimer;
  static StreamSubscription<ConnectivityResult>? _connectivitySubscription;
  
  // Start background sync - checks every 30 seconds
  static void startBackgroundSync() {
    print('Starting background sync service');
    
    // Cancel existing timer if any
    _syncTimer?.cancel();
    
    // Set up periodic sync every 30 seconds
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (timer) async {
      print('Background sync timer triggered');
      await StorageService.processPendingSyncs();
    });
    
    // Also sync when connectivity changes
    _connectivitySubscription?.cancel();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((ConnectivityResult result) async {
      if (result != ConnectivityResult.none) {
        print('Network connection detected, triggering sync');
        await StorageService.processPendingSyncs();
      }
    });
    
    // Do an immediate sync on start (with a small delay to ensure everything is initialized)
    Future.delayed(const Duration(seconds: 2), () {
      StorageService.processPendingSyncs();
    });
  }
  
  // Stop background sync
  static void stopBackgroundSync() {
    print('Stopping background sync service');
    _syncTimer?.cancel();
    _syncTimer = null;
    _connectivitySubscription?.cancel();
    _connectivitySubscription = null;
  }
  
  // Check if background sync is running
  static bool isRunning() {
    return _syncTimer != null && _syncTimer!.isActive;
  }
}