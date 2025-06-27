import 'package:flutter/foundation.dart';

@immutable
class CalculatorSettings {
  final double pricePerKilo;
  final String businessPhone;
  final String businessName;
  final bool enableHaptics;
  final bool enableAnimations;

  const CalculatorSettings({
    this.pricePerKilo = 700.0,
    this.businessPhone = '+521234567890',
    this.businessName = 'Barbacoa El Sabor',
    this.enableHaptics = true,
    this.enableAnimations = true,
  });

  CalculatorSettings copyWith({
    double? pricePerKilo,
    String? businessPhone,
    String? businessName,
    bool? enableHaptics,
    bool? enableAnimations,
  }) {
    return CalculatorSettings(
      pricePerKilo: pricePerKilo ?? this.pricePerKilo,
      businessPhone: businessPhone ?? this.businessPhone,
      businessName: businessName ?? this.businessName,
      enableHaptics: enableHaptics ?? this.enableHaptics,
      enableAnimations: enableAnimations ?? this.enableAnimations,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'pricePerKilo': pricePerKilo,
      'businessPhone': businessPhone,
      'businessName': businessName,
      'enableHaptics': enableHaptics,
      'enableAnimations': enableAnimations,
    };
  }

  factory CalculatorSettings.fromJson(Map<String, dynamic> json) {
    return CalculatorSettings(
      pricePerKilo: json['pricePerKilo'] ?? 700.0,
      businessPhone: json['businessPhone'] ?? '+521234567890',
      businessName: json['businessName'] ?? 'Barbacoa El Sabor',
      enableHaptics: json['enableHaptics'] ?? true,
      enableAnimations: json['enableAnimations'] ?? true,
    );
  }
}
