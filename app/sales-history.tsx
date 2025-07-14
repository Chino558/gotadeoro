import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  LayoutAnimation, // For potential simple layout animations
  UIManager, // For LayoutAnimation on Android
  Platform, // To check OS
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'; // Added MaterialCommunityIcons
import { Stack, router } from 'expo-router';
import * as Animatable from 'react-native-animatable'; // Import animatable
import {
  SaleRecord,
  getSales as getLocalSales, // Rename to avoid confusion
  getCurrentWeekSales,
  getTodaySales,
  processPendingSyncs,
  getPendingSyncs,
  getSalesByDateRange,
} from '../services/storage';
import { sendSalesReportToWhatsApp } from '../services/whatsapp';
import { COLORS } from '../src/theme';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase';
// Removed ToggleButton import
import { DateRangePicker } from '../components/DateRangePicker';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterPeriod = 'today' | 'week' | 'all' | 'custom';

export default function SalesHistoryScreen() {
  // State variables
  const [allSalesData, setAllSalesData] = useState<SaleRecord[]>([]); // Holds raw data (either from Supabase or Local)
  const [filteredSales, setFilteredSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track initial load for specific actions
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today');
  const [sendingReport, setSendingReport] = useState(false);
  // Removed chartData state if handled elsewhere or simplified
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true); // Assume online initially
  const [hasPendingItems, setHasPendingItems] = useState(false);
  const [dateRangePickerVisible, setDateRangePickerVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const flatListRef = useRef<FlatList>(null); // Ref for FlatList

  // --- Network & Sync Status ---
  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => {
      const currentOnlineStatus = state.isConnected ?? false;
      // Only trigger reload if status *changes* after initial load
      if (!isInitialLoad && currentOnlineStatus !== isOnline) {
        console.log(`Network status changed: ${isOnline} -> ${currentOnlineStatus}. Reloading data.`);
        setIsOnline(currentOnlineStatus);
        // Don't reset filter period, just reload data for the current period
        loadSalesData(filterPeriod, startDate, endDate, currentOnlineStatus);
      } else if (isInitialLoad) {
         setIsOnline(currentOnlineStatus); // Set initial status
      }
    });

    // Initial check
    NetInfo.fetch().then(state => {
      const currentOnlineStatus = state.isConnected ?? false;
      setIsOnline(currentOnlineStatus);
      // Trigger initial data load here after getting status
      loadSalesData(filterPeriod, startDate, endDate, currentOnlineStatus).finally(() => setIsInitialLoad(false));
    });

    // Check for pending syncs periodically
    const checkPending = async () => {
      try {
        const pending = await getPendingSyncs();
        setHasPendingItems(pending.length > 0);
      } catch (error) {
        console.error("Error checking pending syncs:", error);
      }
    };
    checkPending(); // Initial check
    const pendingSyncInterval = setInterval(checkPending, 10000); // Check every 10s

    return () => {
      unsubscribeNetInfo();
      clearInterval(pendingSyncInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInitialLoad]); // Rerun only if isInitialLoad changes

  // --- Data Loading ---
  const loadSalesData = useCallback(async (
    currentPeriod: FilterPeriod,
    currentStart: Date | null,
    currentEnd: Date | null,
    onlineStatus: boolean // Pass current online status directly
  ) => {
    console.log(`loadSalesData called. Online: ${onlineStatus}, Period: ${currentPeriod}`);
    setLoading(true);
    let rawSales: SaleRecord[] = [];
    let source: 'Supabase' | 'Local' | 'Error' = 'Error';

    try {
      if (onlineStatus) {
        console.log("Attempting to fetch from Supabase...");
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('timestamp', { ascending: false });

        if (error) {
          // Throw error to be caught below, indicating Supabase fetch failed
          throw new Error(`Supabase error: ${error.message}`);
        }

        if (data) {
          console.log(`Fetched ${data.length} records from Supabase.`);
          rawSales = data.map((item: any): SaleRecord => ({ // Use 'any' carefully or define Supabase type
            id: item.id,
            tableNumber: item.table_number,
            tableName: item.table_name,
            items: Array.isArray(item.items) ? item.items : (typeof item.items === 'string' ? JSON.parse(item.items) : []), // Handle potential JSON string
            total: typeof item.total === 'number' ? item.total : 0,
            timestamp: new Date(item.timestamp).getTime(),
            date: item.local_date || new Date(item.timestamp).toLocaleDateString('es-MX'),
            synced: true, // Data from Supabase is always considered synced
          }));
          source = 'Supabase';
        }
      } else {
        console.log("Offline. Attempting to fetch from Local Storage...");
        Alert.alert("Modo Offline", "Mostrando datos guardados localmente. Sincroniza cuando tengas conexión.");
        // Fetch from local storage using renamed function
        rawSales = await getLocalSales();
        source = 'Local';
        console.log(`Fetched ${rawSales.length} records from Local Storage.`);
         // Check for pending items specifically when offline
         const pending = await getPendingSyncs();
         setHasPendingItems(pending.length > 0);
      }

      // Set the raw data source
      setAllSalesData(rawSales);
      // Apply filter immediately after getting data
      applyFilter(rawSales, currentPeriod, currentStart, currentEnd);

    } catch (error: any) {
      console.error(`Error loading sales data (Source Attempted: ${onlineStatus ? 'Supabase' : 'Local'}):`, error);
      source = 'Error';
      setAllSalesData([]); // Clear data on error
      setFilteredSales([]);
      Alert.alert(
        "Error al Cargar Datos",
        `No se pudieron cargar las ventas (${onlineStatus ? 'desde la nube' : 'localmente'}). ${error.message || 'Intenta de nuevo.'}`
      );
    } finally {
      console.log(`Finished loading data from ${source}.`);
      setLoading(false);
      // Animate layout changes (e.g., showing list after loading)
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, []); // No dependencies, relies on passed arguments

  // --- Filtering ---
  const applyFilter = useCallback((
    sourceData: SaleRecord[],
    period: FilterPeriod,
    start: Date | null,
    end: Date | null
  ) => {
    console.log(`Applying filter: ${period}, Start: ${start}, End: ${end}`);
    let filtered: SaleRecord[] = [];

    const now = new Date();
    const todayStart = new Date(now).setHours(0, 0, 0, 0);
    const todayEnd = new Date(now).setHours(23, 59, 59, 999);

    // Use Monday as the start of the week (consistent with Analytics)
    const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const daysToSubtract = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToSubtract);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Go to Sunday
    weekEnd.setHours(23, 59, 59, 999);


    switch (period) {
      case 'today':
        filtered = sourceData.filter(s => s.timestamp >= todayStart && s.timestamp <= todayEnd);
        break;
      case 'week':
        filtered = sourceData.filter(s => s.timestamp >= weekStart && s.timestamp <= weekEnd);
        break;
      case 'custom':
        if (start && end) {
          const startTime = new Date(start).setHours(0, 0, 0, 0);
          const endTime = new Date(end).setHours(23, 59, 59, 999);
          filtered = sourceData.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
        } else {
          filtered = [...sourceData]; // Should not happen if dates are required
        }
        break;
      case 'all':
      default:
        filtered = [...sourceData];
        break;
    }

    console.log(`Filtering done. ${filtered.length} records remain.`);
    setFilteredSales(filtered.sort((a, b) => b.timestamp - a.timestamp)); // Keep sorting by most recent
     // prepareChartData(filtered); // Update chart data if needed
     if (flatListRef.current && filtered.length > 0) {
        // Scroll to top when filter changes and list is not empty
       // flatListRef.current.scrollToOffset({ offset: 0, animated: true });
     }
  }, []);


  // --- Event Handlers ---
  const handleFilterChange = (period: FilterPeriod) => {
    // Prevent changes if loading
    if (loading) return;

    console.log("Filter period changed to:", period);
    setFilterPeriod(period);
    // Reset custom dates if a preset period is chosen
    if (period !== 'custom') {
        setStartDate(null);
        setEndDate(null);
        applyFilter(allSalesData, period, null, null); // Apply filter immediately on existing data
    }
    // If 'custom' is selected, the date picker will trigger the filtering via handleDateRangeSelect
  };

  const handleDateRangeSelect = (start: Date, end: Date) => {
    if (loading) return;
    console.log("Date range selected:", start, end);
    setStartDate(start);
    setEndDate(end);
    setFilterPeriod('custom'); // Ensure period is set to custom
    setDateRangePickerVisible(false);
    applyFilter(allSalesData, 'custom', start, end); // Apply filter immediately
  };

  const handleManualRefresh = () => {
     if (loading || syncing) return;
     console.log("Manual refresh triggered.");
     setIsInitialLoad(true); // Treat refresh like an initial load to re-check network
     // The useEffect watching isInitialLoad will handle the rest
  };

  const handleSync = async () => {
    if (!isOnline) {
      Alert.alert("Sin Conexión", "Necesitas conexión a internet para sincronizar.");
      return;
    }
    if (syncing) return;

    setSyncing(true);
    try {
      const pendingCount = (await getPendingSyncs()).length;
      if (pendingCount === 0) {
         Alert.alert("Sincronizado", "No hay ventas pendientes por sincronizar.");
         setHasPendingItems(false); // Ensure state is updated
         return;
      }

      Alert.alert("Sincronizando...", `Sincronizando ${pendingCount} ventas pendientes.`);
      await processPendingSyncs();
      setHasPendingItems(false); // Clear pending items indicator immediately
      Alert.alert("Sincronización Exitosa", "Las ventas pendientes han sido sincronizadas.");
      // Reload data from Supabase to reflect synced items
      await loadSalesData(filterPeriod, startDate, endDate, true); // Force reload from Supabase

    } catch (error: any) {
      console.error('Error during manual sync:', error);
      Alert.alert("Error de Sincronización", `No se pudieron sincronizar las ventas. ${error.message || ''}`);
      // Re-check actual pending items in case of partial failure
       const pending = await getPendingSyncs();
       setHasPendingItems(pending.length > 0);
    } finally {
      setSyncing(false);
    }
  };

  const handleViewChart = () => {
    // Prepare chart data just before navigating
     const groupedData = filteredSales.reduce((acc, sale) => {
       const date = new Date(sale.timestamp).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
       acc[date] = (acc[date] || 0) + sale.total;
       return acc;
     }, {} as { [key: string]: number });

     // Get the last 7 days with data, or fewer if less data exists
     const sortedDates = Object.keys(groupedData).sort((a, b) => {
         const [dayA, monthA] = a.split('/').map(Number);
         const [dayB, monthB] = b.split('/').map(Number);
         if (monthA !== monthB) return monthA - monthB;
         return dayA - dayB;
     });

     const labels = sortedDates.slice(-7);
     const data = labels.map(label => groupedData[label] || 0);

     const chartPayload = {
         labels,
         datasets: [{ data }]
     };


    router.push({
      pathname: '/chart-detail', // Ensure this route exists
      params: {
        // Pass data needed for the chart screen
        chartData: encodeURIComponent(JSON.stringify(chartPayload)),
        title: getFilterTitle(), // Generate title based on current filter
        period: filterPeriod,
      }
    });
  };

  const handleSendReport = async () => {
    if (filteredSales.length === 0 || sendingReport) return;

    setSendingReport(true);
    try {
      const title = getFilterTitle(); // Use existing function for title
      await sendSalesReportToWhatsApp(filteredSales, title);
    } catch (error: any) {
      console.error('Error sending report:', error);
      Alert.alert("Error", `No se pudo enviar el reporte. ${error.message || ''}`);
    } finally {
      setSendingReport(false);
    }
  };

  const handleViewSaleDetails = (sale: SaleRecord) => {
    router.push({
      pathname: '/bill', // Ensure this route exists and handles viewOnly
      params: {
        tableNumber: sale.tableNumber?.toString() ?? 'N/A',
        items: encodeURIComponent(JSON.stringify(sale.items)),
        total: sale.total.toString(),
        timestamp: sale.timestamp.toString(),
        viewOnly: 'true', // Indicate this is for viewing only
        // Optionally pass sync status if needed on the bill screen
        synced: sale.synced.toString(),
      }
    });
  };


  // --- Helper Functions ---
  const calculateTotalAmount = () => {
    return filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getFilterTitle = () => {
    // (Same logic as before)
     switch (filterPeriod) {
      case 'today':
        return 'Ventas de Hoy';
      case 'week':
        return 'Ventas de Esta Semana (Lun-Dom)';
      case 'custom':
        if (startDate && endDate) {
          const formatShortDate = (date: Date) => date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
          return `Ventas ${formatShortDate(startDate)} - ${formatShortDate(endDate)}`;
        }
        return 'Rango Personalizado';
      case 'all':
        return 'Todas las Ventas';
      default:
        return 'Historial de Ventas';
    }
  };

  // --- Render Functions ---

  const renderSaleItem = ({ item, index }: { item: SaleRecord; index: number }) => {
    return (
      <Animatable.View
        animation="fadeInUp"
        duration={400}
        delay={index * 60} // Stagger animation
        useNativeDriver={true}
      >
        <TouchableOpacity
          style={styles.saleItem}
          onPress={() => handleViewSaleDetails(item)}
          activeOpacity={0.8} // Slightly higher opacity on press
        >
          {/* Top Row: Table Name and Timestamp */}
          <View style={styles.saleRow}>
            <Text style={styles.saleTableName} numberOfLines={1}>
              {item.tableName || `Mesa ${item.tableNumber}` || 'Venta General'}
            </Text>
            <Text style={styles.saleTimestamp}>{formatDate(item.timestamp)}</Text>
          </View>

          {/* Middle Row: Item Count and Total */}
          <View style={[styles.saleRow, styles.saleDetailsRow]}>
            <View style={styles.saleItemCountContainer}>
              <Ionicons name="fast-food-outline" size={16} color={COLORS.textSubtle} />
              <Text style={styles.saleItemCount}>
                {item.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0} artículos
              </Text>
            </View>
            <View style={styles.saleTotalContainer}>
                <Text style={styles.saleTotal}>${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            </View>
          </View>

          {/* Bottom Row: View Details and Sync Status */}
          <View style={[styles.saleRow, styles.saleFooterRow]}>
            <View style={styles.viewDetailsContainer}>
              <Ionicons name="receipt-outline" size={16} color={COLORS.primary} />
              <Text style={styles.viewDetailsText}>Ver Ticket</Text>
            </View>
            <View style={[
                styles.syncStatusPill,
                item.synced ? styles.syncStatusSynced : styles.syncStatusPending
            ]}>
              <Ionicons
                name={item.synced ? "cloud-done" : "cloud-upload"}
                size={14}
                color={item.synced ? COLORS.successDark : COLORS.warningDark} // Use darker colors for better contrast on light bg
              />
              <Text style={[
                  styles.syncStatusText,
                  item.synced ? styles.syncTextSynced : styles.syncTextPending
              ]}>
                {item.synced ? "En Nube" : "Pendiente"}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animatable.View>
    );
  };

  const renderFilterButton = (period: FilterPeriod, label: string, isCalendar = false) => (
    <Pressable
        key={period}
        style={({ pressed }) => [
            styles.filterButton,
            filterPeriod === period && styles.filterButtonActive,
            isCalendar && styles.calendarButton,
            pressed && styles.filterButtonPressed,
            loading && styles.disabledOpacity // Disable visually if loading
        ]}
        onPress={() => isCalendar ? setDateRangePickerVisible(true) : handleFilterChange(period)}
        disabled={loading} // Disable functionally if loading
    >
        {isCalendar && (
            <Ionicons
                name="calendar-outline"
                size={16}
                color={filterPeriod === 'custom' ? 'white' : COLORS.primary}
                style={styles.calendarIcon}
            />
        )}
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

  // --- Main Return ---
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      {/* Use Stack.Screen for header config */}
       <Stack.Screen
           options={{
               headerTitle: "Historial de Ventas",
               headerTitleAlign: 'left',
               headerStyle: { backgroundColor: COLORS.background },
               headerTitleStyle: styles.headerTitleStyle,
               headerShadowVisible: false,
               headerRight: () => (
                 <View style={styles.headerRightContainer}>
                   {/* Sync Button */}
                   <TouchableOpacity
                     style={[styles.headerButton, (!isOnline || syncing || loading) && styles.disabledOpacity]}
                     onPress={handleSync}
                     disabled={syncing || !isOnline || loading}
                   >
                     {syncing ? (
                       <ActivityIndicator size="small" color={COLORS.primary} />
                     ) : (
                       <Ionicons name="cloud-upload-outline" size={24} color={hasPendingItems ? COLORS.warning : COLORS.primary} />
                     )}
                     {hasPendingItems && !syncing && (
                         <Animatable.View animation="flash" iterationCount="infinite" duration={2000} style={styles.syncBadge}>
                           <Text style={styles.syncBadgeText}>!</Text>
                         </Animatable.View>
                     )}
                   </TouchableOpacity>

                   {/* Refresh Button */}
                   <TouchableOpacity
                     style={[styles.headerButton, (loading || syncing) && styles.disabledOpacity]}
                     onPress={handleManualRefresh}
                     disabled={loading || syncing}
                   >
                      {/* Optional: Show loading indicator instead of refresh icon when loading */}
                      {loading && !isInitialLoad ? (
                           <ActivityIndicator size="small" color={COLORS.primary} />
                       ) : (
                           <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
                       )}
                   </TouchableOpacity>
                 </View>
               ),
               // Optional: Add back button if needed
               // headerLeft: () => ( ... ),
           }}
       />

      {/* Offline Indicator */}
      {!isOnline && (
          <Animatable.View animation="fadeInDown" duration={500} style={styles.offlineBanner}>
              <Ionicons name="cloud-offline-outline" size={16} color={COLORS.warningDark} />
              <Text style={styles.offlineBannerText}>Estás offline - Mostrando datos locales</Text>
          </Animatable.View>
      )}

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
          {renderFilterButton('today', 'Hoy')}
          {renderFilterButton('week', 'Semana')}
          {renderFilterButton('all', 'Todas')}
          {renderFilterButton('custom', 'Fechas', true)}
      </View>

      {/* Summary Card */}
      <Animatable.View animation="fadeIn" duration={500} delay={200} style={styles.summaryCard}>
        <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ventas ({getFilterTitle()})</Text>
            <Text style={styles.summaryValue}>{loading ? '-' : filteredSales.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>
                {loading ? '-' : `$${calculateTotalAmount().toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </Text>
        </View>
        <View style={styles.summaryActions}>
             {/* Share Report Button */}
             <TouchableOpacity
                 style={[styles.summaryIconButton, (filteredSales.length === 0 || sendingReport || loading) && styles.disabledOpacity]}
                 onPress={handleSendReport}
                 disabled={filteredSales.length === 0 || sendingReport || loading}
             >
                 {sendingReport ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />}
             </TouchableOpacity>
             {/* View Chart Button */}
              <TouchableOpacity
                 style={[styles.summaryIconButton, (filteredSales.length === 0 || loading) && styles.disabledOpacity]}
                 onPress={handleViewChart}
                 disabled={filteredSales.length === 0 || loading}
             >
                 <Ionicons name="stats-chart-outline" size={20} color={COLORS.primary} />
             </TouchableOpacity>
        </View>
      </Animatable.View>

      {/* Main Content: List or Loading/Empty State */}
      <View style={styles.listContainer}>
        {loading && isInitialLoad ? ( // Show full screen loader only on initial load
          <View style={styles.centeredMessageContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.messageText}>Cargando historial...</Text>
          </View>
        ) : !loading && filteredSales.length === 0 ? (
          <View style={styles.centeredMessageContainer}>
            <Ionicons name="document-text-outline" size={60} color={COLORS.subtle} />
            <Text style={styles.messageText}>No hay ventas para</Text>
            <Text style={styles.messageTextBold}>{getFilterTitle()}</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredSales}
            renderItem={renderSaleItem}
            keyExtractor={(item) => item.id.toString()} // Ensure key is string
            contentContainerStyle={styles.listPadding}
            showsVerticalScrollIndicator={false}
            // Optional: Add pull-to-refresh if desired
            // refreshControl={<RefreshControl refreshing={loading && !isInitialLoad} onRefresh={handleManualRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
          />
        )}
      </View>

      {/* Date Picker Modal */}
      <DateRangePicker
        isVisible={dateRangePickerVisible}
        onClose={() => setDateRangePickerVisible(false)}
        onSelectRange={handleDateRangeSelect}
        initialStartDate={startDate} // Pass current dates to picker
        initialEndDate={endDate}
      />

    </SafeAreaView>
  );
}

// --- Styles --- (Enhanced and Reorganized)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#f8f8f8', // Use theme background
  },
  // Header
  headerTitleStyle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: COLORS.text, // Use theme text color
  },
  headerRightContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 5, // Adjust spacing as needed
  },
  headerButton: {
      padding: 8,
      marginLeft: 8, // Space between buttons
      position: 'relative', // Needed for badge positioning
  },
  syncBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: COLORS.warning, // Use warning color for badge
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.background, // Use background for border
  },
  syncBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Offline Banner
  offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      backgroundColor: COLORS.warningLight, // Light warning color for banner
      borderBottomWidth: 1,
      borderBottomColor: COLORS.warning,
  },
  offlineBannerText: {
      marginLeft: 8,
      fontSize: 13,
      fontWeight: '500',
      color: COLORS.warningDark, // Darker warning text
  },
  // Filter Buttons
  filterContainer: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: COLORS.background, // Match container background
      // borderBottomWidth: 1, // Optional separator
      // borderBottomColor: COLORS.border,
  },
  filterButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20, // More rounded
      marginRight: 10,
      backgroundColor: COLORS.cardLight, // Lighter background for inactive
      borderWidth: 1,
      borderColor: COLORS.border, // Subtle border
      flexDirection: 'row',
      alignItems: 'center',
  },
  filterButtonActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primaryDark,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
  },
  filterButtonPressed: {
      backgroundColor: COLORS.border, // Darker feedback on press
  },
  filterButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.textSubtle,
  },
  filterButtonTextActive: {
      color: 'white',
  },
  calendarButton: {
     // Keep specific styles if needed
  },
  calendarIcon: {
    marginRight: 5,
  },
  // Summary Card
  summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.card,
      marginHorizontal: 16,
      marginTop: 8, // Reduced top margin
      marginBottom: 16,
      borderRadius: 12,
      padding: 16, // More padding
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: COLORS.borderLight, // Lighter border
  },
  summaryItem: {
      flex: 1, // Take available space
  },
  summaryLabel: {
      fontSize: 13,
      color: COLORS.textSubtle,
      marginBottom: 4, // Less space
      fontWeight: '500',
  },
  summaryValue: {
      fontSize: 18, // Slightly smaller value
      fontWeight: '700',
      color: COLORS.text,
  },
  summaryDivider: {
      width: 1,
      height: 35, // Shorter divider
      backgroundColor: COLORS.borderLight,
      marginHorizontal: 12, // Less horizontal margin
  },
  summaryActions: {
      flexDirection: 'row',
      marginLeft: 10, // Space before action buttons
  },
  summaryIconButton: {
      padding: 8,
      marginLeft: 8,
      backgroundColor: COLORS.primaryLight, // Use light primary for background
      borderRadius: 18, // Circular buttons
      width: 36,
      height: 36,
      justifyContent: 'center',
      alignItems: 'center',
  },
  // List
  listContainer: {
      flex: 1, // Take remaining space
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingTop: 4, // Small top padding
    paddingBottom: 100, // Ensure space for last item + potential indicators
  },
  // Sale Item
  saleItem: {
    backgroundColor: COLORS.card,
    borderRadius: 10, // Slightly less rounded
    marginBottom: 12,
    padding: 14, // Adjust padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.borderLight, // Lighter border
  },
  saleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  saleTableName: {
      fontSize: 15,
      fontWeight: '600',
      color: COLORS.text,
      flex: 1, // Allow shrinking/growing
      marginRight: 8,
  },
  saleTimestamp: {
      fontSize: 11,
      color: COLORS.textLight,
      fontWeight: '500',
      flexShrink: 0, // Prevent shrinking
  },
  saleDetailsRow: {
      marginTop: 10, // Space below header row
      marginBottom: 12,
  },
  saleItemCountContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS.background, // Subtle background
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
  },
  saleItemCount: {
      fontSize: 13,
      color: COLORS.textSubtle,
      fontWeight: '500',
      marginLeft: 5,
  },
  saleTotalContainer: {
    // Removed specific background, total stands out more
  },
  saleTotal: {
      fontSize: 16, // Slightly smaller total
      fontWeight: 'bold',
      color: COLORS.primary, // Use primary color for total
      textAlign: 'right',
  },
  saleFooterRow: {
      marginTop: 8, // Space above footer
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: COLORS.borderLight, // Lighter separator
  },
  viewDetailsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  viewDetailsText: {
      fontSize: 13,
      color: COLORS.primary,
      fontWeight: '600', // Bolder text
      marginLeft: 5,
  },
  syncStatusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 12, // Pill shape
  },
  syncStatusSynced: {
    backgroundColor: COLORS.successLight, // Light success background
  },
  syncStatusPending: {
    backgroundColor: COLORS.warningLight, // Light warning background
  },
  syncStatusText: {
      fontSize: 11,
      fontWeight: '600', // Bolder sync text
      marginLeft: 4,
  },
  syncTextSynced: {
    color: COLORS.successDark, // Darker success text
  },
  syncTextPending: {
    color: COLORS.warningDark, // Darker warning text
  },
  // Centered Loading / Empty State
  centeredMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  messageText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSubtle,
    textAlign: 'center',
  },
  messageTextBold: {
    fontWeight: '600',
    color: COLORS.text,
  },
  // Utility
  disabledOpacity: {
    opacity: 0.5,
  },
});