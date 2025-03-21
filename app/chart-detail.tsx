import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { COLORS } from '../src/theme';
import { getSales, getCurrentWeekSales, getTodaySales, SaleRecord } from '../services/storage';
import { OrderItem } from '../types';

type ChartType = 'line' | 'bar' | 'pie';
type TimePeriod = 'day' | 'week' | 'month' | 'year';

// Interface for popular item statistics
interface PopularItem {
  name: string;
  quantity: number;
  total: number;
  percentage: number;
}

// Interface for sales analytics
interface SalesAnalytics {
  totalSales: number;
  totalItems: number;
  avgTicket: number;
  mostPopularItems: PopularItem[];
  dailySales: { [date: string]: number };
  highestDailySale: { date: string; amount: number };
  lowestDailySale: { date: string; amount: number };
  itemCategories: { [key: string]: number };
}

export default function ChartDetailScreen() {
  const params = useLocalSearchParams();
  const [chartData, setChartData] = useState<any>(null);
  const [chartType, setChartType] = useState<ChartType>('line');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SaleRecord[]>([]);
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const title = params.title as string || 'Ventas por Día';
  const [period, setPeriod] = useState<string>(''); // Period type from params
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('day');

  useEffect(() => {
    if (params.chartData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(params.chartData as string));
        setChartData(decodedData);
        
        // Determine the period from the title
        if (params.title) {
          const titleStr = params.title as string;
          if (titleStr.includes('Hoy')) {
            setPeriod('today');
            setSelectedTimePeriod('day');
          } else if (titleStr.includes('Semana')) {
            setPeriod('week');
            setSelectedTimePeriod('week');
          } else {
            setPeriod('all');
            setSelectedTimePeriod('month');
          }
        }

        loadSalesData();
      } catch (error) {
        console.error('Error parsing chart data:', error);
        setLoading(false);
      }
    }
  }, [params.chartData, params.title]);

  // Add effect to update chart data when sales data changes
  useEffect(() => {
    if (salesData.length > 0) {
      generateChartData(salesData);
    }
  }, [salesData, selectedTimePeriod]);

  // Function to generate chart data from sales data
  const generateChartData = (sales: SaleRecord[]) => {
    let dateFormat: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
    
    // Adjust date format based on selected time period
    if (selectedTimePeriod === 'day') {
      dateFormat = { hour: '2-digit' };
    } else if (selectedTimePeriod === 'month') {
      dateFormat = { day: '2-digit' };
    } else if (selectedTimePeriod === 'year') {
      dateFormat = { month: 'short' };
    }
    
    // Group sales by the chosen date format
    const groupedData = sales.reduce((acc, sale) => {
      const date = new Date(sale.timestamp).toLocaleDateString('es-MX', dateFormat);
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    }, {} as { [key: string]: number });
    
    // Convert to array and sort
    const sortedData = Object.entries(groupedData)
      .sort(([dateA], [dateB]) => {
        // Simple string comparison for dates in format dd/mm
        return dateA.localeCompare(dateB);
      });
    
    const labels = sortedData.map(([date]) => date);
    const data = sortedData.map(([_, amount]) => amount);
    
    setChartData({
      labels,
      datasets: [{ data }]
    });
  };

  const loadSalesData = async () => {
    setLoading(true);
    try {
      let salesRecords: SaleRecord[] = [];
      const allSales = await getSales();
      
      // Filter sales based on selected time period
      if (selectedTimePeriod === 'day') {
        salesRecords = await getTodaySales();
      } else if (selectedTimePeriod === 'week') {
        salesRecords = await getCurrentWeekSales();
      } else if (selectedTimePeriod === 'month') {
        // Filter for the current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        salesRecords = allSales.filter(sale => {
          const saleDate = new Date(sale.timestamp);
          return saleDate >= startOfMonth;
        });
      } else if (selectedTimePeriod === 'year') {
        // Filter for the current year
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        salesRecords = allSales.filter(sale => {
          const saleDate = new Date(sale.timestamp);
          return saleDate >= startOfYear;
        });
      } else {
        salesRecords = allSales;
      }
      
      setSalesData(salesRecords);
      
      // Generate analytics from the sales data
      if (salesRecords.length > 0) {
        const analytics = generateAnalytics(salesRecords);
        setAnalytics(analytics);
      }
    } catch (error) {
      console.error('Error loading sales data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalytics = (sales: SaleRecord[]): SalesAnalytics => {
    // Calculate total sales amount
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    
    // Count total items sold
    const totalItems = sales.reduce((sum, sale) => 
      sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
    
    // Calculate average ticket value
    const avgTicket = totalSales / sales.length;
    
    // Group sales by date
    const dailySales: { [date: string]: number } = {};
    sales.forEach(sale => {
      const date = new Date(sale.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
      dailySales[date] = (dailySales[date] || 0) + sale.total;
    });
    
    // Find highest and lowest daily sales
    const dateEntries = Object.entries(dailySales);
    const highestDaily = dateEntries.reduce((highest, [date, amount]) => 
      amount > highest.amount ? { date, amount } : highest, { date: '', amount: 0 });
    
    const lowestDaily = dateEntries.reduce((lowest, [date, amount]) => 
      (lowest.amount === 0 || amount < lowest.amount) ? { date, amount } : lowest, { date: '', amount: 0 });
    
    // Aggregate items by name to find popular items
    const itemsSummary: { [key: string]: { quantity: number; total: number } } = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!itemsSummary[item.name]) {
          itemsSummary[item.name] = { quantity: 0, total: 0 };
        }
        itemsSummary[item.name].quantity += item.quantity;
        itemsSummary[item.name].total += item.price * item.quantity;
      });
    });
    
    // Calculate item percentages and sort by quantity
    const itemEntries = Object.entries(itemsSummary);
    const totalQuantity = itemEntries.reduce((sum, [_, data]) => sum + data.quantity, 0);
    
    const popularItems: PopularItem[] = itemEntries
      .map(([name, { quantity, total }]) => ({
        name,
        quantity,
        total,
        percentage: (quantity / totalQuantity) * 100
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // Top 5 items
    
    // Group items by category (simple categories for now)
    const itemCategories: { [key: string]: number } = {
      Tacos: 0,
      Bebidas: 0,
      Consomé: 0,
      Kilogramos: 0
    };
    
    itemEntries.forEach(([name, { total }]) => {
      if (name.includes('Taco')) {
        itemCategories.Tacos += total;
      } else if (name.includes('Refresco') || name.includes('Agua') || name.includes('Café')) {
        itemCategories.Bebidas += total;
      } else if (name.includes('Consomé')) {
        itemCategories.Consomé += total;
      } else if (name.includes('Kilo')) {
        itemCategories.Kilogramos += total;
      }
    });
    
    return {
      totalSales,
      totalItems,
      avgTicket,
      mostPopularItems: popularItems,
      dailySales,
      highestDailySale: highestDaily,
      lowestDailySale: lowestDaily,
      itemCategories
    };
  };

  const renderChart = () => {
    if (!chartData || chartData.datasets[0].data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color={COLORS.subtle} />
          <Text style={styles.noDataText}>No hay datos suficientes</Text>
        </View>
      );
    }

    const chartConfig = {
      backgroundColor: COLORS.card,
      backgroundGradientFrom: COLORS.card,
      backgroundGradientTo: COLORS.card,
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(229, 185, 60, ${opacity})`, // Gold color
      labelColor: (opacity = 1) => `rgba(44, 36, 24, ${opacity})`, // Dark text color
      style: {
        borderRadius: 16
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: COLORS.primary
      }
    };

    const width = Dimensions.get('window').width - 32;

    if (chartType === 'line') {
      return (
        <LineChart
          data={chartData}
          width={width}
          height={300}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      );
    } else if (chartType === 'bar') {
      return (
        <BarChart
          data={chartData}
          width={width}
          height={300}
          chartConfig={chartConfig}
          style={styles.chart}
          fromZero
        />
      );
    } else if (chartType === 'pie' && analytics) {
      // Create data for pie chart from popular items
      const pieData = analytics.mostPopularItems.map((item, index) => {
        // Different colors for each segment
        const colors = ['#D9534F', '#FFC107', '#5BC0DE', '#5CB85C', '#E57373'];
        return {
          name: item.name,
          population: item.quantity,
          color: colors[index % colors.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        };
      });

      return (
        <PieChart
          data={pieData}
          width={width}
          height={220}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      );
    }
  };

  const renderChartTypeButton = (type: ChartType, label: string, icon: string) => (
    <Pressable
      style={[
        styles.chartTypeButton,
        chartType === type && styles.chartTypeButtonActive
      ]}
      onPress={() => setChartType(type)}
    >
      <Ionicons
        name={icon as any}
        size={18}
        color={chartType === type ? 'white' : COLORS.textLight}
      />
      <Text
        style={[
          styles.chartTypeText,
          chartType === type && styles.chartTypeTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderTimePeriodButton = (timePeriod: TimePeriod, label: string) => (
    <Pressable
      style={[
        styles.timePeriodButton,
        selectedTimePeriod === timePeriod && styles.timePeriodButtonActive
      ]}
      onPress={() => {
        setSelectedTimePeriod(timePeriod);
        setLoading(true);
        // Use setTimeout to allow the UI to update before loading data
        setTimeout(() => {
          loadSalesData();
        }, 50);
      }}
    >
      <Text
        style={[
          styles.timePeriodText,
          selectedTimePeriod === timePeriod && styles.timePeriodTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  const renderMostPopularItems = () => {
    if (!analytics || analytics.mostPopularItems.length === 0) return null;

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Artículos Más Vendidos</Text>
        
        {analytics.mostPopularItems.map((item, index) => (
          <View key={index} style={styles.popularItem}>
            <View style={styles.popularItemRank}>
              <Text style={styles.rankText}>{index + 1}</Text>
            </View>
            <View style={styles.popularItemInfo}>
              <Text style={styles.popularItemName}>{item.name}</Text>
              <Text style={styles.popularItemSubtitle}>
                {item.quantity} unidades · ${item.total.toFixed(2)}
              </Text>
            </View>
            <View style={styles.popularItemPercentage}>
              <Text style={styles.percentageText}>{item.percentage.toFixed(1)}%</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderSalesBreakdown = () => {
    if (!analytics) return null;

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Desglose de Ventas</Text>
        
        <View style={styles.statRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="receipt-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Ventas Totales</Text>
            <Text style={styles.statValue}>{salesData.length}</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="fast-food-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Artículos Vendidos</Text>
            <Text style={styles.statValue}>{analytics.totalItems}</Text>
          </View>
          
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="cash-outline" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.statLabel}>Ticket Promedio</Text>
            <Text style={styles.statValue}>${analytics.avgTicket.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDailyHighlights = () => {
    if (!analytics || !analytics.highestDailySale.date) return null;

    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Datos por Día</Text>
        
        <View style={styles.highlightRow}>
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Ionicons name="trending-up" size={18} color={COLORS.success} />
              <Text style={styles.highlightTitle}>Mayor Venta</Text>
            </View>
            <Text style={styles.highlightDate}>{analytics.highestDailySale.date}</Text>
            <Text style={styles.highlightAmount}>${analytics.highestDailySale.amount.toFixed(2)}</Text>
          </View>
          
          <View style={styles.highlightCard}>
            <View style={styles.highlightHeader}>
              <Ionicons name="trending-down" size={18} color={COLORS.error} />
              <Text style={styles.highlightTitle}>Menor Venta</Text>
            </View>
            <Text style={styles.highlightDate}>{analytics.lowestDailySale.date}</Text>
            <Text style={styles.highlightAmount}>${analytics.lowestDailySale.amount.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderCategoryBreakdown = () => {
    if (!analytics) return null;
    
    const categories = Object.entries(analytics.itemCategories)
      .filter(([_, amount]) => amount > 0)
      .sort(([_, a], [__, b]) => b - a);
      
    if (categories.length === 0) return null;
    
    return (
      <View style={styles.detailSection}>
        <Text style={styles.sectionTitle}>Ventas por Categoría</Text>
        
        {categories.map(([category, amount], index) => (
          <View key={index} style={styles.categoryRow}>
            <Text style={styles.categoryName}>{category}</Text>
            <View style={styles.categoryBarContainer}>
              <View 
                style={[
                  styles.categoryBar, 
                  { width: `${(amount / analytics.totalSales) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.categoryAmount}>${amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <Stack.Screen options={{ title: title }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <Stack.Screen
        options={{
          title: title,
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
            </Pressable>
          )
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Time period filter buttons */}
        <View style={styles.timePeriodContainer}>
          {renderTimePeriodButton('day', 'Día')}
          {renderTimePeriodButton('week', 'Semana')}
          {renderTimePeriodButton('month', 'Mes')}
          {renderTimePeriodButton('year', 'Año')}
        </View>
        
        <View style={styles.chartTypeContainer}>
          {renderChartTypeButton('line', 'Línea', 'trending-up-outline')}
          {renderChartTypeButton('bar', 'Barras', 'stats-chart-outline')}
          {renderChartTypeButton('pie', 'Torta', 'pie-chart-outline')}
        </View>

        <View style={styles.chartWrapper}>
          {renderChart()}
          {chartType === 'pie' && (
            <Text style={styles.chartCaption}>Distribución de Artículos Vendidos</Text>
          )}
        </View>

        <View style={styles.totalSummary}>
          <Text style={styles.totalLabel}>Total de Ventas</Text>
          <Text style={styles.totalValue}>
            ${analytics ? analytics.totalSales.toFixed(2) : '0.00'}
          </Text>
        </View>

        {/* Sales breakdown section */}
        {renderSalesBreakdown()}
        
        {/* Most popular items section */}
        {renderMostPopularItems()}
        
        {/* Daily highlights section */}
        {renderDailyHighlights()}
        
        {/* Category breakdown section */}
        {renderCategoryBreakdown()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  timePeriodButtonActive: {
    backgroundColor: COLORS.primary,
  },
  timePeriodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  timePeriodTextActive: {
    color: 'white',
  },
  chartTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chartTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: COLORS.subtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chartTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  chartTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginLeft: 6,
  },
  chartTypeTextActive: {
    color: 'white',
  },
  chartWrapper: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chart: {
    borderRadius: 16,
    marginVertical: 8,
  },
  chartCaption: {
    textAlign: 'center',
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 8,
  },
  noDataContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
  totalSummary: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  totalLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D9534F', // Using the same red color for consistency
  },
  detailSection: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  popularItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: COLORS.subtle,
    borderRadius: 12,
    padding: 12,
  },
  popularItemRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  popularItemInfo: {
    flex: 1,
  },
  popularItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  popularItemSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  popularItemPercentage: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  highlightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  highlightCard: {
    flex: 1,
    backgroundColor: COLORS.subtle,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 6,
  },
  highlightDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  highlightAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    width: 80,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  categoryBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: COLORS.subtle,
    borderRadius: 8,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  categoryBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  categoryAmount: {
    width: 70,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'right',
  },
});