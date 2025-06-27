import 'package:flutter/material.dart';
import '../models/order_item.dart';
import '../theme/app_colors.dart';
import '../services/haptic_service.dart';
import '../utils/responsive_utils.dart';

class MenuItem extends StatelessWidget {
  final OrderItem item;
  final int quantity;
  final VoidCallback onIncrement;
  final VoidCallback onDecrement;

  const MenuItem({
    Key? key,
    required this.item,
    required this.quantity,
    required this.onIncrement,
    required this.onDecrement,
  }) : super(key: key);

  void _triggerHaptic() {
    HapticService.light();
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, constraints) {
        // Responsive card dimensions
        final isSmallScreen = ResponsiveUtils.isSmallScreen(context);
        final cardMinHeight = isSmallScreen ? 52.0 : 62.0; // Reduced from 58.0 : 70.0
        
        // Responsive font sizes
        final nameFontSize = ResponsiveUtils.getResponsiveFontSize(context, 9.5); // Reduced from 10.5
        final priceFontSize = ResponsiveUtils.getResponsiveFontSize(context, 11.5); // Reduced from 12.5
        
        // Responsive padding
        final cardPadding = isSmallScreen 
            ? const EdgeInsets.symmetric(vertical: 4, horizontal: 3)
            : const EdgeInsets.symmetric(vertical: 6, horizontal: 4);

        return GestureDetector(
          onTap: () {
            _triggerHaptic();
            onIncrement();
          },
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            constraints: BoxConstraints(
              minHeight: cardMinHeight,
              maxWidth: ResponsiveUtils.getMaxCardWidth(context),
            ),
            transform: Matrix4.identity()
              ..scale(quantity > 0 ? 1.02 : 1.0),
            transformAlignment: Alignment.center,
            decoration: BoxDecoration(
              gradient: quantity > 0 
                  ? LinearGradient(
                      colors: [
                        AppColors.primary.withOpacity(0.05),
                        AppColors.primary.withOpacity(0.02),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              color: quantity > 0 ? null : Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: quantity > 0 
                    ? AppColors.primary.withOpacity(0.6) 
                    : AppColors.border.withOpacity(0.3),
                width: quantity > 0 ? 2 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: quantity > 0 
                      ? AppColors.primary.withOpacity(0.15)
                      : Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: quantity > 0 ? 6 : 4,
                ),
              ],
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                // Content
                Container(
                  width: double.infinity,
                  padding: cardPadding,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      Text(
                        item.name,
                        style: TextStyle(
                          fontSize: nameFontSize,
                          fontWeight: quantity > 0 ? FontWeight.w600 : FontWeight.w500,
                          color: AppColors.text,
                          height: 1.1,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '\$${item.price.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: priceFontSize,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                
                // Quantity controls
                if (quantity > 0) ...[
                  // Minus button with expanded hit area
                  Positioned(
                    left: -10,
                    top: -10,
                    child: GestureDetector(
                      onTap: () {
                        _triggerHaptic();
                        onDecrement();
                      },
                      behavior: HitTestBehavior.translucent,
                      child: Container(
                        padding: const EdgeInsets.all(8), // Expanded hit area
                        child: Container(
                          width: isSmallScreen ? 22 : 26,
                          height: isSmallScreen ? 22 : 26,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              colors: [
                                AppColors.error,
                                AppColors.error.withOpacity(0.8),
                              ],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.error.withOpacity(0.3),
                                offset: const Offset(0, 2),
                                blurRadius: 4,
                              ),
                            ],
                          ),
                          child: Icon(
                            Icons.remove,
                            size: isSmallScreen ? 14 : 16,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                  ),
                  
                  // Quantity badge
                  Positioned(
                    right: -5,
                    top: -5,
                    child: Container(
                      width: isSmallScreen ? 19 : 22,
                      height: isSmallScreen ? 19 : 22,
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.primary,
                            AppColors.primary.withOpacity(0.8),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 1.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withOpacity(0.3),
                            offset: const Offset(0, 2),
                            blurRadius: 4,
                          ),
                        ],
                      ),
                      child: Center(
                        child: Text(
                          quantity.toString(),
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: isSmallScreen ? 9 : 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }
}
