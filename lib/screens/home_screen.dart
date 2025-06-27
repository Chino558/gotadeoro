import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../providers/order_provider.dart';
import '../widgets/table_tabs.dart';
import '../widgets/enhanced_order_summary.dart';
import '../widgets/clear_all_modal.dart';
import '../widgets/menu_item.dart';
import '../widgets/password_modal.dart';
import '../data/menu_items.dart';
import '../theme/app_colors.dart';
import '../services/table_names_service.dart';
import '../services/haptic_service.dart';
import '../utils/responsive_utils.dart';
import '../utils/performance_utils.dart';
import 'bill_screen.dart';
import 'sales_history_screen.dart';
import 'weight_calculator_screen.dart';
import 'debug_supabase_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _clearModalVisible = false;
  bool _passwordModalVisible = false;
  int _debugTapCount = 0;
  bool _debugMode = false;

  void _handleClearAll() {
    HapticService.medium();
    setState(() {
      _clearModalVisible = true;    });
  }

  void _confirmClearAll() {
    HapticService.success();
    context.read<OrderProvider>().clearCurrentTable();
    setState(() {
      _clearModalVisible = false;
    });
  }

  void _handleCheckout() {
    final provider = context.read<OrderProvider>();
    if (provider.itemCount == 0) return;
    
    HapticService.success();
    
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => BillScreen(
          items: provider.orderItemsList,
          total: provider.total,
          tableNumber: provider.currentTable,
        ),
      ),
    );
  }

  void _handleViewSalesHistory() {
    setState(() {
      _passwordModalVisible = true;    });
    HapticService.medium();
  }

  void _handlePasswordSuccess() {
    setState(() {
      _passwordModalVisible = false;
    });
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const SalesHistoryScreen(),
      ),
    );
  }

  void _handleDebugTap() {
    setState(() {
      _debugTapCount++;
    });
    
    if (_debugTapCount >= 5) {
      setState(() {
        _debugMode = !_debugMode;
        _debugTapCount = 0;
      });
      
      HapticService.success();
      
      if (_debugMode) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Debug mode enabled')),
        );
      }
    }
    
    // Reset tap count after 2 seconds
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) {
        setState(() {
          _debugTapCount = 0;
        });
      }
    });
  }

  void _handleOpenWeightCalculator() {
    HapticService.light();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const WeightCalculatorScreen(),
      ),
    );
  }

  Future<void> _handleResetTableNames() async {
    try {
      await TableNamesService.resetAllTableNames();
      if (mounted) {
        // Reload table names in TableTabs widget
        // Force rebuild of entire widget tree to refresh table names
        setState(() {
          // This will cause the TableTabs widget to rebuild and reload names
        });
        
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Nombres Restablecidos'),
            content: const Text('Los nombres de las mesas han sido restablecidos.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (error) {
      print('Error resetting table names: $error');
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Error'),
          content: const Text('No se pudieron restablecer los nombres.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(      backgroundColor: AppColors.background,
      body: Stack(
        children: [
          SafeArea(
            child: Consumer<OrderProvider>(
              builder: (context, orderProvider, child) {
                return Column(
                  children: [
                    // Status bar space
                    Container(
                      height: MediaQuery.of(context).padding.top,
                      color: AppColors.background,
                    ),
                    
                    // Header
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [
                            AppColors.background,
                            AppColors.background.withOpacity(0.95),
                          ],
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                        ),
                        border: const Border(
                          bottom: BorderSide(
                            color: AppColors.borderLight,
                            width: 1,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          // Title
                          GestureDetector(
                            onTap: _handleDebugTap,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 5,
                                      height: 5,
                                      decoration: BoxDecoration(
                                        color: AppColors.primary,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Text(
                                      'La Gota de Oro',
                                      style: TextStyle(
                                        fontSize: 19,
                                        fontWeight: FontWeight.w900,
                                        color: AppColors.text,
                                        fontFamily: 'serif',
                                        letterSpacing: -0.5,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Padding(
                                  padding: const EdgeInsets.only(left: 14),
                                  child: Text(
                                    'Auténtica barbacoa mexicana',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w500,
                                      color: AppColors.textLight,
                                      letterSpacing: 0.2,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          
                          // Header buttons
                          Row(
                            children: [
                              // Reset Names Button
                              Container(
                                decoration: BoxDecoration(
                                  color: AppColors.cardLight,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppColors.border.withOpacity(0.2),
                                    width: 1,
                                  ),
                                ),
                                child: IconButton(
                                  onPressed: _handleResetTableNames,
                                  style: IconButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    fixedSize: const Size(26, 26),
                                  ),
                                  icon: const Icon(
                                    Icons.edit_note,
                                    size: 14,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              
                              // History Button
                              Container(
                                decoration: BoxDecoration(
                                  color: AppColors.cardLight,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppColors.border.withOpacity(0.2),
                                    width: 1,
                                  ),
                                ),
                                child: IconButton(
                                  onPressed: _handleViewSalesHistory,
                                  style: IconButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    fixedSize: const Size(26, 26),
                                  ),
                                  icon: const Icon(
                                    Icons.history,
                                    size: 14,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              
                              // Debug Button (only visible in debug mode)
                              if (_debugMode) ...[
                                Container(
                                  decoration: BoxDecoration(
                                    color: Colors.red.shade100,
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: Colors.red.shade300,
                                      width: 1,
                                    ),
                                  ),
                                  child: IconButton(
                                    onPressed: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) => const DebugSupabaseScreen(),
                                        ),
                                      );
                                    },
                                    style: IconButton.styleFrom(
                                      backgroundColor: Colors.transparent,
                                      fixedSize: const Size(26, 26),
                                    ),
                                    icon: Icon(
                                      Icons.bug_report,
                                      size: 14,
                                      color: Colors.red.shade700,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                              ],
                              
                              // Weight Calculator Button
                              Container(
                                decoration: BoxDecoration(
                                  color: AppColors.cardLight,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: AppColors.border.withOpacity(0.2),
                                    width: 1,
                                  ),
                                ),
                                child: IconButton(
                                  onPressed: _handleOpenWeightCalculator,
                                  style: IconButton.styleFrom(
                                    backgroundColor: Colors.transparent,
                                    fixedSize: const Size(26, 26),
                                  ),
                                  icon: const Icon(
                                    Icons.calculate,
                                    size: 14,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    
                    // Table Tabs
                    TableTabs(
                      currentTable: orderProvider.currentTable,
                      onTableChange: (table) {
                        orderProvider.setCurrentTable(table);
                      },
                    ),
                    
                    // Menu Grid
                    Expanded(
                      child: ResponsiveBuilder(
                        builder: (context, constraints) {
                          final columns = ResponsiveUtils.getGridColumns(context);
                          final padding = ResponsiveUtils.getResponsivePadding(context);
                          
                          return GridView.builder(
                            padding: padding,
                            gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: columns,
                              childAspectRatio: 1.3, // Increased from 1.1 to make cards wider and shorter
                              crossAxisSpacing: 4,
                              mainAxisSpacing: 4,
                            ),
                            itemCount: menuItems.length,
                            itemBuilder: (context, index) {
                              final item = menuItems[index];
                              final quantity = orderProvider.currentOrderItems[item.id]?.quantity ?? 0;
                              
                              return MenuItem(
                                item: item,
                                quantity: quantity,
                                onIncrement: () => orderProvider.incrementItem(item.id),
                                onDecrement: () => orderProvider.decrementItem(item.id),
                              ).animate()
                                .fadeIn(
                                  duration: PerformanceUtils.getOptimizedDuration(
                                    baseIf60Hz: const Duration(milliseconds: 300),
                                    baseIf120Hz: const Duration(milliseconds: 400),
                                  ),
                                  delay: Duration(milliseconds: index * 30), // Reduced stagger
                                )
                                .scale(
                                  begin: const Offset(0.95, 0.95),
                                  end: const Offset(1.0, 1.0),
                                  duration: PerformanceUtils.getOptimizedDuration(
                                    baseIf60Hz: const Duration(milliseconds: 300),
                                    baseIf120Hz: const Duration(milliseconds: 400),
                                  ),
                                  delay: Duration(milliseconds: index * 30),
                                  curve: PerformanceUtils.getOptimizedCurve(),
                                );
                            },
                          );
                        },
                      ),
                    ),
                    
                    // Order Summary
                    if (orderProvider.itemCount > 0)
                      EnhancedOrderSummary(                        total: orderProvider.total,
                        itemCount: orderProvider.itemCount,
                        onCheckout: _handleCheckout,
                        onClearAll: _handleClearAll,
                      ),
                  ],
                );
              },
            ),
          ),
          
          // Modals
          ClearAllModal(
            visible: _clearModalVisible,
            onClose: () => setState(() => _clearModalVisible = false),
            onConfirm: _confirmClearAll,
          ),
          
          PasswordModal(
            visible: _passwordModalVisible,
            onSuccess: _handlePasswordSuccess,
            onCancel: () => setState(() => _passwordModalVisible = false),
          ),
        ],
      ),
    );
  }
}
