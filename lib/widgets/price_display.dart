import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../models/barbacoa_calculator.dart';

class PriceDisplay extends StatelessWidget {
  final double price;
  final double weight;
  final BarbacoaCalculator calculator;

  const PriceDisplay({
    Key? key,
    required this.price,
    required this.weight,
    required this.calculator,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Get screen width to adjust layout for smaller devices
    final screenWidth = MediaQuery.of(context).size.width;
    final isSmallScreen = screenWidth < 380; // S23 width is around 360dp
    
    return Container(
      constraints: BoxConstraints(
        minWidth: screenWidth * 0.85, // Ensure minimum width
      ),
      padding: EdgeInsets.symmetric(
        vertical: 24,
        horizontal: isSmallScreen ? 20 : 32, // Reduce padding on small screens
      ),
      decoration: BoxDecoration(
        color: AppColors.primary,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: AppColors.primary.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          Text(
            'Total a pagar',
            style: TextStyle(
              color: AppColors.card.withOpacity(0.9),
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              calculator.formatPrice(price),
              style: TextStyle(
                color: AppColors.card,
                fontSize: isSmallScreen ? 42 : 48, // Smaller font on small screens
                fontWeight: FontWeight.bold,
                letterSpacing: -1,
              ),
              maxLines: 1,
              overflow: TextOverflow.visible,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.scale,
                color: AppColors.card.withOpacity(0.9),
                size: 18,
              ),
              const SizedBox(width: 8),
              Text(
                calculator.formatWeight(weight),
                style: TextStyle(
                  color: AppColors.card.withOpacity(0.9),
                  fontSize: 18,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
