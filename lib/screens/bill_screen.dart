import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import 'dart:async';
import '../models/order_item.dart';
import '../theme/app_colors.dart';
import '../services/storage_service.dart';
import '../services/whatsapp_service.dart';
import '../services/haptic_service.dart';
import '../services/phone_number_service.dart';
import '../utils/responsive_utils.dart';
import '../providers/order_provider.dart';
import '../widgets/success_overlay.dart';

class BillScreen extends StatefulWidget {
  final List<OrderItem> items;
  final double total;
  final int tableNumber;
  final bool viewOnly;
  final DateTime? timestamp;

  const BillScreen({
    Key? key,
    required this.items,
    required this.total,
    required this.tableNumber,
    this.viewOnly = false,
    this.timestamp,
  }) : super(key: key);

  @override
  State<BillScreen> createState() => _BillScreenState();
}
class _BillScreenState extends State<BillScreen> with TickerProviderStateMixin {
  final TextEditingController _paymentController = TextEditingController();
  bool _saving = false;
  bool _sharing = false;
  double? _changeAmount;
  bool _isPaymentInsufficient = false;
  String _phoneNumber = '';
  Timer? _longPressTimer;
  bool _isLongPressing = false;
  
  // Animation controllers for smoother performance
  late AnimationController _totalAnimationController;
  late AnimationController _changeAnimationController;
  late Animation<double> _totalScaleAnimation;
  late Animation<double> _changeSlideAnimation;
  
  // Quick payment amounts based on total
  List<double> _quickPaymentAmounts = [];
  
  // Performance optimized debouncer
  Timer? _paymentDebouncer;

  @override
  void initState() {
    super.initState();
    _loadPhoneNumber();
    _calculateQuickPaymentAmounts();
    
    // Initialize animations with 60Hz friendly durations
    _totalAnimationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    
    _changeAnimationController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    
    _totalScaleAnimation = Tween<double>(
      begin: 0.95,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _totalAnimationController,
      curve: Curves.easeOutCubic,
    ));
    
    _changeSlideAnimation = Tween<double>(
      begin: 1.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _changeAnimationController,
      curve: Curves.easeOutCubic,
    ));
    
    // Start initial animation
    _totalAnimationController.forward();
  }

  @override
  void dispose() {
    _paymentController.dispose();
    _longPressTimer?.cancel();
    _paymentDebouncer?.cancel();
    _totalAnimationController.dispose();
    _changeAnimationController.dispose();
    super.dispose();
  }
  void _calculateQuickPaymentAmounts() {
    // Smart quick payment suggestions based on total
    List<double> suggestions = [];
    double total = widget.total;
    
    // Round up to nearest convenient amounts
    if (total <= 100) {
      suggestions = [
        ((total / 50).ceil() * 50).toDouble(),
        ((total / 100).ceil() * 100).toDouble(),
        200,
      ];
    } else if (total <= 500) {
      suggestions = [
        ((total / 50).ceil() * 50).toDouble(),
        ((total / 100).ceil() * 100).toDouble(),
        500,
      ];
    } else {
      suggestions = [
        ((total / 100).ceil() * 100).toDouble(),
        ((total / 500).ceil() * 500).toDouble(),
        1000,
      ];
    }
    
    // Remove duplicates and sort
    suggestions = suggestions.toSet().toList()..sort();
    
    // Keep only 3 suggestions
    if (suggestions.length > 3) {
      suggestions = suggestions.take(3).toList();
    }
    
    setState(() {
      _quickPaymentAmounts = suggestions;
    });
  }

  Future<void> _loadPhoneNumber() async {
    final number = await PhoneNumberService.getPhoneNumber();
    if (mounted) {
      setState(() {
        _phoneNumber = number;
      });
    }
  }

  void _handlePaymentChange(String amount) {
    // Cancel previous debouncer
    _paymentDebouncer?.cancel();
    
    // Debounce for better performance on slower phones
    _paymentDebouncer = Timer(const Duration(milliseconds: 100), () {
      final numericAmount = amount.replaceAll(RegExp(r'[^0-9.]'), '');
      
      if (numericAmount.isNotEmpty) {
        final payment = double.tryParse(numericAmount);
        if (payment != null) {
          setState(() {
            if (payment >= widget.total) {
              _changeAmount = payment - widget.total;
              _isPaymentInsufficient = false;
              // Animate change amount appearing
              _changeAnimationController.forward();
            } else {
              _changeAmount = null;
              _isPaymentInsufficient = true;
              _changeAnimationController.reverse();
            }
          });
        }
      } else {
        setState(() {
          _changeAmount = null;
          _isPaymentInsufficient = false;
          _changeAnimationController.reverse();
        });
      }
    });
  }
  
  void _handleQuickPayment(double amount) {
    HapticService.light();
    _paymentController.text = amount.toStringAsFixed(0);
    _handlePaymentChange(amount.toString());
  }
  Future<void> _handleSave() async {
    // Don't save if payment is insufficient
    if (_isPaymentInsufficient && _paymentController.text.isNotEmpty) {
      HapticService.error();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('El pago es insuficiente. Total: \$${widget.total.toStringAsFixed(2)}'),
          backgroundColor: AppColors.error,
          duration: const Duration(seconds: 2),
        ),
      );
      return;
    }
    
    setState(() {
      _saving = true;
    });
    
    HapticService.success();
    
    try {
      await StorageService.saveSale(
        widget.tableNumber, 
        widget.items, 
        widget.total
      );
      
      if (mounted) {
        // Clear the current table order
        context.read<OrderProvider>().clearCurrentTable();
        
        // Show success overlay
        showDialog(
          context: context,
          barrierDismissible: false,
          barrierColor: Colors.transparent,
          builder: (context) => SuccessOverlay(
            message: 'Venta guardada',
            onComplete: () {
              Navigator.of(context).popUntil((route) => route.isFirst);
            },
          ),
        );
      }
    } catch (error) {
      HapticService.error();
      if (mounted) {
        setState(() {
          _saving = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Error al guardar la venta. Intente de nuevo.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    }
  }

  Future<void> _handleShareWhatsApp() async {
    setState(() {
      _sharing = true;
    });
    
    HapticService.success();
    
    try {
      await WhatsappService.sendOrderToWhatsApp(
        tableNumber: widget.tableNumber,
        items: widget.items,
        total: widget.total,
        phoneNumber: _phoneNumber,
      );
    } catch (error) {
      HapticService.error();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Error al compartir. Verifique WhatsApp.'),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _sharing = false;
        });
      }
    }
  }

  void _startLongPress() {
    setState(() {
      _isLongPressing = true;
    });
    
    _longPressTimer = Timer(const Duration(milliseconds: 900), () {
      HapticService.medium();
      _showPhoneNumberDialog();
      setState(() {
        _isLongPressing = false;
      });
    });
  }

  void _cancelLongPress() {
    _longPressTimer?.cancel();
    setState(() {
      _isLongPressing = false;
    });
  }
  void _showPhoneNumberDialog() {
    final phoneController = TextEditingController(text: _phoneNumber);
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
        ),
        title: const Text('Cambiar número de WhatsApp'),
        content: TextField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: InputDecoration(
            hintText: '+521234567890',
            labelText: 'Número de teléfono',
            prefixIcon: const Icon(Icons.phone),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () async {
              final newNumber = phoneController.text.trim();
              if (newNumber.isNotEmpty) {
                await PhoneNumberService.savePhoneNumber(newNumber);
                setState(() {
                  _phoneNumber = newNumber;
                });
                HapticService.success();
              }
              Navigator.pop(context);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            child: const Text('Guardar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isSmallScreen = ResponsiveUtils.isSmallScreen(context);
    final padding = ResponsiveUtils.getResponsivePadding(context);
    
    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(
          parent: AlwaysScrollableScrollPhysics(),
        ),
        slivers: [
          // Modern Sliver App Bar - Reduced height
          SliverAppBar(
            expandedHeight: 80, // Reduced from 120
            floating: false,
            pinned: true,
            backgroundColor: AppColors.card,
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back_ios_new, color: AppColors.primary, size: 20),
              onPressed: () => Navigator.pop(context),
            ),
            flexibleSpace: FlexibleSpaceBar(
              centerTitle: true,
              title: Text(
                'Mesa ${widget.tableNumber}',
                style: TextStyle(
                  color: AppColors.text,
                  fontWeight: FontWeight.w600,
                  fontSize: isSmallScreen ? 14 : 16, // Reduced
                ),
              ),
              background: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      AppColors.card,
                      AppColors.card.withOpacity(0.8),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),
          ),
          
          SliverToBoxAdapter(
            child: Column(
              children: [
                // Restaurant Header with improved styling - Compact version
                Container(
                  width: double.infinity,
                  padding: EdgeInsets.symmetric(vertical: 12, horizontal: padding.horizontal),
                  child: Column(
                    children: [
                      // Logo or Icon
                      Container(
                        width: 40, // Reduced from 60
                        height: 40, // Reduced from 60
                        margin: const EdgeInsets.only(bottom: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withOpacity(0.1),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.restaurant_menu,
                          color: AppColors.primary,
                          size: 24, // Reduced from 32
                        ),
                      ),
                      Text(
                        'La Gota de Oro',
                        style: TextStyle(
                          fontSize: ResponsiveUtils.getResponsiveFontSize(context, 20), // Reduced from 24
                          fontWeight: FontWeight.w900,
                          color: AppColors.text,
                          letterSpacing: 0.5,
                        ),
                      ),
                      Text(
                        'Cuenta',
                        style: TextStyle(
                          fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 16
                          color: AppColors.textLight,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                ).animate()
                  .fadeIn(duration: 600.ms)
                  .slideY(begin: -0.2, end: 0, duration: 600.ms),
                
                // Items Section with modern card design - Compact
                Container(
                  margin: EdgeInsets.symmetric(horizontal: padding.horizontal, vertical: 8),
                  child: Card(
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16), // Reduced from 20
                      side: BorderSide(
                        color: AppColors.border.withOpacity(0.1),
                        width: 1,
                      ),
                    ),
                    child: Container(
                      padding: const EdgeInsets.all(16), // Reduced from 20
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        gradient: LinearGradient(
                          colors: [
                            AppColors.card,
                            AppColors.card.withOpacity(0.95),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6), // Reduced from 8
                                decoration: BoxDecoration(
                                  color: AppColors.primaryLight.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Icon(
                                  Icons.receipt_long,
                                  color: AppColors.primary,
                                  size: 18, // Reduced from 20
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Artículos Ordenados',
                                style: TextStyle(
                                  fontSize: ResponsiveUtils.getResponsiveFontSize(context, 16), // Reduced from 18
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12), // Reduced from 20                          // Items list with improved design - Compact
                          ...widget.items.map((item) => Container(
                            margin: const EdgeInsets.only(bottom: 8), // Reduced from 12
                            padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 10), // Reduced padding
                            decoration: BoxDecoration(
                              color: AppColors.background.withOpacity(0.5),
                              borderRadius: BorderRadius.circular(10), // Reduced from 12
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    item.name,
                                    style: TextStyle(
                                      fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 15
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Text(
                                  '\$${item.price.toStringAsFixed(2)}',
                                  style: TextStyle(
                                    fontSize: ResponsiveUtils.getResponsiveFontSize(context, 13), // Reduced from 14
                                    color: AppColors.textLight,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 10, // Reduced from 12
                                    vertical: 4, // Reduced from 6
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppColors.primary.withOpacity(0.1),
                                    borderRadius: BorderRadius.circular(16), // Reduced from 20
                                  ),
                                  child: Text(
                                    '×${item.quantity}',
                                    style: TextStyle(
                                      fontSize: ResponsiveUtils.getResponsiveFontSize(context, 13), // Reduced from 14
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          )).toList(),
                        ],
                      ),
                    ),
                  ),
                ).animate()
                  .fadeIn(duration: 600.ms, delay: 200.ms)
                  .slideX(begin: -0.2, end: 0, duration: 600.ms),
                
                // Total Section with smooth animation - Compact
                AnimatedBuilder(
                  animation: _totalScaleAnimation,
                  builder: (context, child) {
                    return Transform.scale(
                      scale: _totalScaleAnimation.value,
                      child: Container(
                        margin: EdgeInsets.symmetric(horizontal: padding.horizontal, vertical: 8),
                        padding: const EdgeInsets.all(16), // Reduced from 20
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppColors.primary,
                              AppColors.primary.withOpacity(0.8),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16), // Reduced from 20
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withOpacity(0.3),
                              blurRadius: 15, // Reduced from 20
                              offset: const Offset(0, 8), // Reduced from 10
                            ),
                          ],
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Total:',
                              style: TextStyle(
                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 18), // Reduced from 20
                                fontWeight: FontWeight.w600,
                                color: Colors.white,
                              ),
                            ),
                            Text(
                              '\$${widget.total.toStringAsFixed(2)}',
                              style: TextStyle(
                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 24), // Reduced from 28
                                fontWeight: FontWeight.w900,
                                color: Colors.white,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
                // Payment Section - Compact
                if (!widget.viewOnly) ...[
                  Container(
                    margin: EdgeInsets.symmetric(horizontal: padding.horizontal, vertical: 8),
                    child: Card(
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16), // Reduced from 20
                        side: BorderSide(
                          color: AppColors.border.withOpacity(0.1),
                          width: 1,
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16), // Reduced from 20
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Pago Rápido',
                              style: TextStyle(
                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 16
                                fontWeight: FontWeight.w600,
                                color: AppColors.textLight,
                              ),
                            ),
                            const SizedBox(height: 10), // Reduced from 12
                            // Quick payment buttons with responsive layout
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: _quickPaymentAmounts.map((amount) => 
                                _buildQuickPaymentButton(amount)
                              ).toList(),
                            ),
                            const SizedBox(height: 16), // Reduced from 20
                            // Payment input with modern design
                            TextField(
                              controller: _paymentController,
                              keyboardType: TextInputType.number,
                              style: TextStyle(
                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 16), // Reduced from 18
                                fontWeight: FontWeight.w600,
                              ),
                              decoration: InputDecoration(
                                labelText: 'Monto recibido',
                                prefixText: '\$ ',
                                prefixStyle: TextStyle(
                                  fontSize: ResponsiveUtils.getResponsiveFontSize(context, 16), // Reduced from 18
                                  fontWeight: FontWeight.w600,
                                ),
                                filled: true,
                                fillColor: AppColors.background,
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12), // Reduced from 16
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: AppColors.primary,
                                    width: 2,
                                  ),
                                ),
                                errorBorder: _isPaymentInsufficient ? OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: AppColors.error,
                                    width: 2,
                                  ),
                                ) : null,
                              ),
                              onChanged: _handlePaymentChange,
                            ),
                            // Change amount with smooth animation
                            if (_changeAmount != null) ...[
                              const SizedBox(height: 12), // Reduced from 16
                              AnimatedBuilder(
                                animation: _changeSlideAnimation,
                                builder: (context, child) {
                                  return Transform.translate(
                                    offset: Offset(0, 20 * _changeSlideAnimation.value),
                                    child: Opacity(
                                      opacity: 1 - _changeSlideAnimation.value,
                                      child: Container(
                                        padding: const EdgeInsets.all(12), // Reduced from 16
                                        decoration: BoxDecoration(
                                          color: AppColors.success.withOpacity(0.1),
                                          borderRadius: BorderRadius.circular(12), // Reduced from 16
                                          border: Border.all(
                                            color: AppColors.success.withOpacity(0.3),
                                            width: 1,
                                          ),
                                        ),
                                        child: Row(
                                          children: [
                                            Icon(
                                              Icons.check_circle,
                                              color: AppColors.success,
                                              size: 20, // Reduced from 24
                                            ),
                                            const SizedBox(width: 10),
                                            Text(
                                              'Cambio:',
                                              style: TextStyle(
                                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 16
                                                color: AppColors.text,
                                              ),
                                            ),
                                            const Spacer(),
                                            Text(
                                              '\$${_changeAmount!.toStringAsFixed(2)}',
                                              style: TextStyle(
                                                fontSize: ResponsiveUtils.getResponsiveFontSize(context, 18), // Reduced from 22
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.success,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ).animate()
                    .fadeIn(duration: 600.ms, delay: 400.ms)
                    .slideY(begin: 0.2, end: 0, duration: 600.ms),
                  // Action Buttons Section - Compact
                  Padding(
                    padding: EdgeInsets.fromLTRB(padding.horizontal, 8, padding.horizontal, 20),
                    child: Column(
                      children: [
                        // Save Button with modern design
                        SizedBox(
                          width: double.infinity,
                          height: 48, // Reduced from 56
                          child: ElevatedButton(
                            onPressed: _saving ? null : _handleSave,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              foregroundColor: Colors.white,
                              elevation: 0,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12), // Reduced from 16
                              ),
                            ),
                            child: _saving
                                ? Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      SizedBox(
                                        width: 18, // Reduced from 20
                                        height: 18,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                        ),
                                      ),
                                      const SizedBox(width: 10),
                                      Text(
                                        'Guardando...',
                                        style: TextStyle(
                                          fontSize: ResponsiveUtils.getResponsiveFontSize(context, 16), // Reduced from 18
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.save_alt, size: 22), // Reduced from 24
                                      const SizedBox(width: 10),
                                      Text(
                                        'Guardar Venta',
                                        style: TextStyle(
                                          fontSize: ResponsiveUtils.getResponsiveFontSize(context, 16), // Reduced from 18
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                        const SizedBox(height: 10), // Reduced from 12
                        // Share WhatsApp button with modern design
                        SizedBox(
                          width: double.infinity,
                          height: 44, // Reduced from 48
                          child: GestureDetector(
                            onTapDown: (_) => _startLongPress(),
                            onTapUp: (_) {
                              _cancelLongPress();
                              if (!_isLongPressing && !_sharing) {
                                _handleShareWhatsApp();
                              }
                            },
                            onTapCancel: _cancelLongPress,
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              decoration: BoxDecoration(
                                color: _isLongPressing
                                    ? AppColors.success.withOpacity(0.1)
                                    : AppColors.card,
                                borderRadius: BorderRadius.circular(12), // Reduced from 16
                                border: Border.all(
                                  color: _isLongPressing
                                      ? AppColors.success
                                      : AppColors.border.withOpacity(0.2),
                                  width: _isLongPressing ? 2 : 1,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  if (_sharing)
                                    SizedBox(
                                      width: 18, // Reduced from 20
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                                      ),
                                    )
                                  else
                                    Icon(
                                      Icons.share,
                                      color: _isLongPressing ? AppColors.success : AppColors.text,
                                      size: 18, // Reduced from 20
                                    ),
                                  const SizedBox(width: 8),
                                  Text(
                                    _isLongPressing ? 'Mantén presionado...' : 'Compartir por WhatsApp',
                                    style: TextStyle(
                                      fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 15
                                      color: _isLongPressing ? AppColors.success : AppColors.text,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 6), // Reduced from 8
                        Text(
                          'Mantén presionado para cambiar número',
                          style: TextStyle(
                            fontSize: 11, // Reduced from 12
                            color: AppColors.textLight,
                          ),
                        ),
                      ],
                    ),
                  ).animate()
                    .fadeIn(duration: 600.ms, delay: 600.ms)
                    .slideY(begin: 0.2, end: 0, duration: 600.ms),
                ],
                const SizedBox(height: 20), // Reduced from 40
              ],
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildQuickPaymentButton(double amount) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => _handleQuickPayment(amount),
        borderRadius: BorderRadius.circular(10), // Reduced from 12
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10), // Reduced padding
          decoration: BoxDecoration(
            color: AppColors.primaryLight.withOpacity(0.1),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: AppColors.primary.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Text(
            '\$${amount.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: ResponsiveUtils.getResponsiveFontSize(context, 14), // Reduced from 16
              fontWeight: FontWeight.w600,
              color: AppColors.primary,
            ),
          ),
        ),
      ),
    );
  }
}