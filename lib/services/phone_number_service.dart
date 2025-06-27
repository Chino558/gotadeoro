import 'package:shared_preferences/shared_preferences.dart';

class PhoneNumberService {
  static const String phoneNumberKey = 'whatsapp_phone_number';
  static const String defaultPhoneNumber = '+525577983551';

  static Future<String> getPhoneNumber() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedNumber = prefs.getString(phoneNumberKey);
      return savedNumber ?? defaultPhoneNumber;
    } catch (e) {
      print('Error getting phone number: $e');
      return defaultPhoneNumber;
    }
  }

  static Future<bool> savePhoneNumber(String phoneNumber) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return await prefs.setString(phoneNumberKey, phoneNumber);
    } catch (e) {
      print('Error saving phone number: $e');
      return false;
    }
  }
}
