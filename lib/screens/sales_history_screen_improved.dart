import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:math';
import 'dart:convert';
import '../theme/app_colors.dart';
import '../services/supabase_service.dart';

class SalesHistoryScreen extends StatefulWidget {
  const SalesHistoryScreen({Key? key}) : super(key: key);

  @override
  State<SalesHistoryScreen> createState() => _SalesHistoryScreenState();
}

class _SalesHistoryScreenState extends State<SalesHistoryScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _slideAnimation;
  
  DateTime selectedDate = DateTime.now();
  String selectedPeriod = 'Semana';
  bool showOrdersList = false;
  bool _isLoading = true;
  int? touchedIndex;
  String? selectedProductName;

  // Data from Supabase
  Map<String, dynamic> todayStats = {
    'totalSales': 0.0,
    'orderCount': 0,
    'avgOrderValue': 0.0,
    'topSellingItem': 'N/A',
    'peakHour': 'N/A',
    'weekendSales': 0.0,
    'saturdaySales': 0.0,
    'sundaySales': 0.0,
  };
  
  List<Map<String, dynamic>> salesData = [];
  List<Map<String, dynamic>> productSalesData = [];
  List<Map<String, dynamic>> orders = [];
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    ));
    _slideAnimation = Tween<double>(
      begin: 50.0,
      end: 0.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutCubic,
    ));
    
    _fetchData().then((_) {
      _animationController.forward();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _animationController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    setState(() {
      _isLoading = true;
      errorMessage = null;
    });

    try {
      // Get date range
      final startDate = _getStartDate();
      final endDate = _getEndDate();
      
      // Fetch orders from Supabase
      final ordersResponse = await SupabaseService.client
          .from('sales')
          .select()
          .gte('timestamp', startDate.toIso8601String())
          .lte('timestamp', endDate.toIso8601String())
          .order('timestamp', ascending: false);

      // Store orders
      orders = List<Map<String, dynamic>>.from(ordersResponse);

      // Process data
      double totalSales = 0;
      double saturdaySales = 0;
      double sundaySales = 0;
      Map<String, double> productSales = {};
      Map<int, double> hourlySales = {};
      Map<int, int> weekdayOrders = {};
      
      for (final order in orders) {
        final amount = (order['total'] ?? 0).toDouble();
        totalSales += amount;
        
        final orderTime = DateTime.parse(order['timestamp']);
        
        // Track weekend sales
        if (orderTime.weekday == 6) {
          saturdaySales += amount;
        } else if (orderTime.weekday == 7) {
          sundaySales += amount;
        }
        
        // Track weekday distribution
        weekdayOrders[orderTime.weekday] = (weekdayOrders[orderTime.weekday] ?? 0) + 1;
        
        // Process order items
        dynamic itemsData = order['items'];
        List<dynamic> items = [];
        
        if (itemsData != null) {
          if (itemsData is String) {
            try {
              items = json.decode(itemsData) as List<dynamic>;
            } catch (e) {
              items = [];
            }
          } else if (itemsData is List) {
            items = itemsData;
          }
        }
        
        for (final item in items) {
          final productName = item['name'] ?? 'Unknown';
          final quantity = (item['quantity'] ?? 0).toDouble();
          final price = (item['price'] ?? 0).toDouble();
          productSales[productName] = (productSales[productName] ?? 0) + (quantity * price);
        }
        
        // Track hourly sales
        final hour = orderTime.hour;
        hourlySales[hour] = (hourlySales[hour] ?? 0) + amount;
      }

      // Calculate stats
      final avgOrderValue = orders.isNotEmpty ? totalSales / orders.length : 0;
      final weekendSales = saturdaySales + sundaySales;
      
      // Find top selling product
      String topProduct = 'N/A';
      double maxSales = 0;
      productSales.forEach((product, sales) {
        if (sales > maxSales) {
          maxSales = sales;
          topProduct = product;
        }
      });
      
      // Find peak hour
      String peakHour = 'N/A';
      double maxHourlySales = 0;
      hourlySales.forEach((hour, sales) {
        if (sales > maxHourlySales) {
          maxHourlySales = sales;
          final startHour = hour.toString().padLeft(2, '0');
          final endHour = ((hour + 1) % 24).toString().padLeft(2, '0');
          peakHour = '$startHour:00 - $endHour:00';
        }
      });

      // Prepare chart data
      salesData = orders.map((order) {
        return {
          'time': DateTime.parse(order['timestamp']),
          'amount': (order['total'] ?? 0).toDouble(),
        };
      }).toList();
      
      // Prepare product sales data for pie chart
      productSalesData = productSales.entries
          .where((entry) => entry.value > 0)
          .map((entry) => {
                'product': entry.key,
                'sales': entry.value,
                'percentage': totalSales > 0 ? (entry.value / totalSales * 100) : 0.0,
              })
          .toList()
        ..sort((a, b) => (b['sales'] as double).compareTo(a['sales'] as double));

      setState(() {
        todayStats = {
          'totalSales': totalSales,
          'orderCount': orders.length,
          'avgOrderValue': avgOrderValue,
          'topSellingItem': topProduct,
          'peakHour': peakHour,
          'weekendSales': weekendSales,
          'saturdaySales': saturdaySales,
          'sundaySales': sundaySales,
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = 'Error al cargar datos: $e';
        _isLoading = false;
      });
    }
  }

  DateTime _getStartDate() {
    final now = DateTime.now();
    DateTime startDate;
    switch (selectedPeriod) {
      case 'Hoy':
        startDate = DateTime(now.year, now.month, now.day);
        break;
      case 'Semana':
        startDate = now.subtract(Duration(days: now.weekday - 1));
        startDate = DateTime(startDate.year, startDate.month, startDate.day);
        break;
      case 'Mes':
        startDate = DateTime(now.year, now.month, 1);
        break;
      case 'Año':
        startDate = DateTime(now.year, 1, 1);
        break;
      default:
        startDate = DateTime(now.year, now.month, now.day);
    }
    return startDate.toUtc();
  }

  DateTime _getEndDate() {
    final now = DateTime.now();
    DateTime endDate;
    switch (selectedPeriod) {
      case 'Hoy':
        endDate = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
        break;
      case 'Semana':
        final startOfWeek = now.subtract(Duration(days: now.weekday - 1));
        endDate = startOfWeek.add(const Duration(days: 6));
        endDate = DateTime(endDate.year, endDate.month, endDate.day, 23, 59, 59, 999);
        break;
      case 'Mes':
        endDate = DateTime(now.year, now.month + 1, 0, 23, 59, 59, 999);
        break;
      case 'Año':
        endDate = DateTime(now.year, 12, 31, 23, 59, 59, 999);
        break;
      default:
        endDate = DateTime(now.year, now.month, now.day, 23, 59, 59, 999);
    }
    return endDate.toUtc();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: _isLoading
            ? _buildLoadingState()
            : errorMessage != null
                ? _buildErrorState()
                : Column(
                    children: [
                      _buildHeader(),
                      _buildPeriodSelector(),
                      _buildTabBar(),
                      Expanded(
                        child: TabBarView(
                          controller: _tabController,
                          children: [
                            _buildSalesTab(),
                            _buildProductsTab(),
                            _buildHoursTab(),
                            _buildTablesTab(),
                          ],
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.card,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withOpacity(0.3),
                  blurRadius: 20,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
              strokeWidth: 3,
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Cargando datos de ventas...',
            style: TextStyle(
              color: AppColors.textLight,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.card,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            offset: const Offset(0, 2),
            blurRadius: 10,
          ),
        ],
      ),
      child: Row(
        children: [
          IconButton(
            icon: Icon(Icons.arrow_back_ios, color: AppColors.text),
            onPressed: () => Navigator.pop(context),
          ),
          Expanded(
            child: Column(
              children: [
                Text(
                  'Análisis de Ventas',
                  style: TextStyle(
                    color: AppColors.text,
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Ventas de Fin de Semana',
                  style: TextStyle(
                    color: AppColors.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: AppColors.primary),
            onPressed: () {
              _animationController.reset();
              _fetchData().then((_) {
                _animationController.forward();
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Container(
        margin: const EdgeInsets.all(24),
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppColors.error.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: AppColors.error.withOpacity(0.3),
            width: 2,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              color: AppColors.error,
              size: 48,
            ),
            const SizedBox(height: 16),
            Text(
              'Error al cargar datos',
              style: TextStyle(
                color: AppColors.error,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              errorMessage ?? 'Error desconocido',
              style: TextStyle(
                color: AppColors.textLight,
                fontSize: 14,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _fetchData,
              icon: const Icon(Icons.refresh),
              label: const Text('Reintentar'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 12,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(24),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
      color: AppColors.card,
      child: Row(
        children: ['Hoy', 'Semana', 'Mes', 'Año'].map((period) {
          final isSelected = selectedPeriod == period;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                child: ElevatedButton(
                  onPressed: () {
                    setState(() {
                      selectedPeriod = period;
                    });
                    _animationController.reset();
                    _fetchData().then((_) {
                      _animationController.forward();
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isSelected ? AppColors.primary : AppColors.background,
                    foregroundColor: isSelected ? Colors.white : AppColors.textLight,
                    elevation: isSelected ? 4 : 0,
                    shadowColor: AppColors.primary.withOpacity(0.3),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(30),
                      side: BorderSide(
                        color: isSelected ? AppColors.primary : AppColors.borderLight,
                        width: isSelected ? 0 : 1,
                      ),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (isSelected)
                        Icon(Icons.check_circle, size: 18),
                      if (isSelected)
                        const SizedBox(width: 6),
                      Text(
                        period,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
  Widget _buildTabBar() {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            offset: const Offset(0, 2),
            blurRadius: 4,
          ),
        ],
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textLight,
        indicatorColor: AppColors.primary,
        indicatorWeight: 3,
        indicatorPadding: const EdgeInsets.symmetric(horizontal: 16),
        labelStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.bold,
        ),
        unselectedLabelStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w500,
        ),
        tabs: const [
          Tab(text: 'Ventas'),
          Tab(text: 'Productos'),
          Tab(text: 'Horarios'),
          Tab(text: 'Mesas'),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, {
    Widget? icon, 
    Color? valueColor,
    String? subtitle,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedBuilder(
        animation: _fadeAnimation,
        builder: (context, child) {
          return FadeTransition(
            opacity: _fadeAnimation,
            child: Transform.translate(
              offset: Offset(0, _slideAnimation.value),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      offset: const Offset(0, 4),
                      blurRadius: 12,
                    ),
                  ],
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    if (icon != null) ...[
                      icon,
                      const SizedBox(height: 12),
                    ],
                    Text(
                      value,
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: valueColor ?? AppColors.text,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textLight,
                        fontWeight: FontWeight.w500,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle,
                        style: TextStyle(
                          fontSize: 11,
                          color: AppColors.textSubtle,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }
  Widget _buildSalesTab() {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Weekend Focus Card
          if (selectedPeriod != 'Hoy')
            AnimatedBuilder(
              animation: _fadeAnimation,
              builder: (context, child) {
                return FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [
                          AppColors.primary.withOpacity(0.9),
                          AppColors.primaryDark,
                        ],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          offset: const Offset(0, 8),
                          blurRadius: 20,
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(
                            Icons.weekend,
                            color: Colors.white,
                            size: 32,
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Ventas de Fin de Semana',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Sábado',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.8),
                                            fontSize: 12,
                                          ),
                                        ),
                                        Text(
                                          NumberFormat.currency(
                                            symbol: '\$',
                                            decimalDigits: 0,
                                          ).format(todayStats['saturdaySales']),
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Container(
                                    height: 30,
                                    width: 1,
                                    color: Colors.white.withOpacity(0.3),
                                  ),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.center,
                                      children: [
                                        Text(
                                          'Domingo',
                                          style: TextStyle(
                                            color: Colors.white.withOpacity(0.8),
                                            fontSize: 12,
                                          ),
                                        ),
                                        Text(
                                          NumberFormat.currency(
                                            symbol: '\$',
                                            decimalDigits: 0,
                                          ).format(todayStats['sundaySales']),
                                          style: TextStyle(
                                            color: Colors.white,
                                            fontSize: 16,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),

          // Stats Cards Grid
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 3,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 1.1,
            children: [
              _buildStatCard(
                'Ventas Totales',
                NumberFormat.currency(symbol: '\$', decimalDigits: 0)
                    .format(todayStats['totalSales']),
                icon: Icon(Icons.attach_money, color: AppColors.success, size: 32),
                valueColor: AppColors.success,
              ),
              _buildStatCard(
                'Órdenes',
                todayStats['orderCount'].toString(),
                icon: Icon(Icons.receipt_long, color: AppColors.primary, size: 32),
                subtitle: 'Total pedidos',
              ),
              _buildStatCard(
                'Ticket Promedio',
                NumberFormat.currency(symbol: '\$', decimalDigits: 0)
                    .format(todayStats['avgOrderValue']),
                icon: Icon(Icons.shopping_cart, color: AppColors.secondary, size: 32),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Sales trend chart
          AnimatedBuilder(
            animation: _fadeAnimation,
            builder: (context, child) {
              return FadeTransition(
                opacity: _fadeAnimation,
                child: Container(
                  height: 280,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        offset: const Offset(0, 4),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Tendencia de Ventas',
                                style: TextStyle(
                                  color: AppColors.text,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Acumulado del período',
                                style: TextStyle(
                                  color: AppColors.textLight,
                                  fontSize: 13,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            decoration: BoxDecoration(
                              color: AppColors.primaryLight,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.trending_up,
                                  size: 16,
                                  color: AppColors.primary,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  '${salesData.length} ventas',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.primary,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      Expanded(
                        child: salesData.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.show_chart_outlined,
                                      size: 56,
                                      color: AppColors.textSubtle.withOpacity(0.3),
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No hay datos de ventas',
                                      style: TextStyle(
                                        color: AppColors.textLight,
                                        fontSize: 16,
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Las ventas aparecerán aquí',
                                      style: TextStyle(
                                        color: AppColors.textSubtle,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : _buildImprovedLineChart(),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 24),
          // Interactive Pie Chart for Product Sales
          if (productSalesData.isNotEmpty) ...[
            AnimatedBuilder(
              animation: _fadeAnimation,
              builder: (context, child) {
                return FadeTransition(
                  opacity: _fadeAnimation,
                  child: Container(
                    height: 400,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.06),
                          offset: const Offset(0, 4),
                          blurRadius: 12,
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Distribución de Ventas por Producto',
                          style: TextStyle(
                            color: AppColors.text,
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Toca cada sección para ver detalles',
                          style: TextStyle(
                            color: AppColors.textLight,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Expanded(
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Row(
                                children: [
                                  // Interactive Pie Chart
                                  Expanded(
                                    flex: 3,
                                    child: PieChart(
                                      PieChartData(
                                        pieTouchData: PieTouchData(
                                          touchCallback: (FlTouchEvent event, pieTouchResponse) {
                                            setState(() {
                                              if (!event.isInterestedForInteractions ||
                                                  pieTouchResponse == null ||
                                                  pieTouchResponse.touchedSection == null) {
                                                touchedIndex = -1;
                                                selectedProductName = null;
                                                return;
                                              }
                                              touchedIndex = pieTouchResponse
                                                  .touchedSection!.touchedSectionIndex;
                                              
                                              // Set the product name for the touched section
                                              if (touchedIndex >= 0 && touchedIndex < productSalesData.length) {
                                                final data = productSalesData[touchedIndex];
                                                selectedProductName = data['product'];
                                              } else if (touchedIndex == productSalesData.length && productSalesData.length > 5) {
                                                selectedProductName = 'Otros';
                                              }
                                            });
                                          },
                                        ),
                                        borderData: FlBorderData(show: false),
                                        sectionsSpace: 3,
                                        centerSpaceRadius: 60,
                                        sections: _generateInteractivePieSections(),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 20),
                                  // Legend
                                  Expanded(
                                    flex: 2,
                                    child: SingleChildScrollView(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: _buildInteractivePieLegend(),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              // Product name overlay
                              if (selectedProductName != null)
                                AnimatedOpacity(
                                  opacity: selectedProductName != null ? 1.0 : 0.0,
                                  duration: const Duration(milliseconds: 200),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 20,
                                      vertical: 12,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AppColors.text.withOpacity(0.9),
                                      borderRadius: BorderRadius.circular(30),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.2),
                                          blurRadius: 10,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Text(
                                      selectedProductName ?? '',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 24),
          ],
          // Real-time sync indicator
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.primaryLight.withOpacity(0.3),
                  AppColors.primaryLight.withOpacity(0.1),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.primary.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.cloud_done,
                    color: AppColors.primary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Sincronizado con Supabase',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Todos los datos están actualizados en tiempo real',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildImprovedLineChart() {
    // Sort sales data by time
    final sortedData = List<Map<String, dynamic>>.from(salesData)
      ..sort((a, b) => a['time'].compareTo(b['time']));

    // Calculate cumulative sales
    double cumulative = 0;
    final cumulativeData = sortedData.map((sale) {
      cumulative += sale['amount'];
      return FlSpot(
        sortedData.indexOf(sale).toDouble(),
        cumulative,
      );
    }).toList();

    // Find max value for Y axis
    final maxY = cumulativeData.isNotEmpty 
        ? cumulativeData.map((spot) => spot.y).reduce(max)
        : 100.0;
    
    final safeMaxY = maxY > 0 ? maxY : 100.0;

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: safeMaxY / 4,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: AppColors.borderLight.withOpacity(0.2),
              strokeWidth: 1,
              dashArray: [5, 5],
            );
          },
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 50,
              interval: safeMaxY / 4,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(
                    NumberFormat.compact().format(value),
                    style: TextStyle(
                      fontSize: 11,
                      color: AppColors.textSubtle,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              },
            ),
          ),
          rightTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 35,
              interval: cumulativeData.length > 10 ? cumulativeData.length / 5 : 1,
              getTitlesWidget: (value, meta) {
                final index = value.toInt();
                if (index >= 0 && index < sortedData.length) {
                  final time = sortedData[index]['time'] as DateTime;
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      DateFormat.Hm().format(time),
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textSubtle,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
        borderData: FlBorderData(show: false),
        minX: 0,
        maxX: cumulativeData.isNotEmpty ? cumulativeData.length - 1 : 1,
        minY: 0,
        maxY: safeMaxY * 1.1,
        lineBarsData: [
          LineChartBarData(
            spots: cumulativeData,
            isCurved: true,
            curveSmoothness: 0.3,
            gradient: LinearGradient(
              colors: [
                AppColors.primary,
                AppColors.primary.withOpacity(0.8),
              ],
            ),
            barWidth: 4,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: cumulativeData.length <= 10,
              getDotPainter: (spot, percent, barData, index) {
                return FlDotCirclePainter(
                  radius: 4,
                  color: AppColors.primary,
                  strokeWidth: 2,
                  strokeColor: AppColors.card,
                );
              },
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withOpacity(0.15),
                  AppColors.primary.withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
        lineTouchData: LineTouchData(
          touchTooltipData: LineTouchTooltipData(
            tooltipPadding: const EdgeInsets.all(12),
            tooltipMargin: 8,
            getTooltipItems: (List<LineBarSpot> touchedBarSpots) {
              return touchedBarSpots.map((barSpot) {
                final flSpot = barSpot;
                final index = flSpot.x.toInt();
                if (index >= 0 && index < sortedData.length) {
                  final time = sortedData[index]['time'] as DateTime;
                  return LineTooltipItem(
                    '${DateFormat.Hm().format(time)}\n${NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(flSpot.y)}',
                    const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  );
                }
                return null;
              }).toList();
            },
          ),
          handleBuiltInTouches: true,
        ),
      ),
    );
  }
  List<PieChartSectionData> _generateInteractivePieSections() {
    if (productSalesData.isEmpty) {
      return [];
    }
    
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.secondary,
      AppColors.error,
      Colors.orange,
      Colors.teal,
      Colors.purple,
      Colors.indigo,
    ];

    // Take top 5 products and group the rest as "Others"
    final topProducts = List<Map<String, dynamic>>.from(productSalesData.take(5));
    final hasOthers = productSalesData.length > 5;
    
    if (hasOthers) {
      final othersTotal = productSalesData
          .skip(5)
          .fold(0.0, (sum, item) => sum + item['sales']);
      final totalSales = productSalesData
          .fold(0.0, (sum, item) => sum + item['sales']);
      
      topProducts.add({
        'product': 'Otros',
        'sales': othersTotal,
        'percentage': (othersTotal / totalSales * 100),
      });
    }

    return topProducts.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      final isTouched = index == touchedIndex;
      final color = colors[index % colors.length];
      
      return PieChartSectionData(
        color: isTouched ? color : color.withOpacity(0.8),
        value: data['sales'],
        title: isTouched ? '' : '${data['percentage'].toStringAsFixed(1)}%',
        radius: isTouched ? 65 : 55,
        titleStyle: TextStyle(
          fontSize: isTouched ? 0 : 14,
          fontWeight: FontWeight.bold,
          color: Colors.white,
          shadows: [
            Shadow(
              color: Colors.black.withOpacity(0.3),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        badgeWidget: isTouched
            ? Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: color.withOpacity(0.5),
                      blurRadius: 8,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: Icon(
                  Icons.star,
                  color: Colors.white,
                  size: 20,
                ),
              )
            : null,
        badgePositionPercentageOffset: 0.98,
      );
    }).toList();
  }

  List<Widget> _buildInteractivePieLegend() {
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.secondary,
      AppColors.error,
      Colors.orange,
      Colors.teal,
      Colors.purple,
      Colors.indigo,
    ];

    final topProducts = List<Map<String, dynamic>>.from(productSalesData.take(5));
    final hasOthers = productSalesData.length > 5;
    
    if (hasOthers) {
      final othersTotal = productSalesData
          .skip(5)
          .fold(0.0, (sum, item) => sum + item['sales']);
      
      topProducts.add({
        'product': 'Otros',
        'sales': othersTotal,
      });
    }

    return topProducts.asMap().entries.map((entry) {
      final index = entry.key;
      final data = entry.value;
      final color = colors[index % colors.length];
      final isTouched = index == touchedIndex;
      
      return AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 12),
        padding: EdgeInsets.all(isTouched ? 12 : 8),
        decoration: BoxDecoration(
          color: isTouched ? color.withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isTouched ? color : Colors.transparent,
            width: 2,
          ),
        ),
        child: Row(
          children: [
            AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: isTouched ? 16 : 12,
              height: isTouched ? 16 : 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                boxShadow: isTouched
                    ? [
                        BoxShadow(
                          color: color.withOpacity(0.5),
                          blurRadius: 4,
                          spreadRadius: 1,
                        ),
                      ]
                    : [],
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                data['product'],
                style: TextStyle(
                  fontSize: isTouched ? 15 : 14,
                  color: isTouched ? AppColors.text : AppColors.textLight,
                  fontWeight: isTouched ? FontWeight.bold : FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              NumberFormat.currency(
                symbol: '\$',
                decimalDigits: 0,
              ).format(data['sales']),
              style: TextStyle(
                fontSize: isTouched ? 15 : 14,
                fontWeight: FontWeight.bold,
                color: isTouched ? color : AppColors.text,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.success,
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'TOP',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.2),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.white.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 13,
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
  // Hours Tab
  Widget _buildHoursTab() {
    // Generate hourly sales data
    final hourlySalesMap = <int, double>{};
    final hourlyOrdersMap = <int, int>{};
    
    for (final order in orders) {
      final orderTime = DateTime.parse(order['timestamp']);
      final hour = orderTime.hour;
      final amount = (order['total'] ?? 0).toDouble();
      
      hourlySalesMap[hour] = (hourlySalesMap[hour] ?? 0) + amount;
      hourlyOrdersMap[hour] = (hourlyOrdersMap[hour] ?? 0) + 1;
    }
    
    // Create hourly data for all 24 hours
    final hourlyData = List.generate(24, (hour) {
      return {
        'hour': hour,
        'sales': hourlySalesMap[hour] ?? 0,
        'orders': hourlyOrdersMap[hour] ?? 0,
      };
    });
    
    // Find peak hours
    final sortedByOrders = List.from(hourlyData)
      ..sort((a, b) => b['orders'].compareTo(a['orders']));
    final peakHours = List<Map<String, dynamic>>.from(sortedByOrders.take(3));
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Peak hours cards
          Text(
            'Horarios Pico',
            style: TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.text,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: peakHours.map((data) {
              final hour = data['hour'] as int;
              final orders = data['orders'] as int;
              final sales = data['sales'] as double;
              final isPeak = peakHours.indexOf(data) == 0;
              
              return Expanded(
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: isPeak
                        ? LinearGradient(
                            colors: [
                              AppColors.primary,
                              AppColors.primaryDark,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          )
                        : null,
                    color: isPeak ? null : AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: !isPeak
                        ? Border.all(
                            color: AppColors.primary.withOpacity(0.3),
                            width: 2,
                          )
                        : null,
                    boxShadow: [
                      BoxShadow(
                        color: isPeak
                            ? AppColors.primary.withOpacity(0.3)
                            : Colors.black.withOpacity(0.06),
                        offset: const Offset(0, 4),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.access_time_filled,
                        color: isPeak ? Colors.white : AppColors.primary,
                        size: 28,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${hour.toString().padLeft(2, '0')}:00',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isPeak ? Colors.white : AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$orders órdenes',
                        style: TextStyle(
                          fontSize: 13,
                          color: isPeak ? Colors.white.withOpacity(0.9) : AppColors.textLight,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(sales),
                        style: TextStyle(
                          fontSize: 12,
                          color: isPeak ? Colors.white.withOpacity(0.8) : AppColors.textSubtle,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 24),          
          // Hourly chart
          Container(
            height: 320,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  offset: const Offset(0, 4),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Ventas por Hora',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.text,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        'Últimas 24 horas',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Expanded(
                  child: _buildImprovedHourlyChart(hourlyData),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          
          // Weekend insight for hours
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.secondary.withOpacity(0.1),
                  AppColors.secondary.withOpacity(0.05),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: AppColors.secondary.withOpacity(0.3),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.secondary.withOpacity(0.2),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    Icons.lightbulb_outline,
                    color: AppColors.secondary,
                    size: 24,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Patrón de Fin de Semana',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _getHourlyInsight(hourlyData),
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  Widget _buildImprovedHourlyChart(List<Map<String, dynamic>> hourlyData) {
    final maxOrders = hourlyData.map((d) => d['orders'] as int).reduce(max);
    final safeMaxOrders = maxOrders > 0 ? maxOrders.toDouble() : 10.0;
    
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: safeMaxOrders * 1.2,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            tooltipPadding: const EdgeInsets.all(12),
            tooltipMargin: 8,
            tooltipRoundedRadius: 12,
            fitInsideHorizontally: true,
            fitInsideVertically: true,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final hour = group.x.toInt();
              final orders = rod.toY.toInt();
              final sales = hourlyData[hour]['sales'] as double;
              return BarTooltipItem(
                '${hour.toString().padLeft(2, '0')}:00\n',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
                children: [
                  TextSpan(
                    text: '$orders órdenes\n',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                  TextSpan(
                    text: NumberFormat.currency(
                      symbol: '\$',
                      decimalDigits: 0,
                    ).format(sales),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.normal,
                    ),
                  ),
                ],
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          show: true,
          rightTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          topTitles: AxisTitles(
            sideTitles: SideTitles(showTitles: false),
          ),
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (double value, TitleMeta meta) {
                final hour = value.toInt();
                if (hour % 3 == 0) {
                  return Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(
                      hour.toString().padLeft(2, '0'),
                      style: TextStyle(
                        color: AppColors.textSubtle,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
              reservedSize: 35,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 35,
              interval: safeMaxOrders / 4,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(
                    value.toInt().toString(),
                    style: TextStyle(
                      color: AppColors.textSubtle,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        borderData: FlBorderData(
          show: false,
        ),
        barGroups: hourlyData.asMap().entries.map((entry) {
          final hour = entry.key;
          final orders = entry.value['orders'] as int;
          
          return BarChartGroupData(
            x: hour,
            barRods: [
              BarChartRodData(
                toY: orders.toDouble(),
                gradient: LinearGradient(
                  colors: orders > 0
                      ? [
                          AppColors.primary,
                          AppColors.primary.withOpacity(0.7),
                        ]
                      : [
                          AppColors.borderLight.withOpacity(0.3),
                          AppColors.borderLight.withOpacity(0.2),
                        ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
                width: 20,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(6),
                  topRight: Radius.circular(6),
                ),
              ),
            ],
          );
        }).toList(),
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: safeMaxOrders / 4,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: AppColors.borderLight.withOpacity(0.2),
              strokeWidth: 1,
              dashArray: [5, 5],
            );
          },
        ),
      ),
    );
  }
  // Tables Tab
  Widget _buildTablesTab() {
    // Analyze table data from orders
    final tableSalesMap = <String, double>{};
    final tableOrdersMap = <String, int>{};
    
    for (final order in orders) {
      final tableName = order['table_name'] ?? 'Sin Mesa';
      final amount = (order['total'] ?? 0).toDouble();
      
      tableSalesMap[tableName] = (tableSalesMap[tableName] ?? 0) + amount;
      tableOrdersMap[tableName] = (tableOrdersMap[tableName] ?? 0) + 1;
    }
    
    // Create sorted table data
    final tableData = tableSalesMap.entries.map((entry) {
      return {
        'table': entry.key,
        'sales': entry.value,
        'orders': tableOrdersMap[entry.key] ?? 0,
        'avgTicket': entry.value / (tableOrdersMap[entry.key] ?? 1),
      };
    }).toList()
      ..sort((a, b) => (b['sales'] as double).compareTo(a['sales'] as double));
    
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.06),
                        offset: const Offset(0, 4),
                        blurRadius: 12,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.table_restaurant,
                        color: AppColors.primary,
                        size: 32,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${tableData.length}',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      Text(
                        'Mesas Activas',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        AppColors.success.withOpacity(0.9),
                        AppColors.success.withOpacity(0.7),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.success.withOpacity(0.3),
                        offset: const Offset(0, 8),
                        blurRadius: 20,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.trending_up,
                        color: Colors.white,
                        size: 32,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        tableData.isNotEmpty ? (tableData.first['table'] as String) : 'N/A',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        'Mesa Top',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),          
          // Tables list
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  offset: const Offset(0, 4),
                  blurRadius: 12,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(20),
                  child: Text(
                    'Ventas por Mesa',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                ),
                if (tableData.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.table_restaurant_outlined,
                            size: 64,
                            color: AppColors.textSubtle.withOpacity(0.3),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No hay datos de mesas',
                            style: TextStyle(
                              color: AppColors.textLight,
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: tableData.length,
                    separatorBuilder: (context, index) => 
                        Divider(height: 1, color: AppColors.borderLight.withOpacity(0.3)),
                    itemBuilder: (context, index) {
                      final table = tableData[index];
                      final tableName = table['table'] as String;
                      final sales = table['sales'] as double;
                      final orderCount = table['orders'] as int;
                      final avgTicket = table['avgTicket'] as double;
                      
                      // Calculate percentage of total sales
                      final percentage = todayStats['totalSales'] > 0
                          ? (sales / todayStats['totalSales'] * 100)
                          : 0.0;
                      
                      return ListTile(
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 20,
                          vertical: 16,
                        ),
                        leading: Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: _getTableColor(index).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Center(
                            child: Icon(
                              Icons.table_restaurant,
                              color: _getTableColor(index),
                              size: 28,
                            ),
                          ),
                        ),
                        title: Row(
                          children: [
                            Text(
                              tableName,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (index == 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 10,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    colors: [
                                      AppColors.success,
                                      AppColors.success.withOpacity(0.8),
                                    ],
                                  ),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'TOP',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 6),
                            Row(
                              children: [
                                Icon(
                                  Icons.receipt,
                                  size: 14,
                                  color: AppColors.textLight,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '$orderCount ${orderCount == 1 ? 'orden' : 'órdenes'}',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textLight,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Icon(
                                  Icons.pie_chart_outline,
                                  size: 14,
                                  color: AppColors.textLight,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${percentage.toStringAsFixed(1)}%',
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: AppColors.textLight,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Ticket promedio: ${NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(avgTicket)}',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textSubtle,
                              ),
                            ),
                          ],
                        ),
                        trailing: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              NumberFormat.currency(
                                symbol: '\$',
                                decimalDigits: 0,
                              ).format(sales),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 20,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
  // Helper method to get product color
  Color _getProductColor(int index) {
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.secondary,
      AppColors.error,
      Colors.orange,
      Colors.teal,
      Colors.purple,
      Colors.indigo,
    ];
    return colors[index % colors.length];
  }
  
  // Helper method to get table color
  Color _getTableColor(int index) {
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.secondary,
      Colors.orange,
      Colors.purple,
      Colors.teal,
    ];
    return colors[index % colors.length];
  }
  
  // Get hourly insight
  String _getHourlyInsight(List<Map<String, dynamic>> hourlyData) {
    final activeHours = hourlyData.where((d) => (d['orders'] as int) > 0).toList();
    if (activeHours.isEmpty) {
      return 'No hay actividad registrada en este período.';
    }
    
    // Find the busiest hours
    final sortedByOrders = List.from(activeHours)
      ..sort((a, b) => (b['orders'] as int).compareTo(a['orders'] as int));
    
    if (sortedByOrders.isNotEmpty) {
      final peakHour = sortedByOrders.first['hour'] as int;
      final peakOrders = sortedByOrders.first['orders'] as int;
      
      // Check if it's weekend hours
      if (peakHour >= 12 && peakHour <= 16) {
        return 'El horario de almuerzo (${peakHour}:00) es tu momento más activo con $peakOrders órdenes. '
            'Perfecto para las ventas de fin de semana.';
      } else if (peakHour >= 17 && peakHour <= 20) {
        return 'Las tardes son tu fuerte. El pico de actividad a las ${peakHour}:00 con $peakOrders órdenes '
            'muestra que los clientes prefieren comprar después del mediodía.';
      } else {
        return 'Tu hora pico es a las ${peakHour}:00 con $peakOrders órdenes. '
            'Considera ajustar tu horario para maximizar las ventas.';
      }
    }
    
    return 'Analiza tus horarios para identificar los mejores momentos de venta.';
  }
}