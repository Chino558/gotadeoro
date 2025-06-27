import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class TableNamesService {
  static const String tableNamesKey = 'table_names';
  
  static Future<Map<int, String>> getTableNames() async {
    final prefs = await SharedPreferences.getInstance();
    final namesJson = prefs.getString(tableNamesKey);
    
    if (namesJson != null) {
      final decoded = Map<String, dynamic>.from(json.decode(namesJson));
      final result = <int, String>{};
      decoded.forEach((key, value) {
        result[int.parse(key)] = value.toString();
      });
      return result;
    }
    
    // Return default names
    return {
      1: 'Mesa 1',
      2: 'Mesa 2',
      3: 'Mesa 3',
      4: 'Mesa 4',
    };
  }
  
  static Future<void> saveTableName(int tableNumber, String name) async {
    final prefs = await SharedPreferences.getInstance();
    final currentNames = await getTableNames();
    currentNames[tableNumber] = name;
    
    final encoded = <String, String>{};
    currentNames.forEach((key, value) {
      encoded[key.toString()] = value;
    });
    
    await prefs.setString(tableNamesKey, json.encode(encoded));
  }
  
  static Future<void> resetAllTableNames() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(tableNamesKey);
  }
}
