import 'package:flutter/foundation.dart';

class BarbacoaCalculator {
  static const double defaultPricePerKilo = 700.0;

  final double pricePerKilo;
  final String businessPhone;
  final String businessName;

  const BarbacoaCalculator({
    this.pricePerKilo = defaultPricePerKilo,
    this.businessPhone = '+521234567890', // Default Mexican phone number
    this.businessName = 'Barbacoa El Sabor',
  });

  // Calculate price based on weight in grams
  double calculatePrice(double weightInGrams) {
    final weightInKilos = weightInGrams / 1000;
    return weightInKilos * pricePerKilo;
  }

  // Format weight for display with hysteresis to prevent unit flipping
  String formatWeight(double weightInGrams) {
    // Add hysteresis: switch to kg at 1000g, but switch back to g only below 950g
    // This prevents rapid unit switching when hovering around 1kg

    if (weightInGrams >= 1000) {
      final kilos = weightInGrams / 1000;
      if (kilos == kilos.truncate()) {
        return '${kilos.truncate()} kg';
      }
      // For values very close to 1kg (between 950g and 1050g), always show as kg
      if (weightInGrams >= 950 && weightInGrams <= 1050) {
        return '${kilos.toStringAsFixed(2)} kg';
      }
      return '${kilos.toStringAsFixed(2)} kg';
    } else if (weightInGrams >= 950) {
      // When between 950g and 999g, show as kg to prevent flipping
      final kilos = weightInGrams / 1000;
      return '${kilos.toStringAsFixed(2)} kg';
    } else {
      return '${weightInGrams.truncate()} gramos';
    }
  }

  // Format price for display
  String formatPrice(double price) {
    return '\$${price.toStringAsFixed(2)}';
  }

  // Generate WhatsApp message
  String generateWhatsAppMessage(double weightInGrams) {
    final price = calculatePrice(weightInGrams);
    final formattedWeight = formatWeight(weightInGrams);
    final formattedPrice = formatPrice(price);

    return '''¡Hola! 🌮
    
Me gustaría ordenar:
• Barbacoa: $formattedWeight
• Total: $formattedPrice

¿Está disponible para recoger?

Gracias,
$businessName''';
  }

  // Copy with new values
  BarbacoaCalculator copyWith({
    double? pricePerKilo,
    String? businessPhone,
    String? businessName,
  }) {
    return BarbacoaCalculator(
      pricePerKilo: pricePerKilo ?? this.pricePerKilo,
      businessPhone: businessPhone ?? this.businessPhone,
      businessName: businessName ?? this.businessName,
    );
  }
}
