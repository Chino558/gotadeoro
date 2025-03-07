import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  FlatList, 
  Pressable, 
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
  TouchableWithoutFeedback,
  useRouter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { SaleRecord, getSales, getCurrentWeekSales, getTodaySales } from '../services/storage';
import { sendSalesReportToWhatsApp } from '../services/whatsapp';
import { COLORS } from '../theme';
import { LineChart } from 'react-native-chart-kit';

const TABLE_NAMES_KEY = '@table_names';

type FilterPeriod = 'today' | 'week' | 'all';
export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today');
  const [sendingReport, setSendingReport] = useState(false);
  const [tableNames, setTableNames] = useState<{ [key: number]: string }>({});
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [{ data: [] }]
  });
  
  // Move these functions inside the component
  const handleViewChart = () => {
    router.push({
      pathname: '/chart-detail',
      params: {
        chartData: encodeURIComponent(JSON.stringify(chartData)),
        title: getFilterTitle(),
      }
    });
  };
  
  const getFilterTitle = () => {
    switch (filterPeriod) {
      case 'today':
        return 'Ventas de Hoy';
      case 'week':
        return 'Ventas de Esta Semana';
      case 'all':
        return 'Todas las Ventas';
      default:
        return 'Ventas';
    }
  };
  
  const prepareChartData = (sales: SaleRecord[]) => {
    const groupedData = sales.reduce((acc, sale) => {
      const date = new Date(sale.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
      acc[date] = (acc[date] || 0) + sale.total;
      return acc;
    }, {} as { [key: string]: number });

    const labels = Object.keys(groupedData).slice(-7);
    const data = labels.map(label => groupedData[label] || 0);

    setChartData({
      labels,
      datasets: [{ data }]
    });
  };
  
  useEffect(() => {
    loadSales();
    loadTableNames(); // Load table names when the component mounts
  }, []);
  
  useEffect(() => {
    applyFilter();
    prepareChartData(filteredSales);
  }, [sales, filterPeriod]);
  
  const loadSales = async () => {
    setLoading(true);
    try {
      const allSales = await getSales();
      setSales(allSales.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadTableNames = async () => {
    try {
      const names = await AsyncStorage.getItem(TABLE_NAMES_KEY);
      if (names) {
        setTableNames(JSON.parse(names));
      }
    } catch (error) {
      console.error('Error loading table names:', error);
    }
  };
  
  const applyFilter = async () => {
    try {
      let filtered: SaleRecord[];
      
      switch (filterPeriod) {
        case 'today':
          filtered = await getTodaySales();
          break;
        case 'week':
          filtered = await getCurrentWeekSales();
          break;
        case 'all':
        default:
          filtered = [...sales];
          break;
      }
      
      setFilteredSales(filtered.sort((a, b) => b.timestamp - a.timestamp));
    } catch (error) {
      console.error('Error filtering sales:', error);
    }
  };
  
  const sendReport = async () => {
    if (filteredSales.length === 0) return;
    
    setSendingReport(true);
    try {
      let title = 'Reporte de Ventas';
      switch (filterPeriod) {
        case 'today':
          title = 'Reporte de Ventas - Hoy';
          break;
        case 'week':
          title = 'Reporte de Ventas - Esta Semana';
          break;
        case 'all':
          title = 'Reporte de Ventas - Completo';
          break;
      }
      
      await sendSalesReportToWhatsApp(filteredSales, title);
    } catch (error) {
      console.error('Error sending report:', error);
    } finally {
      setSendingReport(false);
    }
  };
  
  const calculateTotalAmount = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  const handleViewSaleDetails = (sale: SaleRecord) => {
    router.push({
      pathname: '/bill',
      params: {
        tableNumber: sale.tableNumber,
        items: encodeURIComponent(JSON.stringify(sale.items)),
        total: sale.total,
        timestamp: sale.timestamp,
        viewOnly: true
      }
    });
  };
  
  const renderSaleItem = ({ item }: { item: SaleRecord }) => {
    const tableName = tableNames[item.tableNumber] || `Mesa ${item.tableNumber}`;
    return (
      <TouchableOpacity
        style={styles.saleItem}
        onPress={() => handleViewSaleDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <Text style={styles.saleTitle}>{tableName}</Text>
          <Text style={styles.saleTime}>{formatDate(item.timestamp)}</Text>
        </View>
        
        <View style={styles.saleDetails}>
          <Text style={styles.saleItemCount}>
            {item.items.reduce((sum, i) => sum + i.quantity, 0)} artículos
          </Text>
          <Text style={styles.saleTotal}>${item.total.toFixed(2)}</Text>
        </View>
        
        <View style={styles.saleFooter}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
          <Text style={styles.viewDetailsText}>Ver detalles</Text>
        </View>
      </TouchableOpacity>
    );
  };
  const renderFilterButton = (period: FilterPeriod, label: string) => (
    <Pressable
      style={[
        styles.filterButton,
        filterPeriod === period && styles.filterButtonActive
      ]}
      onPress={() => setFilterPeriod(period)}
    >
      <Text
        style={[
          styles.filterButtonText,
          filterPeriod === period && styles.filterButtonTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Historial de Ventas</Text>
          <Pressable 
            style={styles.refreshButton} 
            onPress={loadSales}
          >
            <Ionicons name="refresh" size={20} color={COLORS.primary} />
          </Pressable>
        </View>
        
        <View style={styles.filterContainer}>
          {renderFilterButton('today', 'Hoy')}
          {renderFilterButton('week', 'Esta Semana')}
          {renderFilterButton('all', 'Todas')}
        </View>
      </View>
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Ventas</Text>
          <Text style={styles.summaryValue}>{filteredSales.length}</Text>
        </View>
        
        <View style={styles.summaryDivider} />
        
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total</Text>
          <Text style={styles.summaryValue}>${calculateTotalAmount().toFixed(2)}</Text>
        </View>
        
        <Pressable 
          style={[
            styles.iconButton,
            (filteredSales.length === 0 || sendingReport) && styles.iconButtonDisabled
          ]}
          onPress={sendReport}
          disabled={filteredSales.length === 0 || sendingReport}
        >
          {sendingReport ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Ionicons name="share-social-outline" size={20} color="white" />
          )}
        </Pressable>
        
        <Pressable 
          style={styles.iconButton}
          onPress={handleViewChart}
        >
          <Ionicons name="stats-chart" size={20} color="white" />
        </Pressable>
      </View>

      {/* Remove the large chart container and continue with the list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      ) : filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color="#CCC" />
          <Text style={styles.emptyText}>No hay ventas registradas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredSales}
          renderItem={renderSaleItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  refreshButton: {
    padding: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EEE',
    marginHorizontal: 16,
  },
  // Rename shareButton to iconButton since we'll use it for both buttons
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  iconButtonDisabled: {
    backgroundColor: '#CCC',
  },
  // Remove chartContainer and related styles since we don't need them anymore
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  saleItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  saleTime: {
    fontSize: 12,
    color: '#666',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleItemCount: {
    fontSize: 14,
    color: '#666',
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  saleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  viewDetailsText: {
    fontSize: 14,
    color: COLORS.primary,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noChartData: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noChartDataText: {
    fontSize: 14,
    color: '#666',
  },
});
