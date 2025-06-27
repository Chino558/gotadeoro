import 'package:flutter/material.dart';
import '../models/order_item.dart';
import '../data/menu_items.dart';

class OrderProvider extends ChangeNotifier {
  // Table orders mapped by table number
  Map<int, Map<String, OrderItem>> _tableOrders = {
    1: {},
    2: {},
    3: {},
    4: {},
  };
  
  int _currentTable = 1;
  bool _saveInProgress = false;
  
  Map<String, OrderItem> get currentOrderItems => _tableOrders[_currentTable] ?? {};
  int get currentTable => _currentTable;
  bool get saveInProgress => _saveInProgress;
  
  List<OrderItem> get orderItemsList {
    return currentOrderItems.values.where((item) => item.quantity > 0).toList();
  }
  
  double get total {
    double calculatedTotal = 0;
    for (final item in orderItemsList) {
      calculatedTotal += item.price * item.quantity;
    }
    return calculatedTotal;
  }
  
  int get itemCount {
    int count = 0;
    for (final item in orderItemsList) {
      count += item.quantity;
    }
    return count;
  }
  
  void setCurrentTable(int tableNumber) {
    _currentTable = tableNumber;
    notifyListeners();
  }
  
  void incrementItem(String itemId) {
    final item = menuItems.firstWhere((i) => i.id == itemId);
    final currentItems = _tableOrders[_currentTable] ?? {};
    final existing = currentItems[itemId];
    
    _tableOrders[_currentTable] = {
      ...currentItems,
      itemId: item.copyWith(quantity: (existing?.quantity ?? 0) + 1),
    };
    notifyListeners();
  }
  
  void decrementItem(String itemId) {
    final currentItems = _tableOrders[_currentTable] ?? {};
    final existing = currentItems[itemId];
    
    if (existing == null || existing.quantity <= 0) return;
    
    final newQuantity = existing.quantity - 1;
    final newItems = Map<String, OrderItem>.from(currentItems);
    
    if (newQuantity == 0) {
      newItems.remove(itemId);
    } else {
      newItems[itemId] = existing.copyWith(quantity: newQuantity);
    }
    
    _tableOrders[_currentTable] = newItems;
    notifyListeners();
  }
  
  void clearCurrentTable() {
    _tableOrders[_currentTable] = {};
    notifyListeners();
  }
  
  void setSaveInProgress(bool value) {
    _saveInProgress = value;
    notifyListeners();
  }
}
