import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../theme/app_colors.dart';
import '../services/haptic_service.dart';
import '../utils/responsive_utils.dart';
import '../utils/performance_utils.dart';

class EnhancedOrderSummary extends StatefulWidget {
  final double total;
  final int itemCount;
  final VoidCallback onCheckout;
  final VoidCallback onClearAll;

  const EnhancedOrderSummary({
    Key? key,
    required this.total,
    required this.itemCount,
    required this.onCheckout,
    required this.onClearAll,
  }) : super(key: key);

  @override
  State<EnhancedOrderSummary> createState() => _EnhancedOrderSummaryState();
}

class _EnhancedOrderSummaryState extends State<EnhancedOrderSummary>
    with SingleTickerProviderStateMixin {
  static const Color dollarGreen = Color(0xFF2E8B57);
  late AnimationController _totalAnimController;
  late Animation<double> _totalScaleAnimation;
  double _previousTotal = 0;

  @override
  void initState() {
    super.initState();
    _totalAnimController = AnimationController(
      duration: PerformanceUtils.getOptimizedDuration(
        baseIf60Hz: const Duration(milliseconds: 250),
        baseIf120Hz: const Duration(milliseconds: 300),
      ),
      vsync: this,
    );
    _totalScaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.08, // Reduced scale for smoother animation
    ).animate(CurvedAnimation(
      parent: _totalAnimController,
      curve: PerformanceUtils.getOptimizedCurve(
        baseIf60Hz: Curves.easeOutCubic,
        baseIf120Hz: Curves.elasticOut,
      ),
    ));
    _previousTotal = widget.total;
  }

  @override
  void didUpdateWidget(EnhancedOrderSummary oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.total != _previousTotal) {
      _totalAnimController.forward().then((_) {
        _totalAnimController.reverse();
      });
      _previousTotal = widget.total;
    }
  }

  @override
  void dispose() {
    _totalAnimController.dispose();
    super.dispose();
  }

  void _handleCheckout() {    if (widget.itemCount > 0) {
      HapticService.medium();
      widget.onCheckout();
    }
  }

  void _handleClearAll() {
    if (widget.itemCount > 0) {
      HapticService.warning();
      widget.onClearAll();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: AppColors.card.withOpacity(0.95),
        borderRadius: BorderRadius.circular(20), // Reduced from 25
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            offset: const Offset(0, -2),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top section with total and clear button
          Container(
            padding: const EdgeInsets.all(12), // Reduced from 16
            child: Row(
              children: [
                // Total section
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12), // Reduced padding
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16), // Reduced from 20
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Total',
                          style: TextStyle(
                            fontSize: 12, // Reduced from 14
                            color: AppColors.textLight,
                          ),
                        ),
                        AnimatedBuilder(
                          animation: _totalScaleAnimation,
                          builder: (context, child) {
                            return Transform.scale(
                              scale: _totalScaleAnimation.value,
                              alignment: Alignment.centerLeft,
                              child: Text(
                                '\$${widget.total.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontSize: 18, // Reduced from 22
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.success,
                                ),
                              ),
                            );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                // Clear button
                if (widget.itemCount > 0)
                  InkWell(
                    onTap: _handleClearAll,
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 8, // Reduced from 12
                        horizontal: 12, // Reduced from 16
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16), // Reduced from 20
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.delete_outline,
                            size: 18, // Reduced from 20
                            color: AppColors.error,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'Limpiar Articulos',
                            style: TextStyle(
                              color: AppColors.error,
                              fontSize: 12, // Reduced from 14
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
          
          // Bottom section with item count and checkout button
          Container(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 12), // Reduced padding
            child: Row(
              children: [
                // Item count
                Icon(
                  Icons.shopping_cart_outlined,
                  size: 16, // Reduced from 18
                  color: AppColors.textSubtle,
                ),
                const SizedBox(width: 4),
                Text(
                  '${widget.itemCount} artículos',
                  style: TextStyle(
                    fontSize: 12, // Reduced from 14
                    color: AppColors.textSubtle,
                  ),
                ),
                const Spacer(),
                // Checkout button
                ElevatedButton(
                  onPressed: widget.itemCount > 0 ? _handleCheckout : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    disabledBackgroundColor: AppColors.subtle,
                    padding: const EdgeInsets.symmetric(
                      vertical: 10, // Reduced from 14
                      horizontal: 20, // Reduced from 24
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                    ),
                    elevation: 0,
                  ),
                  child: Row(
                    children: [
                      Text(
                        'Ver Cuenta',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 15, // Reduced from 18
                          fontWeight: FontWeight.w600, // Reduced from w700
                        ),
                      ),
                      const SizedBox(width: 6),
                      Icon(
                        Icons.receipt_outlined,
                        size: 18, // Reduced from 20
                        color: Colors.white,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().slideY(
      begin: 1.0,
      end: 0,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeOutCubic,
    ).fadeIn(
      duration: const Duration(milliseconds: 400),
    );
  }
}
