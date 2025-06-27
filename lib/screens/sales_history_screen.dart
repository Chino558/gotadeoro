import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:math';
import 'dart:convert';
import '../theme/app_colors.dart';
import '../services/supabase_service.dart';
import '../utils/responsive_utils.dart';

class SalesHistoryScreen extends StatefulWidget {
  const SalesHistoryScreen({Key? key}) : super(key: key);

  @override
  State<SalesHistoryScreen> createState() => _SalesHistoryScreenState();
}

class _SalesHistoryScreenState extends State<SalesHistoryScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  DateTime selectedDate = DateTime.now();
  String selectedPeriod = 'Hoy';
  bool showOrdersList = false;
  bool _isLoading = true;

  // Data from Supabase
  Map<String, dynamic> todayStats = {
    'totalSales': 0.0,
    'orderCount': 0,
    'avgOrderValue': 0.0,
    'topSellingItem': 'N/A',
    'peakHour': 'N/A',
  };
  
  List<Map<String, dynamic>> salesData = [];
  List<Map<String, dynamic>> productSalesData = [];
  List<Map<String, dynamic>> orders = [];
  String? errorMessage;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _fetchData();
  }

  @override
  void dispose() {
    _tabController.dispose();
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
      
      print('Fetching sales from: ${startDate.toIso8601String()} to ${endDate.toIso8601String()}');
      print('Selected period: $selectedPeriod');
      print('Current local time: ${DateTime.now()}');
      print('Current UTC time: ${DateTime.now().toUtc()}');

      // Fetch orders from Supabase
      final ordersResponse = await SupabaseService.client
          .from('sales')
          .select()
          .gte('timestamp', startDate.toIso8601String())
          .lte('timestamp', endDate.toIso8601String())
          .order('timestamp', ascending: false);

      // Store orders
      orders = List<Map<String, dynamic>>.from(ordersResponse);
      
      print('Found ${orders.length} orders');
      if (orders.isNotEmpty) {
        print('First order timestamp: ${orders.first['timestamp']}');
        print('First order total: ${orders.first['total']}');
        print('First order items: ${orders.first['items']}');
        print('First order items type: ${orders.first['items'].runtimeType}');
      }

      // Also fetch all orders to debug
      final allOrdersResponse = await SupabaseService.client
          .from('sales')
          .select()
          .order('timestamp', ascending: false)
          .limit(10);
      
      final allOrders = List<Map<String, dynamic>>.from(allOrdersResponse);
      print('Total orders in database (last 10): ${allOrders.length}');
      if (allOrders.isNotEmpty) {
        print('Latest order timestamp: ${allOrders.first['timestamp']}');
        print('Latest order date: ${DateTime.parse(allOrders.first['timestamp']).toLocal()}');
      }

      // Process data
      double totalSales = 0;
      Map<String, double> productSales = {};
      Map<int, double> hourlySales = {};
      
      for (final order in orders) {
        final amount = (order['total'] ?? 0).toDouble();
        totalSales += amount;
        
        // Debug: print first order structure
        if (orders.indexOf(order) == 0) {
          print('First order structure:');
          print('Order ID: ${order['id']}');
          print('Total: ${order['total']}');
          print('Items type: ${order['items'].runtimeType}');
          print('Items value: ${order['items']}');
        }
        
        // Process order items
        dynamic itemsData = order['items'];
        List<dynamic> items = [];
        
        if (itemsData != null) {
          if (itemsData is String) {
            // If items is a JSON string, decode it
            try {
              items = json.decode(itemsData) as List<dynamic>;
            } catch (e) {
              print('Error decoding items JSON: $e');
              items = [];
            }
          } else if (itemsData is List) {
            // If items is already a list, use it directly
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
        final orderTime = DateTime.parse(order['timestamp']);
        final hour = orderTime.hour;
        hourlySales[hour] = (hourlySales[hour] ?? 0) + amount;
      }

      // Calculate stats
      final avgOrderValue = orders.isNotEmpty ? totalSales / orders.length : 0;
      
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
        };
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        errorMessage = 'Error al cargar datos: $e';
        _isLoading = false;
      });
      print('Error loading sales data: $e');
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
    // Convert to UTC for database query
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
    // Convert to UTC for database query
    return endDate.toUtc();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.card,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.text),
          onPressed: () => Navigator.pop(context),
        ),
        centerTitle: true,
        title: const Text(
          'Análisis de Ventas',
          style: TextStyle(
            color: AppColors.text,
            fontSize: 20,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.text),
            onPressed: _fetchData,          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : errorMessage != null
              ? _buildErrorState()
              : Column(
                  children: [
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
    );
  }

  Widget _buildErrorState() {
    return Container(
      color: AppColors.error.withOpacity(0.1),
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            errorMessage ?? 'Error desconocido',
            style: TextStyle(
              color: AppColors.error,
              fontSize: 14,
            ),
            maxLines: 10,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: _fetchData,
            child: Text(
              'Reintentar',
              style: TextStyle(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      color: AppColors.card,
      child: Row(
        children: ['Hoy', 'Semana', 'Mes', 'Año'].map((period) {
          final isSelected = selectedPeriod == period;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: ElevatedButton(
                onPressed: () {
                  setState(() {
                    selectedPeriod = period;
                  });
                  _fetchData();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: isSelected ? AppColors.primary : AppColors.background,
                  foregroundColor: isSelected ? Colors.white : AppColors.textLight,
                  elevation: isSelected ? 2 : 0,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                    side: BorderSide(
                      color: isSelected ? AppColors.primary : AppColors.border,
                      width: 1,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (isSelected)
                      const Icon(Icons.check, size: 16),
                    if (isSelected)
                      const SizedBox(width: 4),
                    Text(
                      period,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ],
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
        border: Border(
          bottom: BorderSide(
            color: AppColors.border.withOpacity(0.1),
            width: 1,
          ),
        ),
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: AppColors.primary,
        unselectedLabelColor: AppColors.textLight,
        indicatorColor: AppColors.primary,
        indicatorWeight: 3,
        tabs: const [
          Tab(text: 'Ventas'),
          Tab(text: 'Productos'),
          Tab(text: 'Horarios'),
          Tab(text: 'Mesas'),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, {Widget? icon, Color? valueColor}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            offset: const Offset(0, 2),
            blurRadius: 8,
          ),
        ],
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (icon != null) ...[
            icon,
            const SizedBox(height: 8),
          ],
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: valueColor ?? AppColors.text,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textLight,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildSalesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Stats Cards Row
          Row(
            children: [
              Expanded(
                child: _buildStatCard(
                  'Ventas Totales',
                  NumberFormat.currency(symbol: '\$', decimalDigits: 0)
                      .format(todayStats['totalSales']),
                  icon: Icon(Icons.attach_money, color: AppColors.success, size: 28),
                  valueColor: AppColors.success,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Órdenes',
                  todayStats['orderCount'].toString(),
                  icon: Icon(Icons.receipt_long, color: AppColors.primary, size: 28),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildStatCard(
                  'Ticket Promedio',
                  NumberFormat.currency(symbol: '\$', decimalDigits: 0)
                      .format(todayStats['avgOrderValue']),
                  icon: Icon(Icons.shopping_cart, color: AppColors.secondary, size: 28),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Sales trend chart - Improved layout
          Container(
            height: 250,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
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
                      'Tendencia de Ventas',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.text,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        '${salesData.length} ventas',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: salesData.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.show_chart_outlined,
                                size: 48,
                                color: AppColors.textSubtle.withOpacity(0.5),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'No hay datos de ventas para este período',
                                style: TextStyle(
                                  color: AppColors.textLight,
                                  fontSize: 14,
                                ),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        )
                      : _buildSimplifiedLineChart(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Pie Chart for Product Sales
          if (productSalesData.isNotEmpty) ...[
            Container(
              height: 300,
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    offset: const Offset(0, 2),
                    blurRadius: 8,
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Distribución de Ventas por Producto',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.text,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: Row(
                      children: [
                        // Pie Chart
                        Expanded(
                          flex: 3,
                          child: _generatePieSections().isEmpty
                              ? Center(
                                  child: Text(
                                    'Sin datos de productos',
                                    style: TextStyle(
                                      color: AppColors.textLight,
                                      fontSize: 14,
                                    ),
                                  ),
                                )
                              : PieChart(
                                  PieChartData(
                                    sectionsSpace: 2,
                                    centerSpaceRadius: 40,
                                    sections: _generatePieSections(),
                                    pieTouchData: PieTouchData(
                                      touchCallback: (FlTouchEvent event, pieTouchResponse) {
                                        // Handle touch if needed
                                      },
                                    ),
                                  ),
                                ),
                        ),
                        const SizedBox(width: 16),
                        // Legend
                        Expanded(
                          flex: 2,
                          child: SingleChildScrollView(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: _buildPieLegend(),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],              ),
            ),
            const SizedBox(height: 16),
          ],

          // Real data notice
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryLight.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppColors.primary.withOpacity(0.2),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.cloud_done,
                  color: AppColors.primary,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Datos en Tiempo Real',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Todos los datos provienen directamente de la base de datos de Supabase',
                        style: TextStyle(
                          fontSize: 12,
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

  Widget _buildSimplifiedLineChart() {
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
    
    // Ensure maxY is never 0 to avoid division by zero
    final safeMaxY = maxY > 0 ? maxY : 100.0;

    return LineChart(
      LineChartData(
        gridData: FlGridData(
          show: true,
          drawVerticalLine: false,
          horizontalInterval: safeMaxY / 4,
          getDrawingHorizontalLine: (value) {
            return FlLine(
              color: AppColors.border.withOpacity(0.1),
              strokeWidth: 1,
            );
          },
        ),
        titlesData: FlTitlesData(
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 45,
              interval: safeMaxY / 4,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(
                    NumberFormat.compact().format(value),
                    style: TextStyle(
                      fontSize: 10,
                      color: AppColors.textSubtle,
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
              reservedSize: 30,
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
                        fontSize: 10,
                        color: AppColors.textSubtle,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),
          ),
        ),
        borderData: FlBorderData(
          show: true,
          border: Border.all(
            color: AppColors.border.withOpacity(0.1),
          ),
        ),
        minX: 0,
        maxX: cumulativeData.isNotEmpty ? cumulativeData.length - 1 : 1,
        minY: 0,
        maxY: safeMaxY * 1.1,
        lineBarsData: [
          LineChartBarData(
            spots: cumulativeData,
            isCurved: true,
            gradient: LinearGradient(
              colors: [
                AppColors.primary,
                AppColors.primary.withOpacity(0.7),
              ],
            ),
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: FlDotData(
              show: cumulativeData.length <= 10,
              getDotPainter: (spot, percent, barData, index) {
                return FlDotCirclePainter(
                  radius: 3,
                  color: AppColors.primary,
                  strokeWidth: 1.5,
                  strokeColor: AppColors.card,
                );
              },
            ),
            belowBarData: BarAreaData(
              show: true,
              gradient: LinearGradient(
                colors: [
                  AppColors.primary.withOpacity(0.2),
                  AppColors.primary.withOpacity(0.0),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<PieChartSectionData> _generatePieSections() {
    // Return empty list if no data
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
      final color = colors[index % colors.length];
      
      return PieChartSectionData(
        color: color,
        value: data['sales'],
        title: '${data['percentage'].toStringAsFixed(1)}%',
        radius: 50,
        titleStyle: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      );
    }).toList();
  }

  List<Widget> _buildPieLegend() {
    final colors = [
      AppColors.primary,
      AppColors.success,
      AppColors.secondary,
      AppColors.error,
      Colors.orange,
      Colors.teal,
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
      
      return Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          children: [
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                data['product'],
                style: const TextStyle(
                  fontSize: 12,
                  color: AppColors.text,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Text(
              NumberFormat.currency(
                symbol: '\$',
                decimalDigits: 0,
              ).format(data['sales']),
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.text,
              ),
            ),
          ],
        ),
      );
    }).toList();
  }

  // Placeholder methods for other tabs
  Widget _buildProductsTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Products summary card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
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
                      'Resumen de Productos',
                      style: TextStyle(
                        fontSize: 18,
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
                        color: AppColors.primaryLight.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Text(
                        '${productSalesData.length} productos',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: _buildProductStatCard(
                        'Más Vendido',
                        todayStats['topSellingItem'] ?? 'N/A',
                        Icons.trending_up,
                        AppColors.success,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildProductStatCard(
                        'Total Productos',
                        productSalesData.length.toString(),
                        Icons.inventory_2,
                        AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Products list
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Detalles de Ventas por Producto',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                ),
                const Divider(height: 1),
                if (productSalesData.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.inventory_2_outlined,
                            size: 48,
                            color: AppColors.textSubtle.withOpacity(0.5),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No hay datos de productos para este período',
                            style: TextStyle(
                              color: AppColors.textLight,
                              fontSize: 14,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: productSalesData.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final product = productSalesData[index];
                      final percentage = product['percentage'] ?? 0.0;
                      
                      return ListTile(
                        leading: Container(
                          width: 40,
                          height: 40,
                          decoration: BoxDecoration(
                            color: _getProductColor(index).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Text(
                              '${index + 1}',
                              style: TextStyle(
                                color: _getProductColor(index),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        title: Text(
                          product['product'],
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            LinearProgressIndicator(
                              value: percentage / 100,
                              backgroundColor: AppColors.border.withOpacity(0.2),
                              valueColor: AlwaysStoppedAnimation<Color>(
                                _getProductColor(index),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${percentage.toStringAsFixed(1)}% de las ventas',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textLight,
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
                              ).format(product['sales']),
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Peak hours summary
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Horarios Pico',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: peakHours.map((data) {
                    final hour = data['hour'] as int;
                    final orders = data['orders'] as int;
                    return Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(
                            color: AppColors.primary.withOpacity(0.2),
                          ),
                        ),
                        child: Column(
                          children: [
                            Icon(
                              Icons.access_time,
                              color: AppColors.primary,
                              size: 24,
                            ),
                            const SizedBox(height: 8),
                            Text(
                              '${hour.toString().padLeft(2, '0')}:00',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.text,
                              ),
                            ),
                            Text(
                              '$orders órdenes',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textLight,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          // Hourly chart
          Container(
            height: 300,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ventas por Hora',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text,
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: _buildHourlyChart(hourlyData),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          
          // Hourly details table
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Detalles por Hora',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                ),
                const Divider(height: 1),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: hourlyData.where((d) => (d['orders'] as int) > 0).length,
                  separatorBuilder: (context, index) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final activeHours = hourlyData.where((d) => (d['orders'] as int) > 0).toList();
                    final data = activeHours[index];
                    final hour = data['hour'] as int;
                    final sales = data['sales'] as double;
                    final orderCount = data['orders'] as int;
                    
                    return ListTile(
                      leading: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Center(
                          child: Text(
                            '${hour.toString().padLeft(2, '0')}:00',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ),
                      title: Text(
                        '$orderCount ${orderCount == 1 ? 'orden' : 'órdenes'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      subtitle: Text(
                        'Ticket promedio: ${NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(orderCount > 0 ? sales / orderCount : 0)}',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textLight,
                        ),
                      ),
                      trailing: Text(
                        NumberFormat.currency(
                          symbol: '\$',
                          decimalDigits: 0,
                        ).format(sales),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
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
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Summary cards
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        offset: const Offset(0, 2),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.table_restaurant,
                        color: AppColors.primary,
                        size: 28,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '${tableData.length}',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      Text(
                        'Mesas Activas',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        offset: const Offset(0, 2),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        Icons.trending_up,
                        color: AppColors.success,
                        size: 28,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        tableData.isNotEmpty ? (tableData.first['table'] as String) : 'N/A',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.text,
                        ),
                      ),
                      Text(
                        'Mesa Top',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          
          // Tables list
          Container(
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  offset: const Offset(0, 2),
                  blurRadius: 8,
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Text(
                    'Ventas por Mesa',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.text,
                    ),
                  ),
                ),
                const Divider(height: 1),
                if (tableData.isEmpty)
                  Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(
                            Icons.table_restaurant_outlined,
                            size: 48,
                            color: AppColors.textSubtle.withOpacity(0.5),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No hay datos de mesas para este período',
                            style: TextStyle(
                              color: AppColors.textLight,
                              fontSize: 14,
                            ),
                            textAlign: TextAlign.center,
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
                    separatorBuilder: (context, index) => const Divider(height: 1),
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
                        leading: Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            color: _getTableColor(index).withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Center(
                            child: Icon(
                              Icons.table_restaurant,
                              color: _getTableColor(index),
                              size: 24,
                            ),
                          ),
                        ),
                        title: Row(
                          children: [
                            Text(
                              tableName,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (index == 0)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: AppColors.success.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  'TOP',
                                  style: TextStyle(
                                    fontSize: 10,
                                    color: AppColors.success,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            Text(
                              '$orderCount ${orderCount == 1 ? 'orden' : 'órdenes'} • ${percentage.toStringAsFixed(1)}% del total',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textLight,
                              ),
                            ),
                            Text(
                              'Ticket promedio: ${NumberFormat.currency(symbol: '\$', decimalDigits: 0).format(avgTicket)}',
                              style: TextStyle(
                                fontSize: 12,
                                color: AppColors.textLight,
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
                                fontSize: 16,
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
          const SizedBox(height: 16),
          
          // Table performance insights
          if (tableData.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppColors.primary.withOpacity(0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.lightbulb_outline,
                    color: AppColors.primary,
                    size: 20,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Insight',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.text,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _getTableInsight(tableData),
                          style: TextStyle(
                            fontSize: 12,
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
  
  // Helper method for product stat card
  Widget _buildProductStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: color.withOpacity(0.2),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: color,
            size: 20,
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.text,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: AppColors.textLight,
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
  
  // Build hourly chart
  Widget _buildHourlyChart(List<Map<String, dynamic>> hourlyData) {
    final maxOrders = hourlyData.map((d) => d['orders'] as int).reduce(max);
    final safeMaxOrders = maxOrders > 0 ? maxOrders.toDouble() : 10.0;
    
    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: safeMaxOrders * 1.2,
        barTouchData: BarTouchData(
          enabled: true,
          touchTooltipData: BarTouchTooltipData(
            tooltipPadding: const EdgeInsets.all(8),
            tooltipMargin: 8,
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              final hour = group.x.toInt();
              final orders = rod.toY.toInt();
              final sales = hourlyData[hour]['sales'] as double;
              return BarTooltipItem(
                '${hour.toString().padLeft(2, '0')}:00\n',
                const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
                children: [
                  TextSpan(
                    text: '$orders órdenes\n',
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                    ),
                  ),
                  TextSpan(
                    text: NumberFormat.currency(
                      symbol: '\$',
                      decimalDigits: 0,
                    ).format(sales),
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
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
                        fontSize: 10,
                      ),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
              reservedSize: 30,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 30,
              interval: safeMaxOrders / 4,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Text(
                    value.toInt().toString(),
                    style: TextStyle(
                      color: AppColors.textSubtle,
                      fontSize: 10,
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
                  colors: [
                    AppColors.primary,
                    AppColors.primary.withOpacity(0.7),
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
                width: 16,
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(4),
                  topRight: Radius.circular(4),
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
  
  // Get table insight
  String _getTableInsight(List<Map<String, dynamic>> tableData) {
    if (tableData.isEmpty) return '';
    
    final topTable = tableData.first;
    final topTableName = topTable['table'] as String;
    final topTablePercentage = todayStats['totalSales'] > 0
        ? (topTable['sales'] / todayStats['totalSales'] * 100).toStringAsFixed(1)
        : '0';
    
    // Find tables with high average tickets
    final highTicketTables = tableData
        .where((t) => (t['avgTicket'] as double) > (todayStats['avgOrderValue'] * 1.5))
        .toList();
    
    if (highTicketTables.isNotEmpty) {
      return 'La mesa "$topTableName" generó el $topTablePercentage% de las ventas. '
          '${highTicketTables.length} mesa(s) tienen un ticket promedio 50% mayor al promedio general.';
    } else {
      return 'La mesa "$topTableName" fue la más activa con el $topTablePercentage% de las ventas totales.';
    }
  }
}