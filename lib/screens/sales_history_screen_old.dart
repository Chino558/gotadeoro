import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import 'dart:math';
import '../theme/app_colors.dart';
import '../services/supabase_service.dart';
import '../models/order_item.dart';
import 'order_details_screen.dart';

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
    'tableEfficiency': 0.0,
  };

  List<Map<String, dynamic>> orderHistory = [];
  List<Map<String, dynamic>> salesData = [];
  Map<String, dynamic> productStats = {};
  Map<int, Map<String, dynamic>> tableStats = {};

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadDataFromSupabase();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadDataFromSupabase() async {
    setState(() => _isLoading = true);

    try {
      // Get date range based on selected period
      DateTime startDate;
      DateTime endDate = DateTime.now();

      switch (selectedPeriod) {
        case 'Hoy':
          startDate = DateTime(endDate.year, endDate.month, endDate.day);
          break;
        case 'Semana':
          startDate = endDate.subtract(Duration(days: 7));
          break;
        case 'Mes':
          startDate = DateTime(endDate.year, endDate.month - 1, endDate.day);
          break;
        case 'Año':
          startDate = DateTime(endDate.year - 1, endDate.month, endDate.day);
          break;
        default:
          startDate = DateTime(endDate.year, endDate.month, endDate.day);
      }

      // Fetch sales data from Supabase
      final response = await SupabaseService.supabase
          .from('sales')
          .select()
          .gte('timestamp', startDate.toIso8601String())
          .lte('timestamp', endDate.toIso8601String())
          .order('timestamp', ascending: false);

      salesData = List<Map<String, dynamic>>.from(response);

      // Process the data
      _calculateStats();
      _processOrderHistory();
      _calculateProductStats();
      _calculateTableStats();
    } catch (error) {
      print('Error loading data from Supabase: $error');
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error al cargar datos: $error'),
          backgroundColor: AppColors.error,
        ),
      );
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _calculateStats() {
    if (salesData.isEmpty) return;

    double totalSales = 0;
    Map<String, int> itemCounts = {};
    Map<int, int> hourCounts = {};

    for (var sale in salesData) {
      totalSales += (sale['total'] ?? 0).toDouble();

      // Count items
      List<dynamic> items = sale['items'] ?? [];
      for (var item in items) {
        String itemName = item['name'] ?? 'Unknown';
        int quantity = item['quantity'] ?? 1;
        itemCounts[itemName] = (itemCounts[itemName] ?? 0) + quantity;
      }

      // Count sales by hour
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      hourCounts[timestamp.hour] = (hourCounts[timestamp.hour] ?? 0) + 1;
    }

    // Find peak hour
    int peakHour = 0;
    int maxSales = 0;
    hourCounts.forEach((hour, count) {
      if (count > maxSales) {
        maxSales = count;
        peakHour = hour;
      }
    });

    // Find top selling item
    String topItem = 'N/A';
    int maxItemCount = 0;
    itemCounts.forEach((item, count) {
      if (count > maxItemCount) {
        maxItemCount = count;
        topItem = item;
      }
    });

    setState(() {
      todayStats = {
        'totalSales': totalSales,
        'orderCount': salesData.length,
        'avgOrderValue':
            salesData.isNotEmpty ? totalSales / salesData.length : 0,
        'topSellingItem': topItem,
        'peakHour': '$peakHour:00',
        'tableEfficiency': 0.82, // This would need more complex calculation
      };
    });
  }

  void _processOrderHistory() {
    orderHistory =
        salesData.map((sale) {
          List<dynamic> items = sale['items'] ?? [];
          return {
            'id': sale['id'],
            'tableName': sale['table_name'] ?? 'Mesa ${sale['table_number']}',
            'timestamp': DateTime.parse(sale['timestamp']),
            'items': items.length,
            'total': (sale['total'] ?? 0).toDouble(),
            'synced': true, // All data from Supabase is synced
          };
        }).toList();
  }

  void _calculateProductStats() {
    Map<String, Map<String, dynamic>> products = {};

    for (var sale in salesData) {
      List<dynamic> items = sale['items'] ?? [];
      for (var item in items) {
        String name = item['name'] ?? 'Unknown';
        int quantity = item['quantity'] ?? 1;
        double price = (item['price'] ?? 0).toDouble();

        if (!products.containsKey(name)) {
          products[name] = {
            'name': name,
            'sales': 0,
            'revenue': 0.0,
            'growth': 0.0, // Would need historical data for real growth
          };
        }

        products[name]!['sales'] = products[name]!['sales'] + quantity;
        products[name]!['revenue'] =
            products[name]!['revenue'] + (price * quantity);
      }
    }

    productStats = products;
  }

  void _calculateTableStats() {
    Map<int, Map<String, dynamic>> tables = {};

    for (var sale in salesData) {
      int tableNumber = sale['table_number'] ?? 0;
      double total = (sale['total'] ?? 0).toDouble();

      if (!tables.containsKey(tableNumber)) {
        tables[tableNumber] = {
          'name': sale['table_name'] ?? 'Mesa $tableNumber',
          'orders': 0,
          'revenue': 0.0,
          'turnover': 0.0,
        };
      }

      tables[tableNumber]!['orders'] = tables[tableNumber]!['orders'] + 1;
      tables[tableNumber]!['revenue'] = tables[tableNumber]!['revenue'] + total;
    }

    tableStats = tables;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.card,
        elevation: 2.0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back, size: 24, color: AppColors.text),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text(
          'Análisis de Ventas',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            color: AppColors.text,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, size: 24, color: AppColors.text),
            onPressed: _loadDataFromSupabase,
          ),
        ],
      ),
      body: SafeArea(
        child:
            _isLoading
                ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircularProgressIndicator(color: AppColors.primary),
                      const SizedBox(height: 24), // Increased spacing
                      Text(
                        'Cargando datos de Supabase...',
                        style: TextStyle(
                          color: AppColors.textLight,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                )
                : Column(
                  children: [
                    // Period selector
                    Container(
                      padding: const EdgeInsets.symmetric(
                        vertical: 8.0,
                        horizontal: 16.0,
                      ),
                      color:
                          AppColors
                              .card, // Match AppBar or use a subtle divider
                      child: SizedBox(
                        // Use SizedBox for better height control
                        height: 40, // Increased height
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children:
                              ['Hoy', 'Semana', 'Mes', 'Año'].map((period) {
                                final isSelected = selectedPeriod == period;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8.0),
                                  child: ChoiceChip(
                                    label: Text(
                                      period,
                                      style: TextStyle(
                                        fontSize: 13, // Increased font size
                                        color:
                                            isSelected
                                                ? Colors.white
                                                : AppColors.text,
                                      ),
                                    ),
                                    selected: isSelected,
                                    backgroundColor:
                                        AppColors
                                            .background, // Softer background for unselected
                                    selectedColor: AppColors.primary,
                                    labelPadding: const EdgeInsets.symmetric(
                                      horizontal: 12.0,
                                      vertical: 4.0,
                                    ), // Added padding
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(
                                        20.0,
                                      ), // Softer corners
                                      side: BorderSide(
                                        color:
                                            isSelected
                                                ? AppColors.primary
                                                : AppColors.borderLight,
                                      ),
                                    ),
                                    onSelected: (selected) {
                                      if (selected) {
                                        setState(() {
                                          selectedPeriod = period;
                                        });
                                        _loadDataFromSupabase();
                                      }
                                    },
                                  ),
                                );
                              }).toList(),
                        ),
                      ),
                    ),
                    // Quick Stats Cards - Now with real data
                    Container(
                      height: 120, // Increased from 110 to fix overflow
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        children: [
                          _buildQuickStatCard(
                            'Ventas Totales',
                            '\$${todayStats['totalSales'].toStringAsFixed(0)}',
                            Icons.attach_money,
                            AppColors.success, // Icon color
                            salesData.isEmpty
                                ? '0%'
                                : '+${(todayStats['totalSales'] / 100).toStringAsFixed(1)}%', // Subtitle/Change
                            isChange: true,
                          ),
                          GestureDetector(
                            onTap: () {
                              setState(() {
                                showOrdersList = !showOrdersList;
                              });
                            },
                            child: _buildQuickStatCard(
                              'Órdenes',
                              '${todayStats['orderCount']}',
                              Icons.receipt_long,
                              AppColors.primary, // Icon color
                              salesData.isEmpty
                                  ? '0'
                                  : '${salesData.length}', // Subtitle/Change
                              isChange: false, // This is more of a count
                            ),
                          ),
                          _buildQuickStatCard(
                            'Ticket Promedio',
                            '\$${todayStats['avgOrderValue'].toStringAsFixed(0)}',
                            Icons.shopping_cart,
                            Colors.purple, // Icon color
                            'Promedio', // Subtitle/Change
                            isChange: false,
                          ),
                          _buildQuickStatCard(
                            'Hora Pico',
                            todayStats['peakHour'],
                            Icons.access_time,
                            Colors.orange, // Icon color
                            'Más ventas', // Subtitle/Change
                            isChange: false,
                          ),
                        ],
                      ),
                    ),

                    // Tab Bar
                    Container(
                      color: AppColors.card,
                      child: TabBar(
                        controller: _tabController,
                        labelColor: AppColors.primary,
                        unselectedLabelColor: AppColors.textLight,
                        indicatorColor: AppColors.primary,
                        labelStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                        tabs: const [
                          Tab(text: 'Ventas'),
                          Tab(text: 'Productos'),
                          Tab(text: 'Horarios'),
                          Tab(text: 'Mesas'),
                        ],
                      ),
                    ),

                    // Tab Content or Orders List
                    if (showOrdersList)
                      Expanded(child: _buildOrdersList())
                    else
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

  Widget _buildQuickStatCard(
    String title,
    String value,
    IconData icon,
    Color iconColor, // Renamed for clarity
    String subtitleOrChange, { // More generic name
    bool isChange =
        true, // Optional parameter to denote if it's a "change" metric
  }) {
    return Container(
      width: 155, // Slightly wider
      margin: const EdgeInsets.only(right: 12),
      padding: const EdgeInsets.all(16), // Increased padding
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(
          16.0,
        ), // Consistent with other potential cards
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            offset: const Offset(0, 2),
            blurRadius: 8, // Softer shadow
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 28, color: iconColor), // Increased icon size
              if (subtitleOrChange.isNotEmpty)
                Text(
                  subtitleOrChange,
                  style: TextStyle(
                    fontSize: 12, // Increased font size
                    color:
                        isChange
                            ? AppColors.success
                            : AppColors.textSubtle, // Conditional color
                    fontWeight: FontWeight.w600,
                  ),
                ),
            ],
          ),
          // const SizedBox(height: 8), // Adjusted spacing, MainAxisAlignment.spaceBetween handles it
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 20, // Slightly larger value
                  fontWeight: FontWeight.bold,
                  color: AppColors.text,
                  // height: 1.1, // Often not needed, default is fine
                ),
              ),
              const SizedBox(height: 2),
              Text(
                title,
                style: TextStyle(
                  fontSize: 13, // Increased title font size
                  color: AppColors.textLight,
                  // height: 1.2, // Often not needed
                ),
              ),
            ],
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
          // Sales trend chart with real data
          Container(
            height: 270, // Slightly more height for better spacing
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
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
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10, // Increased padding
                            vertical: 5, // Increased padding
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primaryLight.withOpacity(
                              0.3,
                            ), // Slightly more opacity
                            borderRadius: BorderRadius.circular(
                              16,
                            ), // Softer radius
                          ),
                          child: Text(
                            'Datos Reales',
                            style: TextStyle(
                              fontSize: 11, // Increased font size
                              color:
                                  AppColors
                                      .primaryDark, // Darker for better contrast
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          '${salesData.length} ventas',
                          style: TextStyle(
                            fontSize: 12, // Increased font size
                            color: AppColors.textLight,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20), // Increased spacing
                Expanded(
                  child:
                      salesData.isEmpty
                          ? Center(
                            child: Column(
                              // Added icon for empty state
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
                                    fontSize: 14, // Increased font size
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                          : LineChart(
                            LineChartData(
                              gridData: FlGridData(
                                show: true,
                                drawVerticalLine: true,
                                horizontalInterval:
                                    _calculateHorizontalInterval(), // Dynamic interval
                                verticalInterval:
                                    1, // Keep as is or make dynamic if needed
                                getDrawingHorizontalLine: (value) {
                                  return FlLine(
                                    color: AppColors.border.withOpacity(
                                      0.08,
                                    ), // Softer grid lines
                                    strokeWidth: 1,
                                  );
                                },
                                getDrawingVerticalLine: (value) {
                                  return FlLine(
                                    color: AppColors.border.withOpacity(
                                      0.08,
                                    ), // Softer grid lines
                                    strokeWidth: 1,
                                  );
                                },
                              ),
                              titlesData: FlTitlesData(
                                leftTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 45, // Increased reserved size
                                    interval:
                                        _calculateYAxisLabelStep(), // Control label frequency
                                    getTitlesWidget: (value, meta) {
                                      // Don't show label for 0 if other values exist, or if it's the max value (often cramped)
                                      if (value == 0 && meta.max > 0)
                                        return const SizedBox.shrink();
                                      if (value == meta.max &&
                                          meta.max != meta.min)
                                        return const SizedBox.shrink();

                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          right: 4.0,
                                        ),
                                        child: Text(
                                          NumberFormat.compactCurrency(
                                            symbol: '\$',
                                          ).format(value),
                                          style: TextStyle(
                                            fontSize: 11, // Increased font size
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
                                    reservedSize: 30, // Increased reserved size
                                    interval: _calculateXAxisLabelInterval(),
                                    getTitlesWidget: (value, meta) {
                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          top: 6.0,
                                        ),
                                        child: Text(
                                          _getTimeLabel(value.toInt()),
                                          style: TextStyle(
                                            fontSize: 11, // Increased font size
                                            color: AppColors.textSubtle,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              borderData: FlBorderData(
                                show: true,
                                border: Border.all(
                                  color: AppColors.border.withOpacity(
                                    0.15,
                                  ), // Slightly more visible border
                                ),
                              ),
                              minX: 0,
                              maxX: _getMaxX(),
                              minY: 0,
                              maxY: _getMaxY(),
                              lineBarsData: [
                                LineChartBarData(
                                  spots: _generateSalesDataSpots(),
                                  isCurved: true,
                                  color: AppColors.primary,
                                  barWidth: 3,
                                  dotData: FlDotData(
                                    show: true,
                                    getDotPainter: (
                                      spot,
                                      percent,
                                      barData,
                                      index,
                                    ) {
                                      return FlDotCirclePainter(
                                        radius: 4,
                                        color: AppColors.primary,
                                        strokeWidth: 2,
                                        strokeColor:
                                            AppColors
                                                .card, // Use card color for stroke
                                      );
                                    },
                                  ),
                                  belowBarData: BarAreaData(
                                    show: true,
                                    color: AppColors.primary.withOpacity(0.2),
                                  ),
                                ),
                              ],
                            ),
                          ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Real data notice
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.primaryLight.withOpacity(
                0.2,
              ), // Slightly more emphasis
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
              border: Border.all(
                color: AppColors.primary.withOpacity(0.4),
              ), // Slightly stronger border
            ),
            child: Row(
              children: [
                Icon(
                  Icons.cloud_done_outlined,
                  size: 24,
                  color: AppColors.primaryDark,
                ), // Updated icon and color
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Datos en Tiempo Real',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          color: AppColors.text,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4), // Increased spacing
                      Text(
                        'Todos los datos provienen directamente de la Nube.', // Added period
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: AppColors.textLight,
                          fontSize:
                              12, // Explicitly set if bodySmall is too small
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

  Widget _buildProductsTab() {
    List<Map<String, dynamic>> products =
        productStats.values.map((e) => e as Map<String, dynamic>).toList();

    // Sort by sales count
    products.sort((a, b) => b['sales'].compareTo(a['sales']));

    // Take top 5
    if (products.length > 5) {
      products = products.sublist(0, 5);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Product performance chart
          Container(
            height: 270, // Consistent height with sales trend chart
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
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
                  'Productos Más Vendidos',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.text,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20), // Increased spacing
                Expanded(
                  child:
                      products.isEmpty
                          ? Center(
                            child: Column(
                              // Added icon for empty state
                              mainAxisAlignment: MainAxisAlignment.center,
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
                                    fontSize: 14, // Increased font size
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                          : BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY:
                                  products.isNotEmpty
                                      ? products.first['sales'].toDouble() * 1.2
                                      : 100,
                              barTouchData: BarTouchData(
                                enabled: true, // Enable touch for tooltips
                                touchTooltipData: BarTouchTooltipData(
                                  tooltipBgColor: AppColors.text.withOpacity(
                                    0.8,
                                  ),
                                  getTooltipItem: (
                                    group,
                                    groupIndex,
                                    rod,
                                    rodIndex,
                                  ) {
                                    String productName =
                                        products[group.x.toInt()]['name'];
                                    return BarTooltipItem(
                                      '$productName\n',
                                      const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                      children: <TextSpan>[
                                        TextSpan(
                                          text:
                                              (rod.toY).toInt().toString() +
                                              ' ventas',
                                          style: TextStyle(
                                            color: AppColors.primaryLight,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                              titlesData: FlTitlesData(
                                show: true,
                                leftTitles: AxisTitles(
                                  // Show Y-axis labels for sales count
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 30,
                                    interval:
                                        _calculateProductSalesYAxisInterval(
                                          products,
                                        ),
                                    getTitlesWidget: (value, meta) {
                                      if (value == 0 && meta.max > 0)
                                        return const SizedBox.shrink();
                                      if (value == meta.max &&
                                          meta.max != meta.min)
                                        return const SizedBox.shrink();
                                      return Text(
                                        value.toInt().toString(),
                                        style: TextStyle(
                                          fontSize: 10,
                                          color: AppColors.textSubtle,
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
                                    reservedSize: 30, // Adjusted reserved size
                                    getTitlesWidget: (value, meta) {
                                      if (value.toInt() < products.length) {
                                        String name =
                                            products[value.toInt()]['name'];
                                        if (name.length > 8) {
                                          // Slightly shorter truncation
                                          name = name.substring(0, 7) + '...';
                                        }
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            top: 6.0,
                                          ), // Adjusted padding
                                          child: Text(
                                            name,
                                            style: TextStyle(
                                              fontSize:
                                                  10, // Increased font size
                                              color: AppColors.textSubtle,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        );
                                      }
                                      return const Text('');
                                    },
                                  ),
                                ),
                              ),
                              gridData: FlGridData(
                                // Show horizontal grid lines
                                show: true,
                                drawVerticalLine: false,
                                horizontalInterval:
                                    _calculateProductSalesYAxisInterval(
                                      products,
                                    ),
                                getDrawingHorizontalLine: (value) {
                                  return FlLine(
                                    color: AppColors.border.withOpacity(0.08),
                                    strokeWidth: 1,
                                  );
                                },
                              ),
                              borderData: FlBorderData(
                                show: false,
                              ), // Hide border, grid is enough
                              barGroups:
                                  products.asMap().entries.map((entry) {
                                    return BarChartGroupData(
                                      x: entry.key,
                                      barRods: [
                                        BarChartRodData(
                                          toY: entry.value['sales'].toDouble(),
                                          color: AppColors.primary,
                                          width: 30,
                                          borderRadius:
                                              const BorderRadius.vertical(
                                                top: Radius.circular(4),
                                              ),
                                        ),
                                      ],
                                    );
                                  }).toList(),
                            ),
                          ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Product list with real data
          if (products.isEmpty)
            Padding(
              // Use Padding for consistent spacing around the empty state message
              padding: const EdgeInsets.symmetric(
                vertical: 48.0,
                horizontal: 16.0,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.list_alt_outlined,
                      size: 48,
                      color: AppColors.textSubtle.withOpacity(0.5),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'No hay ventas de productos en este período',
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
            ...products
                .map(
                  (product) => Container(
                    margin: const EdgeInsets.only(
                      bottom: 12,
                    ), // Increased bottom margin
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ), // Adjusted padding
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(
                        16.0,
                      ), // Consistent rounding
                      boxShadow: [
                        // Adding subtle shadow for depth
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          offset: const Offset(0, 1),
                          blurRadius: 6,
                        ),
                      ],
                      // Using a softer border or removing if shadow is enough
                      // border: Border.all(
                      //   color: AppColors.border.withOpacity(0.08),
                      // ),
                    ),
                    child: Row(
                      children: [
                        // Optional: Add an icon for products if desired, e.g., based on category or a generic one
                        // Icon(Icons.fastfood_outlined, color: AppColors.primary, size: 28),
                        // const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                product['name'] as String,
                                style: Theme.of(
                                  context,
                                ).textTheme.titleSmall?.copyWith(
                                  color: AppColors.text,
                                  fontWeight:
                                      FontWeight
                                          .w600, // titleSmall is often bold already
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${product['sales']} vendidos',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColors.textLight),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16), // Added spacing
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              NumberFormat.currency(
                                symbol: '\$',
                                decimalDigits: 0,
                              ).format(product['revenue'] as double),
                              style: Theme.of(
                                context,
                              ).textTheme.titleMedium?.copyWith(
                                color:
                                    AppColors
                                        .primary, // Highlight revenue with primary color
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Ingresos', // Changed from 'Total' to 'Ingresos' (Revenue)
                              style: Theme.of(context).textTheme.bodySmall
                                  ?.copyWith(color: AppColors.textSubtle),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),
        ],
      ),
    );
  }

  Widget _buildHoursTab() {
    // Calculate hourly sales data
    Map<int, int> hourlySales = {};
    for (var sale in salesData) {
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      hourlySales[timestamp.hour] = (hourlySales[timestamp.hour] ?? 0) + 1;
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Heat map for peak hours
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
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
                      'Mapa de Calor - Ventas por Hora',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.text,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10, // Increased padding
                        vertical: 5, // Increased padding
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.primaryLight.withOpacity(
                          0.3,
                        ), // Slightly more opacity
                        borderRadius: BorderRadius.circular(
                          16,
                        ), // Softer radius
                      ),
                      child: Text(
                        'Datos Reales',
                        style: TextStyle(
                          fontSize: 11, // Increased font size
                          color:
                              AppColors
                                  .primaryDark, // Darker for better contrast
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20), // Increased spacing
                _buildHeatMap(hourlySales),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Peak hours analysis with real data
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
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
                      'Análisis de Horas Pico',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        color: AppColors.text,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 10, // Increased padding
                        vertical: 5, // Increased padding
                      ),
                      decoration: BoxDecoration(
                        color: AppColors.success.withOpacity(
                          0.15,
                        ), // Slightly adjusted opacity
                        borderRadius: BorderRadius.circular(
                          16,
                        ), // Softer radius
                      ),
                      child: Text(
                        'Actualizado',
                        style: TextStyle(
                          fontSize: 11, // Increased font size
                          color: AppColors.success, // Kept success color
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16), // Increased spacing
                if (salesData.isEmpty)
                  Padding(
                    // Added padding for empty state
                    padding: const EdgeInsets.symmetric(vertical: 32.0),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.hourglass_empty_outlined,
                            size: 40,
                            color: AppColors.textSubtle.withOpacity(0.5),
                          ),
                          const SizedBox(height: 12),
                          Text(
                            'No hay datos de ventas para analizar',
                            style: TextStyle(
                              fontSize: 14, // Increased font size
                              color: AppColors.textLight,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  )
                else ...[
                  _buildPeakHourRow(
                    'Mañana',
                    '07:00 - 11:00',
                    '${_getSalesForPeriod(7, 11)} ventas',
                    salesData.isEmpty
                        ? 0
                        : _getSalesForPeriod(7, 11) / salesData.length,
                  ),
                  _buildPeakHourRow(
                    'Mediodía',
                    '11:00 - 14:00',
                    '${_getSalesForPeriod(11, 14)} ventas',
                    salesData.isEmpty
                        ? 0
                        : _getSalesForPeriod(11, 14) / salesData.length,
                  ),
                  _buildPeakHourRow(
                    'Tarde',
                    '14:00 - 17:00',
                    '${_getSalesForPeriod(14, 17)} ventas',
                    salesData.isEmpty
                        ? 0
                        : _getSalesForPeriod(14, 17) / salesData.length,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTablesTab() {
    List<Map<String, dynamic>> tables =
        tableStats.values.map((e) => e as Map<String, dynamic>).toList();

    // Sort by revenue
    tables.sort((a, b) => b['revenue'].compareTo(a['revenue']));

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Table efficiency chart
          Container(
            height: 270, // Consistent height
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16.0), // Consistent rounding
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
                  'Ventas por Mesa',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppColors.text,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 20), // Increased spacing
                Expanded(
                  child:
                      tables.isEmpty
                          ? Center(
                            child: Column(
                              // Added icon for empty state
                              mainAxisAlignment: MainAxisAlignment.center,
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
                                    fontSize: 14, // Increased font size
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          )
                          : BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY:
                                  tables.isNotEmpty
                                      ? tables.first['revenue'].toDouble() * 1.2
                                      : 100,
                              barTouchData: BarTouchData(
                                // Enable touch for tooltips
                                enabled: true,
                                touchTooltipData: BarTouchTooltipData(
                                  tooltipBgColor: AppColors.text.withOpacity(
                                    0.8,
                                  ),
                                  getTooltipItem: (
                                    group,
                                    groupIndex,
                                    rod,
                                    rodIndex,
                                  ) {
                                    String tableName =
                                        tables[group.x.toInt()]['name'];
                                    return BarTooltipItem(
                                      '$tableName\n',
                                      const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                      children: <TextSpan>[
                                        TextSpan(
                                          text: '\$${(rod.toY).toInt()}',
                                          style: TextStyle(
                                            color: AppColors.primaryLight,
                                            fontSize: 11,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                      ],
                                    );
                                  },
                                ),
                              ),
                              titlesData: FlTitlesData(
                                show: true,
                                leftTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    reservedSize: 45, // Adjusted size
                                    interval:
                                        _calculateTableRevenueYAxisInterval(
                                          tables,
                                        ), // Dynamic interval
                                    getTitlesWidget: (value, meta) {
                                      if (value == 0 && meta.max > 0)
                                        return const SizedBox.shrink();
                                      if (value == meta.max &&
                                          meta.max != meta.min)
                                        return const SizedBox.shrink();
                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          right: 4.0,
                                        ),
                                        child: Text(
                                          NumberFormat.compactCurrency(
                                            symbol: '\$',
                                          ).format(value),
                                          style: TextStyle(
                                            fontSize: 10, // Adjusted font size
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
                                    reservedSize: 30, // Adjusted size
                                    getTitlesWidget: (value, meta) {
                                      if (value.toInt() < tables.length) {
                                        return Padding(
                                          padding: const EdgeInsets.only(
                                            top: 6.0,
                                          ),
                                          child: Text(
                                            tables[value.toInt()]['name'],
                                            style: TextStyle(
                                              fontSize:
                                                  10, // Adjusted font size
                                              color: AppColors.textSubtle,
                                              fontWeight: FontWeight.w500,
                                            ),
                                          ),
                                        );
                                      }
                                      return const Text('');
                                    },
                                  ),
                                ),
                              ),
                              gridData: FlGridData(
                                // Show horizontal grid lines
                                show: true,
                                drawVerticalLine: false,
                                horizontalInterval:
                                    _calculateTableRevenueYAxisInterval(tables),
                                getDrawingHorizontalLine: (value) {
                                  return FlLine(
                                    color: AppColors.border.withOpacity(0.08),
                                    strokeWidth: 1,
                                  );
                                },
                              ),
                              borderData: FlBorderData(
                                show: false,
                              ), // Hide border
                              barGroups:
                                  tables.asMap().entries.map((entry) {
                                    return BarChartGroupData(
                                      x: entry.key,
                                      barRods: [
                                        BarChartRodData(
                                          toY:
                                              entry.value['revenue'].toDouble(),
                                          color: AppColors.primary,
                                          width: 30,
                                          borderRadius:
                                              const BorderRadius.vertical(
                                                top: Radius.circular(4),
                                              ),
                                        ),
                                      ],
                                    );
                                  }).toList(),
                            ),
                          ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Table statistics
          if (tables.isEmpty)
            Padding(
              // Use Padding for consistent spacing
              padding: const EdgeInsets.symmetric(
                vertical: 48.0,
                horizontal: 16.0,
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.deck_outlined,
                      size: 48,
                      color: AppColors.textSubtle.withOpacity(0.5),
                    ), // Table related icon
                    const SizedBox(height: 12),
                    Text(
                      'No hay datos de mesas en este período',
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
            ...tables
                .map(
                  (table) => Container(
                    margin: const EdgeInsets.only(
                      bottom: 12,
                    ), // Increased bottom margin
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ), // Adjusted padding
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(
                        16.0,
                      ), // Consistent rounding
                      boxShadow: [
                        // Adding subtle shadow for depth
                        BoxShadow(
                          color: Colors.black.withOpacity(0.04),
                          offset: const Offset(0, 1),
                          blurRadius: 6,
                        ),
                      ],
                      // border: Border.all(
                      //   color: AppColors.border.withOpacity(0.08),
                      // ),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 44, // Slightly larger
                          height: 44, // Slightly larger
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(
                              0.1,
                            ), // Softer primary background
                            borderRadius: BorderRadius.circular(
                              12.0,
                            ), // Softer radius
                          ),
                          child: Center(
                            child: Icon(
                              Icons
                                  .table_restaurant_outlined, // Using outlined version
                              size: 24, // Increased icon size
                              color:
                                  AppColors
                                      .primaryDark, // Darker primary for better contrast
                            ),
                          ),
                        ),
                        const SizedBox(width: 16), // Increased spacing
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                table['name'] as String,
                                style: Theme.of(context).textTheme.titleSmall
                                    ?.copyWith(color: AppColors.text),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                '${table['orders']} órdenes',
                                style: Theme.of(context).textTheme.bodySmall
                                    ?.copyWith(color: AppColors.textLight),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16), // Added spacing
                        Text(
                          NumberFormat.currency(
                            symbol: '\$',
                            decimalDigits: 0,
                          ).format(table['revenue'] as double),
                          style: Theme.of(
                            context,
                          ).textTheme.titleMedium?.copyWith(
                            color: AppColors.primary, // Highlight revenue
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                )
                .toList(),

          const SizedBox(height: 16),

          // Summary metrics from real data
          if (tables.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.cardLight.withOpacity(
                  0.7,
                ), // Using cardLight for a subtle difference
                borderRadius: BorderRadius.circular(
                  16.0,
                ), // Consistent rounding
                // border: Border.all(color: AppColors.primary.withOpacity(0.2)), // Optional: softer border
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    offset: const Offset(0, 1),
                    blurRadius: 5,
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    'Resumen del Período',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.text,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 16), // Increased spacing
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildMetricColumn(
                        'Total Mesas',
                        '${tables.length}',
                        Icons.table_restaurant,
                      ),
                      _buildMetricColumn(
                        'Total Órdenes',
                        '${salesData.length}',
                        Icons.receipt,
                      ),
                      _buildMetricColumn(
                        'Promedio/Mesa',
                        '\$${(todayStats['totalSales'] / (tables.isEmpty ? 1 : tables.length)).toStringAsFixed(0)}',
                        Icons.attach_money,
                      ),
                    ],
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildOrdersList() {
    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 8.0,
            vertical: 4.0,
          ), // Reduced padding to mimic AppBar
          decoration: BoxDecoration(
            color: AppColors.card,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                offset: const Offset(0, 2),
                blurRadius: 4,
              ),
            ],
          ),
          child: Row(
            children: [
              IconButton(
                icon: Icon(
                  Icons.arrow_back,
                  size: 24,
                  color: AppColors.text,
                ), // Consistent icon size
                onPressed: () {
                  setState(() {
                    showOrdersList = false;
                  });
                },
              ),
              const SizedBox(width: 8), // Spacing after back button
              Text(
                'Historial de Ventas',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  // Themed title
                  color: AppColors.text,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10, // Adjusted padding
                  vertical: 5, // Adjusted padding
                ),
                decoration: BoxDecoration(
                  color: AppColors.success.withOpacity(
                    0.15,
                  ), // Adjusted opacity
                  borderRadius: BorderRadius.circular(16), // Softer radius
                ),
                child: Text(
                  'Desde Nube',
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              const SizedBox(width: 8), // Added trailing space
            ],
          ),
        ),

        // Order list
        Expanded(
          child:
              orderHistory.isEmpty
                  ? Padding(
                    // Use Padding for consistent spacing
                    padding: const EdgeInsets.symmetric(
                      vertical: 48.0,
                      horizontal: 16.0,
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.receipt_long_outlined,
                            size: 48,
                            color: AppColors.textSubtle.withOpacity(0.5),
                          ), // Order related icon
                          const SizedBox(height: 12),
                          Text(
                            'No hay órdenes en este período',
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
                  : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: orderHistory.length,
                    itemBuilder: (context, index) {
                      final order = orderHistory[index];
                      return GestureDetector(
                        onTap: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder:
                                  (context) => OrderDetailsScreen(order: order),
                            ),
                          );
                        },
                        child: Container(
                          margin: const EdgeInsets.only(
                            bottom: 12,
                          ), // Increased margin
                          padding: const EdgeInsets.symmetric(
                            horizontal: 16,
                            vertical: 12,
                          ), // Adjusted padding
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(
                              16.0,
                            ), // Consistent rounding
                            boxShadow: [
                              // Adding subtle shadow
                              BoxShadow(
                                color: Colors.black.withOpacity(0.04),
                                offset: const Offset(0, 1),
                                blurRadius: 6,
                              ),
                            ],
                            // border: Border.all(
                            //   color: AppColors.border.withOpacity(0.08),
                            // ),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 44, // Slightly larger
                                height: 44, // Slightly larger
                                decoration: BoxDecoration(
                                  color: AppColors.primary.withOpacity(
                                    0.1,
                                  ), // Softer primary background
                                  borderRadius: BorderRadius.circular(
                                    12.0,
                                  ), // Softer radius
                                ),
                                child: Center(
                                  child: Text(
                                    '${index + 1}',
                                    style: Theme.of(
                                      context,
                                    ).textTheme.titleSmall?.copyWith(
                                      color: AppColors.primaryDark,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 16), // Increased spacing
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.center,
                                      children: [
                                        Flexible(
                                          // Allow table name to wrap if too long
                                          child: Text(
                                            order['tableName'] as String,
                                            style: Theme.of(
                                              context,
                                            ).textTheme.titleSmall?.copyWith(
                                              color: AppColors.text,
                                            ),
                                            overflow: TextOverflow.ellipsis,
                                            maxLines: 1,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                            horizontal: 8, // Adjusted padding
                                            vertical: 3, // Adjusted padding
                                          ),
                                          decoration: BoxDecoration(
                                            color: AppColors.success
                                                .withOpacity(
                                                  0.15,
                                                ), // Adjusted opacity
                                            borderRadius: BorderRadius.circular(
                                              16,
                                            ), // Softer radius
                                          ),
                                          child: Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              Icon(
                                                Icons
                                                    .cloud_done_outlined, // Outlined icon
                                                size: 12, // Slightly larger
                                                color: AppColors.success,
                                              ),
                                              const SizedBox(
                                                width: 4,
                                              ), // Increased spacing
                                              Text(
                                                'Sincronizado',
                                                style: TextStyle(
                                                  fontSize:
                                                      10, // Increased font size
                                                  color: AppColors.success,
                                                  fontWeight: FontWeight.w500,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(
                                      height: 4,
                                    ), // Increased spacing
                                    Text(
                                      '${order['items']} artículos • ${DateFormat('HH:mm').format(order['timestamp'] as DateTime)}',
                                      style: Theme.of(
                                        context,
                                      ).textTheme.bodySmall?.copyWith(
                                        color: AppColors.textLight,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16), // Added spacing
                              Text(
                                NumberFormat.currency(
                                  symbol: '\$',
                                  decimalDigits: 0,
                                ).format(order['total'] as double),
                                style: Theme.of(
                                  context,
                                ).textTheme.titleMedium?.copyWith(
                                  color:
                                      AppColors
                                          .text, // Keep text color, or use primary for emphasis
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
        ),
      ],
    );
  }

  // Helper methods
  Widget _buildHeatMap(Map<int, int> hourlySales) {
    List<Widget> rows = [];
    List<int> hours = List.generate(24, (i) => i);

    // Create heat map grid
    for (int row = 0; row < 6; row++) {
      List<Widget> cells = [];
      for (int col = 0; col < 4; col++) {
        int hour = row * 4 + col;
        if (hour < 24) {
          int sales = hourlySales[hour] ?? 0;
          double intensity =
              sales > 0
                  ? (sales /
                      (hourlySales.values.isEmpty
                          ? 1
                          : hourlySales.values.reduce(max)))
                  : 0;

          cells.add(
            Expanded(
              child: Container(
                height: 40,
                margin: const EdgeInsets.all(2),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(intensity * 0.8 + 0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '$hour:00',
                        style: TextStyle(
                          fontSize: 11, // Increased font size
                          color:
                              intensity > 0.6
                                  ? Colors.white
                                  : AppColors
                                      .text, // Adjusted threshold for white text
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      if (sales > 0)
                        Text(
                          '$sales v', // Added 'v' for 'ventas'
                          style: TextStyle(
                            fontSize: 10, // Increased font size
                            color:
                                intensity > 0.6
                                    ? Colors.white.withOpacity(
                                      0.85,
                                    ) // Softer white for secondary text
                                    : AppColors
                                        .textSubtle, // Use subtle for less emphasis
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }
      }
      rows.add(Row(children: cells));
    }

    return Column(children: rows);
  }

  Widget _buildPeakHourRow(
    String period,
    String hours,
    String sales,
    double percentage,
  ) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10), // Slightly increased margin
      padding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 12,
      ), // Adjusted padding
      decoration: BoxDecoration(
        color: AppColors.cardLight.withOpacity(
          0.5,
        ), // Lighter background for differentiation
        borderRadius: BorderRadius.circular(12.0), // Softer, consistent radius
        border: Border.all(
          color: AppColors.border.withOpacity(0.05),
        ), // Subtle border
      ),
      child: Row(
        children: [
          // Optional: Add an icon based on the period (e.g., morning, noon, evening)
          // Icon(Icons.wb_sunny_outlined, color: AppColors.primary, size: 20),
          // const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  period,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    color: AppColors.text,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  hours,
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(color: AppColors.textSubtle),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16), // Added spacing
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                sales,
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color:
                      AppColors
                          .primaryDark, // Emphasize sales with primary dark
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                '${(percentage * 100).toStringAsFixed(0)}% del total', // More descriptive
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: AppColors.textSubtle),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricColumn(String label, String value, IconData icon) {
    return Column(
      mainAxisSize: MainAxisSize.min, // Ensure column takes minimum space
      children: [
        Icon(
          icon,
          size: 28,
          color: AppColors.primaryDark,
        ), // Slightly larger icon, darker color
        const SizedBox(height: 8), // Increased spacing
        Text(
          value,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            // Larger, themed text
            color: AppColors.text,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 2), // Adjusted spacing
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            // Themed text
            color: AppColors.textSubtle,
          ),
        ),
      ],
    );
  }

  double _calculateHorizontalInterval() {
    // Basic example: adjust based on salesData length or date range
    // A more robust implementation would consider the actual range of X values (e.g., hours, days)
    final spots = _generateSalesDataSpots();
    if (spots.isEmpty) return 1000; // Default if no data
    double xRange = spots.last.x - spots.first.x;
    if (xRange <= 0) return 1000;

    if (xRange > 24 * 5)
      return (xRange / 5).ceilToDouble() *
          100; // For multi-day views, adjust scale
    if (salesData.length > 50) return 5000; // Fallback based on count
    if (salesData.length > 20) return 2000;
    return 1000; // Default
  }

  double _calculateYAxisLabelStep() {
    final maxY = _getMaxY();
    if (maxY <= 0) return 100; // Default if no data

    if (maxY < 100) return 10;
    if (maxY < 500) return 50;
    if (maxY < 1000) return 100;
    if (maxY < 5000) return 500;
    if (maxY < 10000) return 1000;
    if (maxY < 50000) return 5000;
    return (maxY / 5).ceilToDouble(); // Aim for about 5-6 labels
  }

  double _calculateXAxisLabelInterval() {
    // Adjust based on the number of data points or selected period
    final spots = _generateSalesDataSpots();
    if (spots.isEmpty) return 1;

    // Aim for roughly 5-7 labels on the X-axis
    int desiredLabelCount = 6;
    double interval = (spots.length / desiredLabelCount).ceilToDouble();
    if (interval < 1) interval = 1;

    // If dealing with hours (0-23 typically)
    if (selectedPeriod == 'Hoy') {
      if (spots.length <= 6) return 1; // Show all if few spots
      if (spots.length <= 12) return 2; // Show every 2 hours
      return 4; // Show every 4 hours for a full day
    }

    return interval;
  }

  double _calculateProductSalesYAxisInterval(
    List<Map<String, dynamic>> productList,
  ) {
    if (productList.isEmpty) return 10;
    double maxSales = 0;
    for (var product in productList) {
      if ((product['sales'] as int) > maxSales) {
        maxSales = (product['sales'] as int).toDouble();
      }
    }
    if (maxSales <= 0) return 10;
    if (maxSales < 10) return 1;
    if (maxSales < 50) return 5;
    if (maxSales < 100) return 10;
    if (maxSales < 500) return 50;
    return (maxSales / 5).ceilToDouble(); // Aim for about 5-6 labels
  }

  double _calculateTableRevenueYAxisInterval(
    List<Map<String, dynamic>> tableList,
  ) {
    if (tableList.isEmpty) return 100;
    double maxRevenue = 0;
    for (var table in tableList) {
      if ((table['revenue'] as double) > maxRevenue) {
        maxRevenue = table['revenue'] as double;
      }
    }
    if (maxRevenue <= 0) return 100;

    if (maxRevenue < 100) return 10;
    if (maxRevenue < 500) return 50;
    if (maxRevenue < 1000) return 100;
    if (maxRevenue < 5000) return 500;
    if (maxRevenue < 10000) return 1000;
    if (maxRevenue < 50000) return 5000;
    return (maxRevenue / 5).ceilToDouble(); // Aim for about 5-6 labels
  }

  // Data processing helpers
  List<FlSpot> _generateSalesDataSpots() {
    if (salesData.isEmpty) return [];

    Map<int, double> hourlyTotals = {};

    for (var sale in salesData) {
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      int hour = timestamp.hour;
      double total = (sale['total'] ?? 0).toDouble();

      hourlyTotals[hour] = (hourlyTotals[hour] ?? 0) + total;
    }

    List<FlSpot> spots = [];
    hourlyTotals.forEach((hour, total) {
      spots.add(FlSpot(hour.toDouble(), total));
    });

    spots.sort((a, b) => a.x.compareTo(b.x));

    return spots;
  }

  double _getMaxX() {
    if (salesData.isEmpty) return 24;

    // Get the latest hour from sales data
    int maxHour = 0;
    for (var sale in salesData) {
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      if (timestamp.hour > maxHour) {
        maxHour = timestamp.hour;
      }
    }

    return maxHour.toDouble() + 1;
  }

  double _getMaxY() {
    if (salesData.isEmpty) return 5000;

    double maxTotal = 0;
    Map<int, double> hourlyTotals = {};

    for (var sale in salesData) {
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      int hour = timestamp.hour;
      double total = (sale['total'] ?? 0).toDouble();

      hourlyTotals[hour] = (hourlyTotals[hour] ?? 0) + total;
    }

    hourlyTotals.forEach((hour, total) {
      if (total > maxTotal) {
        maxTotal = total;
      }
    });

    return maxTotal * 1.2; // Add 20% padding
  }

  String _getTimeLabel(int value) {
    if (selectedPeriod == 'Hoy') {
      return '$value:00';
    } else {
      // For week/month/year, show dates
      if (salesData.isEmpty) return '';

      // Simple implementation - would need more complex logic for real dates
      return '$value';
    }
  }

  int _getSalesForPeriod(int startHour, int endHour) {
    int count = 0;
    for (var sale in salesData) {
      DateTime timestamp = DateTime.parse(sale['timestamp']);
      if (timestamp.hour >= startHour && timestamp.hour < endHour) {
        count++;
      }
    }
    return count;
  }

  void _showDatePicker() async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: AppColors.primary,
              onPrimary: Colors.white,
              surface: AppColors.card,
              onSurface: AppColors.text,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null && picked != selectedDate) {
      setState(() {
        selectedDate = picked;
      });
      _loadDataFromSupabase();
    }
  }
}
