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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { SaleRecord, getSales, getCurrentWeekSales, getTodaySales } from '../services/storage';
import { sendSalesReportToWhatsApp } from '../services/whatsapp';
import { COLORS } from '../src/theme';
import { LineChart } from 'react-native-chart-kit';

const TABLE_NAMES_KEY = '@table_names';

type FilterPeriod = 'today' | 'week' | 'all';
export default function SalesHistoryScreen() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today');
  const [sendingReport, setSendingReport] = useState(false);
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
        period: filterPeriod,
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
    // Use the tableName directly from the sale record instead of looking it up
    return (
      <TouchableOpacity
        style={styles.saleItem}
        onPress={() => handleViewSaleDetails(item)}
        activeOpacity={0.7}
      >
        <View style={styles.saleHeader}>
          <Text style={styles.saleTitle}>{item.tableName || `Mesa ${item.tableNumber}`}</Text>
          <Text style={styles.saleTime}>{formatDate(item.timestamp)}</Text>
        </View>

        <View style={styles.saleDetails}>
          <View style={styles.saleItemCountContainer}>
            <Ionicons name="restaurant-outline" size={14} color={COLORS.textLight} style={styles.saleItemIcon} />
            <Text style={styles.saleItemCount}>
              {item.items.reduce((sum, i) => sum + i.quantity, 0)} artículos
            </Text>
          </View>
          <View style={styles.saleTotalContainer}>
            <Text style={styles.saleTotal}>${item.total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.saleFooter}>
          <Ionicons name="receipt-outline" size={16} color={COLORS.accent} />
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Cargando ventas...</Text>
        </View>
      ) : filteredSales.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.subtle} />
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
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: COLORS.subtle,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primaryDark,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  filterButtonTextActive: {
    color: 'white',
  },
  summaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    marginTop: 16,
    marginBottom: 16,
    borderRadius: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  iconButtonDisabled: {
    backgroundColor: COLORS.subtle,
    shadowOpacity: 0,
    elevation: 0,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  saleItem: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  saleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  saleTime: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  saleItemCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saleItemIcon: {
    marginRight: 4,
  },
  saleItemCount: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  saleTotalContainer: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  saleTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D9534F',
  },
  saleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  viewDetailsText: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '500',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
  },
});