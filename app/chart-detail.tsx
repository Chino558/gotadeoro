import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    SafeAreaView,
    Dimensions,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Pressable,
    Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import {
    LineChart,
    BarChart,
    PieChart,
    // ContributionGraph removed
} from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable'; // <-- Added Animatable import
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../services/supabase'; // Ensure this path is correct
import { COLORS } from '../src/theme'; // Ensure this path is correct
import { OrderItem } from '../types'; // Ensure this path is correct
import { DateRangePicker } from '../components/DateRangePicker'; // Ensure this path is correct

// --- Types ---
// Removed 'contribution' from ChartType
type ChartType = 'breakdown' | 'line' | 'bar' | 'pie'; // 'breakdown' is the main dashboard
type TimePeriod = 'day' | 'week' | 'month' | 'year' | 'all' | 'custom';
type RevenueMetric = 'quantity' | 'revenue'; // For sorting top items

// Interface for raw sale records (adapt based on your Supabase table structure)
interface RawSaleRecord {
    id: string | number;
    table_number?: number | null;
    table_name?: string | null;
    items: OrderItem[];
    total: number;
    timestamp: string;
    local_date?: string | null;
}

// Interface for processed sale records used internally
interface SaleRecord {
    id: string | number;
    tableNumber?: number | null;
    tableName?: string | null;
    items: OrderItem[];
    total: number;
    timestamp: number;
    date: string;
    synced: boolean;
}

// --- Interfaces for Analytics Data ---
interface PopularItem {
    name: string;
    quantity: number;
    total: number;
    percentage: number;
}

interface CategorySale {
    name: string;
    value: number;
    color: string;
    percentage: number;
}

interface DayData {
    day: string;
    sales: number;
    items: number;
    tickets: number;
}

interface SalesAnalytics {
    totalSales: number;
    totalItems: number;
    totalTickets: number;
    avgTicket: number;
    avgItemsPerTicket: number;
    mostPopularItems: PopularItem[];
    topItemsByRevenue: PopularItem[];
    dailySales: { [date: string]: number };
    dailyData: DayData[];
    highestDailySale: { date: string; amount: number };
    lowestDailySale: { date: string; amount: number };
    bestSellingDay: { day: string; amount: number };
    itemCategories: { [key: string]: number };
    salesByCategory: CategorySale[];
    hourlyDistribution: { [hour: string]: number };
    // Stored internally Sun-Sat (0-6) based on getDay()
    weekdayDistribution: number[];
    salesGrowth: number;
    itemsGrowth: number;
}

// --- Main Component ---
export default function ComprehensiveSalesAnalyticsScreen() {
    // --- State ---
    const params = useLocalSearchParams();
    const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
    const [salesData, setSalesData] = useState<SaleRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>('week');
    const [chartType, setChartType] = useState<ChartType>('breakdown');
    const [revenueMetric, setRevenueMetric] = useState<RevenueMetric>('quantity');
    const [dateRangePickerVisible, setDateRangePickerVisible] = useState(false);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

    // --- Dynamic Title ---
    const title = useMemo(() => {
        switch (selectedTimePeriod) {
            case 'day': return 'Análisis de Hoy (Todos)';
            case 'week': return 'Análisis Semanal (Todos)';
            case 'month': return 'Análisis Mensual (Todos)';
            case 'year': return 'Análisis Anual (Todos)';
            case 'custom':
                if (startDate && endDate) {
                    const formatShort = (d: Date) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
                    return `Análisis (${formatShort(startDate)} - ${formatShort(endDate)}) (Todos)`;
                }
                return 'Análisis Personalizado (Todos)';
            case 'all': return 'Análisis Completo (Todos)';
            default: return 'Análisis de Ventas (Todos)';
        }
    }, [selectedTimePeriod, startDate, endDate]);

    // --- Screen Dimensions & Chart Config ---
    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth > 400 ? screenWidth - 40 : screenWidth - 30;
    const chartConfig = useMemo(() => ({
        backgroundColor: COLORS.card || '#ffffff', // Used for elements within chart container if needed
        backgroundGradientFrom: COLORS.card || '#ffffff', // Chart background start color
        backgroundGradientTo: COLORS.card || '#ffffff', // Chart background end color
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(229, 185, 60, ${opacity})`, // Primary Gold for lines/bars
        labelColor: (opacity = 1) => `rgba(44, 36, 24, ${opacity})`, // Dark Brown/Black for labels
        style: {
            // borderRadius: 16 // Style for the chart component itself (removed, applied to container)
        },
        propsForDots: { r: '5', strokeWidth: '2', stroke: COLORS.primaryDark || '#8c6d1f' },
        propsForLabels: { fontSize: 10, fill: COLORS.textSubtle || '#666' }, // Use fill for SVG text color
        formatXLabel: (value: string) => value.substring(0, 5), // Shorten X labels if needed
        formatYLabel: (value: string) => `$${parseFloat(value).toLocaleString('es-MX', { maximumFractionDigits: 0 })}`, // Format Y labels as currency
    }), [COLORS]);

    // --- Effects ---

    // Network Status Listener
    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            const onlineStatus = state.isConnected ?? false;
            setIsOnline(onlineStatus);
            if (!onlineStatus) {
                 Alert.alert(
                    "Sin Conexión",
                    "Se perdió la conexión a internet. No se pueden cargar datos nuevos desde la nube. Mostrando últimos datos cargados (si existen)."
                 );
            }
        });
        NetInfo.fetch().then(state => setIsOnline(state.isConnected ?? false));
        return () => unsubscribe();
    }, []);

    // Initial Load
     useEffect(() => {
        NetInfo.fetch().then(state => {
            const onlineStatus = state.isConnected ?? false;
            setIsOnline(onlineStatus);
            if (onlineStatus) {
                loadSalesData();
            } else {
                Alert.alert("Sin Conexión", "Se necesita conexión a internet para cargar el análisis de ventas.");
                setLoading(false);
            }
        });
         // eslint-disable-next-line react-hooks/exhaustive-deps
     }, []);

    // Reload data when time period or custom dates change
    useEffect(() => {
        if (!loading && isOnline) {
            loadSalesData();
        } else if (!isOnline) {
             console.log("Offline, skipping data reload triggered by period/date change.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTimePeriod, startDate, endDate, isOnline]);

    // --- Data Loading & Processing ---

    const loadSalesData = useCallback(async () => {
        console.log(`Loading Supabase data: Period=${selectedTimePeriod}, Start=${startDate}, End=${endDate}`);

        if (!isOnline) {
            Alert.alert("Sin Conexión", "Se necesita conexión a internet para cargar datos.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setAnalytics(null); // Clear analytics while loading

        try {
            console.log("Fetching ALL sales data from Supabase...");
            const { data: rawData, error } = await supabase
                .from('sales')
                .select('*')
                .order('timestamp', { ascending: true });

            if (error) {
                throw new Error(`Supabase error: ${error.message}`);
            }

            if (!rawData || rawData.length === 0) {
                console.log("No sales data found in Supabase.");
                setSalesData([]);
                setAnalytics(null);
                setLoading(false);
                return;
            }

            console.log(`Fetched ${rawData.length} total records from Supabase.`);

            const allFormattedSales: SaleRecord[] = rawData.map((item: RawSaleRecord): SaleRecord => {
                const ts = new Date(item.timestamp).getTime();
                return {
                    id: item.id,
                    tableNumber: item.table_number,
                    tableName: item.table_name,
                    items: Array.isArray(item.items) ? item.items : (typeof item.items === 'string' ? JSON.parse(item.items) : []),
                    total: typeof item.total === 'number' ? item.total : 0,
                    timestamp: ts,
                    date: item.local_date || new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' }),
                    synced: true
                };
            }).filter(record => record.items && typeof record.total === 'number' && !isNaN(record.timestamp));

            // Filter these records based on the selected period
            const filteredSales = filterSalesData(allFormattedSales, selectedTimePeriod, startDate, endDate);
            console.log(`Filtered down to ${filteredSales.length} records for period ${selectedTimePeriod}.`);

            setSalesData(filteredSales); // Store the filtered raw data

            if (filteredSales.length > 0) {
                const generatedAnalytics = generateComprehensiveAnalytics(filteredSales, selectedTimePeriod);
                setAnalytics(generatedAnalytics);
            } else {
                setAnalytics(null); // No data for the selected period
            }

        } catch (error: any) {
            console.error('Error loading or processing sales data:', error);
            Alert.alert("Error", `No se pudieron cargar los datos: ${error.message || 'Error desconocido'}`);
            setAnalytics(null);
            setSalesData([]); // Clear data on error
        } finally {
            setLoading(false);
        }
    }, [isOnline, selectedTimePeriod, startDate, endDate]);


    // Helper to filter an array of sales data based on time period
    const filterSalesData = (allSales: SaleRecord[], period: TimePeriod, start: Date | null, end: Date | null): SaleRecord[] => {
        if (!allSales || allSales.length === 0) return [];

        const now = new Date();
        const todayStart = new Date(now).setHours(0, 0, 0, 0);
        const todayEnd = new Date(now).setHours(23, 59, 59, 999);

        // --- Week Calculation (Monday - Sunday) ---
        const currentDayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const daysToSubtract = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1;
        const mondayDate = new Date(now);
        mondayDate.setDate(now.getDate() - daysToSubtract);
        const weekStart = mondayDate.setHours(0, 0, 0, 0);
        const sundayDate = new Date(weekStart);
        sundayDate.setDate(sundayDate.getDate() + 6);
        const weekEnd = sundayDate.setHours(23, 59, 59, 999);
        // --- End Week Calculation ---

        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).setHours(0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const yearStart = new Date(now.getFullYear(), 0, 1).setHours(0, 0, 0, 0);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);

        switch (period) {
            case 'day':
                return allSales.filter(s => s.timestamp >= todayStart && s.timestamp <= todayEnd);
            case 'week':
                console.log(`Filtering for week (Mon-Sun): ${new Date(weekStart).toISOString()} to ${new Date(weekEnd).toISOString()}`);
                return allSales.filter(s => s.timestamp >= weekStart && s.timestamp <= weekEnd);
            case 'month':
                return allSales.filter(s => s.timestamp >= monthStart && s.timestamp <= monthEnd);
            case 'year':
                return allSales.filter(s => s.timestamp >= yearStart && s.timestamp <= yearEnd);
            case 'custom':
                if (start && end) {
                    const startTime = new Date(start).setHours(0, 0, 0, 0);
                    const endTime = new Date(end).setHours(23, 59, 59, 999);
                    return allSales.filter(s => s.timestamp >= startTime && s.timestamp <= endTime);
                }
                return [];
            case 'all':
            default:
                return allSales;
        }
    };


    // --- Analytics Generation ---
    const generateComprehensiveAnalytics = (sales: SaleRecord[], period: TimePeriod): SalesAnalytics => {
        if (!sales || sales.length === 0) {
            // Return a default empty structure if no sales data
            return {
                totalSales: 0, totalItems: 0, totalTickets: 0, avgTicket: 0, avgItemsPerTicket: 0,
                mostPopularItems: [], topItemsByRevenue: [], dailySales: {}, dailyData: [],
                highestDailySale: { date: 'N/A', amount: 0 }, lowestDailySale: { date: 'N/A', amount: 0 },
                bestSellingDay: { day: 'N/A', amount: 0 }, itemCategories: {}, salesByCategory: [],
                hourlyDistribution: {}, weekdayDistribution: [0, 0, 0, 0, 0, 0, 0], salesGrowth: 0, itemsGrowth: 0
            };
        }

        const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
        const totalTickets = sales.length;
        const totalItems = sales.reduce((sum, sale) =>
            sum + (sale.items?.reduce((itemSum, item) => itemSum + item.quantity, 0) ?? 0), 0);

        const avgTicket = totalTickets > 0 ? totalSales / totalTickets : 0;
        const avgItemsPerTicket = totalTickets > 0 ? totalItems / totalTickets : 0;

        const dailySales: { [date: string]: number } = {};
        const dailyItems: { [date: string]: number } = {};
        const dailyTickets: { [date: string]: number } = {};
        const hourlyDistribution: { [hour: string]: number } = {};
        // Raw data stored Sun (0) -> Sat (6)
        const weekdayData = [0, 0, 0, 0, 0, 0, 0];
        const itemsSummary: { [key: string]: { quantity: number; total: number } } = {};

        sales.forEach(sale => {
            const saleDate = new Date(sale.timestamp);
             // Key for daily grouping: 'DD/MM' format for uniqueness within a year context
            const dateKey = saleDate.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' });
            const saleHour = saleDate.getHours();
             // Key for hourly grouping: 'HH:00' format
            const hourKey = `${saleHour.toString().padStart(2, '0')}:00`;
            const weekday = saleDate.getDay(); // 0 = Sunday, 6 = Saturday

            // Aggregate daily stats
            dailySales[dateKey] = (dailySales[dateKey] || 0) + sale.total;
            const currentSaleItems = sale.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
            dailyItems[dateKey] = (dailyItems[dateKey] || 0) + currentSaleItems;
            dailyTickets[dateKey] = (dailyTickets[dateKey] || 0) + 1;

            // Aggregate hourly and weekday stats
            hourlyDistribution[hourKey] = (hourlyDistribution[hourKey] || 0) + sale.total;
            weekdayData[weekday] += sale.total;

            // Aggregate item stats
            sale.items?.forEach(item => {
                const itemName = item.name.trim(); // Normalize item name
                if (!itemsSummary[itemName]) {
                    itemsSummary[itemName] = { quantity: 0, total: 0 };
                }
                itemsSummary[itemName].quantity += item.quantity;
                // Ensure price is valid number before calculating total
                const itemPrice = typeof item.price === 'number' ? item.price : 0;
                itemsSummary[itemName].total += itemPrice * item.quantity;
            });
        });

        // Process daily data into sorted array
        const dailyData: DayData[] = Object.keys(dailySales).map(dayKey => ({
            day: dayKey, // Format 'DD/MM'
            sales: dailySales[dayKey],
            items: dailyItems[dayKey] || 0,
            tickets: dailyTickets[dayKey] || 0
        })).sort((a, b) => {
            // Sort by date 'DD/MM'
            const [dayA, monthA] = a.day.split('/').map(Number);
            const [dayB, monthB] = b.day.split('/').map(Number);
            if (monthA !== monthB) return monthA - monthB;
            return dayA - dayB;
        });

        // Find highest/lowest daily sales
        const dateEntries = Object.entries(dailySales);
        const highestDaily = dateEntries.reduce((max, [date, amount]) => amount > max.amount ? { date, amount } : max, { date: '', amount: -Infinity });
        const lowestDaily = dateEntries.reduce((min, [date, amount]) => amount < min.amount ? { date, amount } : min, { date: '', amount: Infinity });
        const finalHighest = highestDaily.amount === -Infinity ? { date: 'N/A', amount: 0 } : highestDaily;
        const finalLowest = lowestDaily.amount === Infinity ? { date: 'N/A', amount: 0 } : lowestDaily;

        // Find best selling day of the week (using internal Sun-Sat indexing)
        const highestWeekdayIndex = weekdayData.indexOf(Math.max(...weekdayData));
        const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const bestSellingDay = {
            day: weekdayData.some(d => d > 0) ? daysOfWeek[highestWeekdayIndex] : 'N/A',
            amount: weekdayData.some(d => d > 0) ? weekdayData[highestWeekdayIndex] : 0
        };

        // Process item data
        const itemEntries = Object.entries(itemsSummary);
        const totalQuantityOverall = itemEntries.reduce((sum, [_, data]) => sum + data.quantity, 0);

        // Top items by quantity
        const popularItems: PopularItem[] = itemEntries
            .map(([name, { quantity, total }]) => ({
                name, quantity, total,
                percentage: totalQuantityOverall > 0 ? (quantity / totalQuantityOverall) * 100 : 0
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10); // Show top 10

        // Top items by revenue
        const topItemsByRevenue: PopularItem[] = itemEntries
            .map(([name, { quantity, total }]) => ({
                name, quantity, total,
                percentage: totalSales > 0 ? (total / totalSales) * 100 : 0
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10); // Show top 10

        // Process categories (customize this logic based on your item names)
        const categoriesMap: { [key: string]: number } = { 'Tacos': 0, 'Bebidas': 0, 'Consomé': 0, 'Kilos': 0, 'Otros': 0 };
        itemEntries.forEach(([name, { total }]) => {
            const lowerName = name.toLowerCase();
            if (lowerName.includes('taco')) categoriesMap.Tacos += total;
            else if (lowerName.includes('refresco') || lowerName.includes('agua') || lowerName.includes('café') || lowerName.includes('jugo') || lowerName.includes('boing') || lowerName.includes('coca')) categoriesMap.Bebidas += total;
            else if (lowerName.includes('consomé') || lowerName.includes('consome') || lowerName.includes('caldo')) categoriesMap.Consomé += total;
            else if (lowerName.includes('kilo') || lowerName.includes('kg')) categoriesMap.Kilos += total;
            else categoriesMap.Otros += total;
        });

        // Format categories for display/charts
        const categoryColors = ['#D9534F', '#FFC107', '#5BC0DE', '#5CB85C', '#E57373', '#777777']; // Example colors
        const salesByCategory = Object.entries(categoriesMap)
            .filter(([_, amount]) => amount > 0) // Only include categories with sales
            .map(([category, amount], index) => ({
                name: category,
                value: amount,
                color: categoryColors[index % categoryColors.length],
                percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0
            }))
            .sort((a, b) => b.value - a.value); // Sort by value descending

        // Calculate growth (only for standard periods, comparing first half vs second half)
        let salesGrowth = 0;
        let itemsGrowth = 0;
        // Only calculate for periods likely to have a meaningful comparison (not 'day' or 'all'/'custom')
        if (dailyData.length >= 4 && ['week', 'month', 'year'].includes(period)) {
            const midPoint = Math.ceil(dailyData.length / 2);
            const firstHalfData = dailyData.slice(0, midPoint);
            const secondHalfData = dailyData.slice(midPoint);

            if (firstHalfData.length > 0 && secondHalfData.length > 0) {
                const firstHalfSales = firstHalfData.reduce((sum, day) => sum + day.sales, 0);
                const secondHalfSales = secondHalfData.reduce((sum, day) => sum + day.sales, 0);
                const firstHalfItems = firstHalfData.reduce((sum, day) => sum + day.items, 0);
                const secondHalfItems = secondHalfData.reduce((sum, day) => sum + day.items, 0);

                // Avoid division by zero and meaningless growth from zero
                if (firstHalfSales > 1) salesGrowth = ((secondHalfSales - firstHalfSales) / firstHalfSales) * 100;
                if (firstHalfItems > 0) itemsGrowth = ((secondHalfItems - firstHalfItems) / firstHalfItems) * 100;
            }
        }

        return {
            totalSales, totalItems, totalTickets, avgTicket, avgItemsPerTicket,
            mostPopularItems: popularItems, topItemsByRevenue,
            dailySales, dailyData,
            highestDailySale: finalHighest, lowestDailySale: finalLowest,
            bestSellingDay, itemCategories: categoriesMap, salesByCategory,
            hourlyDistribution, // Include hourly data
            weekdayDistribution: weekdayData, // Keep Sun-Sat internal representation
            salesGrowth, itemsGrowth
        };
    };

    // --- Memoized Chart Data ---
    const salesTrendData = useMemo(() => {
        if (!analytics?.dailyData || analytics.dailyData.length === 0) return null;

        let dataToDisplay = [...analytics.dailyData];
        const maxPoints = 15; // Max points for line chart readability

        // Group data if too many points for the selected period
        if (dataToDisplay.length > maxPoints && ['month', 'year', 'all', 'custom'].includes(selectedTimePeriod)) {
            const groupSize = Math.ceil(dataToDisplay.length / maxPoints);
            const groupedData: DayData[] = [];
            for (let i = 0; i < dataToDisplay.length; i += groupSize) {
                const group = dataToDisplay.slice(i, i + groupSize);
                const totalSalesGroup = group.reduce((sum, day) => sum + day.sales, 0);
                const totalItemsGroup = group.reduce((sum, day) => sum + day.items, 0);
                const totalTicketsGroup = group.reduce((sum, day) => sum + day.tickets, 0);
                // Use the start date of the group as the label
                groupedData.push({
                    day: group[0].day, // Label represents start of the period
                    sales: totalSalesGroup / group.length, // Average daily sales for the group
                    items: totalItemsGroup / group.length,
                    tickets: totalTicketsGroup / group.length,
                });
            }
            dataToDisplay = groupedData;
        }

        const labels = dataToDisplay.map(day => day.day); // 'DD/MM' format
        const salesValues = dataToDisplay.map(day => Math.round(day.sales));

        if (labels.length === 0 || salesValues.length === 0) return null;

        return {
            labels,
            datasets: [{
                data: salesValues,
                color: (opacity = 1) => chartConfig.color(opacity), // Use chartConfig color
                strokeWidth: 2
            }],
            legend: ['Ventas ($)']
        };
    }, [analytics?.dailyData, selectedTimePeriod, chartConfig]);

    // MODIFIED: Prepare weekday data for Mon-Sun display
    const weekdayDistributionData = useMemo(() => {
        if (!analytics?.weekdayDistribution || analytics.weekdayDistribution.every(v => v === 0)) return null;

        // Original data is [Sun, Mon, Tue, Wed, Thu, Fri, Sat]
        const rawData = analytics.weekdayDistribution;

        // Reorder labels for Mon-Sun display
        const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

        // Reorder data: Slice from Monday (index 1) onwards, then append Sunday (index 0)
        const reorderedData = [...rawData.slice(1), rawData[0]];
        const data = reorderedData.map(d => Math.round(d));

        return {
            labels: dayLabels,
            datasets: [{ data: data }]
        };
    }, [analytics?.weekdayDistribution]);

    const categoryDistributionData = useMemo(() => {
        if (!analytics?.salesByCategory || analytics.salesByCategory.length === 0) return null;
        // Prepare data suitable for PieChart
        return analytics.salesByCategory.map(category => ({
            name: `${category.name} (${category.percentage.toFixed(1)}%)`, // Name includes percentage
            population: Math.round(category.value), // Value for the chart
            color: category.color,
            legendFontColor: COLORS.textSubtle || '#555', // Legend text color
            legendFontSize: 12
        }));
    }, [analytics?.salesByCategory, COLORS]);

    // --- Event Handlers ---
    const handleTimePeriodChange = (period: TimePeriod) => {
        if (loading) return; // Prevent changes while loading
        setSelectedTimePeriod(period);
        setStartDate(null); // Clear custom dates if selecting a preset period
        setEndDate(null);
        // Data reload is triggered by useEffect watching selectedTimePeriod
    };

    const handleDateRangeSelect = (start: Date, end: Date) => {
        if (loading) return;
        setStartDate(start);
        setEndDate(end);
        setSelectedTimePeriod('custom'); // Set period to custom
        setDateRangePickerVisible(false); // Close picker
        // Data reload is triggered by useEffect watching startDate/endDate
    };

    const handleChartTypeChange = (type: ChartType) => {
        setChartType(type);
    };

    const handleRevenueMetricToggle = () => {
        setRevenueMetric(prev => (prev === 'quantity' ? 'revenue' : 'quantity'));
    };

    const refreshData = () => {
        if (!loading) {
             if (!isOnline) {
                 Alert.alert("Sin Conexión", "No se puede refrescar, se requiere conexión a internet.");
                 return;
             }
            console.log("Manual refresh triggered.");
            loadSalesData();
        }
    };


    // --- Render Helper Functions ---

    const renderLoading = () => (
        <View style={styles.loadingContainerFull}>
            <ActivityIndicator size="large" color={COLORS.primary || '#E5B93C'} />
            <Text style={styles.loadingText}>Cargando análisis avanzado...</Text>
        </View>
    );

    const renderNoData = () => (
        <View style={styles.noDataContainer}>
            <Ionicons name="analytics-outline" size={48} color={COLORS.subtle || '#cccccc'} />
            <Text style={styles.noDataText}>No hay datos de ventas para este período o filtro.</Text>
            {!isOnline && (
                 <Text style={[styles.noDataText, styles.offlineWarning]}>
                     (Estás sin conexión)
                 </Text>
            )}
            {selectedTimePeriod === 'custom' && (!startDate || !endDate) && (
                <Text style={[styles.noDataText, { marginTop: 5, fontSize: 14 }]}>
                    Seleccione un rango de fechas válido.
                </Text>
            )}
             <TouchableOpacity onPress={refreshData} style={styles.refreshButton} disabled={loading || !isOnline}>
                 <Ionicons name="refresh" size={18} color={loading || !isOnline ? COLORS.subtle : COLORS.primary} />
                 <Text style={[styles.refreshButtonText, {color: loading || !isOnline ? COLORS.subtle : COLORS.primary}]}>
                      Intentar de nuevo
                 </Text>
             </TouchableOpacity>
        </View>
    );

    // Filter Buttons Renderer
    const renderFilterButton = (period: TimePeriod, label: string, isCalendar = false) => (
        <Pressable
            key={period}
            style={({ pressed }) => [
                styles.filterButton,
                selectedTimePeriod === period && styles.filterButtonActive,
                isCalendar && styles.calendarButton, // Specific style for calendar
                (loading || !isOnline && period !== selectedTimePeriod) && styles.disabledButtonOpacity, // Dim if loading or offline and not selected
                pressed && styles.filterButtonPressed,
            ]}
            onPress={() => isCalendar ? setDateRangePickerVisible(true) : handleTimePeriodChange(period)}
            disabled={loading || (!isOnline && !isCalendar)} // Disable changing period if offline, but allow opening calendar
        >
            {isCalendar && (
                <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={selectedTimePeriod === 'custom' ? 'white' : COLORS.primary} // <-- Use primary color for icon when inactive
                    style={styles.calendarIcon}
                />
            )}
            <Text
                style={[
                    styles.filterButtonText,
                    selectedTimePeriod === period && styles.filterButtonTextActive
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );

    // --- CHART RENDERING FUNCTIONS ---

    const renderLineChart = () => {
        if (!salesTrendData) return renderNoData();
        return (
             <Animatable.View // Wrap the entire section
                animation="fadeInUp"
                duration={600}
                delay={100}
                style={styles.chartContainer} // Use updated container style
            >
                <Text style={styles.chartTitle}>Tendencia de Ventas</Text>
                <LineChart
                    data={salesTrendData}
                    width={chartWidth}
                    height={250}
                    chartConfig={chartConfig}
                    bezier
                    style={styles.chartStyle} // Use specific style
                    withDots={true}
                    withInnerLines={true}
                    withOuterLines={true}
                    withVerticalLabels={true}
                    withHorizontalLabels={true}
                    fromZero
                     yAxisLabel="$ " // Add space
                     yLabelsOffset={5}
                     xLabelsOffset={-5}
                     formatXLabel={ (value) => value } // Show full date label
                />
                {analytics && (
                    <Text style={styles.chartCaption}>
                        Total: ${analytics.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                )}
                {analytics && analytics.salesGrowth !== 0 && ['week', 'month', 'year'].includes(selectedTimePeriod) && (
                    <Animatable.View // Animate growth indicator
                        animation="fadeIn"
                        duration={500}
                        delay={300}
                        style={styles.growthIndicator}
                    >
                        <Ionicons
                            name={analytics.salesGrowth >= 0 ? 'trending-up' : 'trending-down'}
                            size={18}
                            color={analytics.salesGrowth >= 0 ? COLORS.success || 'green' : COLORS.error || 'red'}
                        />
                        <Text style={[styles.growthText, { color: analytics.salesGrowth >= 0 ? COLORS.success || 'green' : COLORS.error || 'red' }]}>
                            Ventas: {Math.abs(analytics.salesGrowth).toFixed(1)}% {analytics.salesGrowth >= 0 ? '▲' : '▼'} (vs período ant.)
                        </Text>
                    </Animatable.View>
                )}
            </Animatable.View>
        );
    };

    // MODIFIED: renderBarChart with improved UI and animation
    const renderBarChart = () => {
        if (!weekdayDistributionData) return renderNoData(); // Still need data check

        // Prepare data for the chart (already reordered Mon-Sun)
        const chartData = {
            labels: weekdayDistributionData.labels,
            datasets: [{
                data: weekdayDistributionData.datasets[0].data,
                colors: weekdayDistributionData.datasets[0].data.map( // Optional: Color bars differently?
                    () => (opacity = 1) => chartConfig.color(opacity) // Default: same color for all
                )
            }]
        };

        return (
            <Animatable.View // Wrap the entire section
                animation="fadeInUp"
                duration={600} // Adjust duration as needed
                delay={100} // Optional delay
                style={styles.chartContainer} // Apply updated container style
            >
                <Text style={styles.chartTitle}>Ventas por Día de la Semana (Lun-Dom)</Text>
                <BarChart
                    data={chartData}
                    width={chartWidth}
                    height={250} // Keep or adjust height as needed
                    chartConfig={chartConfig}
                    style={styles.chartStyle} // Use specific style for chart margins/padding if needed
                    showValuesOnTopOfBars={false} // <--- DISABLE VALUES ON BARS
                    verticalLabelRotation={0}
                    fromZero
                    showBarTops={false} // Keep bars flat-topped
                    yAxisLabel="$ " // Add space after $
                    yAxisSuffix="" // No suffix needed
                    // segments={4} // Optional: Control number of Y-axis lines
                    barPercentage={0.7} // Optional: Adjust bar width
                />
                 {/* Best selling day calculation remains based on original Sun-Sat index */}
                 {analytics && analytics.bestSellingDay.amount > 0 && (
                     <Animatable.View // Animate the card separately
                        animation="fadeIn"
                        duration={500}
                        delay={300} // Delay after chart fades in
                        style={styles.bestDayCardContainer} // Centering container
                     >
                         <View style={styles.bestDayCard}>
                             <Text style={styles.bestDayTitle}>Mejor día promedio</Text>
                             <Text style={styles.bestDayName}>{analytics.bestSellingDay.day}</Text>
                             <Text style={styles.bestDayAmount}>
                                 ${analytics.bestSellingDay.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                             </Text>
                         </View>
                     </Animatable.View>
                 )}
            </Animatable.View>
        );
    };


    const renderPieChart = () => {
        if (!categoryDistributionData || categoryDistributionData.length === 0) return renderNoData();
        return (
             <Animatable.View // Wrap the entire section
                animation="fadeInUp"
                duration={600}
                delay={100}
                style={styles.chartContainer} // Use updated container style
            >
                <Text style={styles.chartTitle}>Distribución de Ventas por Categoría</Text>
                <PieChart
                    data={categoryDistributionData}
                    width={chartWidth}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population" // Access the 'value' field
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[chartWidth / 4, 0]} // Adjust center alignment if needed
                    absolute // Show absolute values from 'population'
                    hasLegend={false} // Disable default legend, we'll build our own
                />
                 {/* Custom Legend / Breakdown */}
                 {analytics && analytics.salesByCategory.length > 0 && (
                    <Animatable.View // Animate category list
                        animation="fadeIn"
                        duration={500}
                        delay={300}
                        style={styles.categoriesGrid}
                    >
                         <Text style={styles.listTitle}>Detalle por Categoría:</Text>
                        {analytics.salesByCategory.map((category, index) => (
                            <View key={index} style={styles.categoryCard}>
                                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                                <View style={styles.categoryTextContainer}>
                                    <Text style={styles.categoryName} numberOfLines={1}>{category.name}</Text>
                                    <Text style={styles.categoryValue}>
                                        ${category.value.toLocaleString('es-MX', { maximumFractionDigits: 0 })} ({category.percentage.toFixed(1)}%)
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animatable.View>
                )}
            </Animatable.View>
        );
    };

    // REMOVED: renderContributionChart function is deleted.

     // --- RENDER BREAKDOWN DASHBOARD ---
     const renderBreakdownDashboard = () => {
         if (!analytics) return renderNoData();

         const itemsToShow = revenueMetric === 'quantity' ? analytics.mostPopularItems : analytics.topItemsByRevenue;
         const itemsTitle = revenueMetric === 'quantity' ? 'Artículos Más Vendidos (Cantidad)' : 'Artículos Más Rentables (Ingresos)';
         const itemsPercentageLabel = revenueMetric === 'quantity' ? '% Cant. Total' : '% Ingr. Total';

         return (
             <Animatable.View animation="fadeInUp" duration={500} style={styles.dashboardContainer}>
                 {/* Key Metrics Grid */}
                 <View style={styles.metricsGrid}>
                     {/* Metric Cards... (Wrap each in Animatable.View for stagger effect) */}
                     {[
                         { icon: "cash-multiple", value: `$${analytics.totalSales.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Ventas Totales", iconType: MaterialCommunityIcons },
                         { icon: "receipt-outline", value: analytics.totalTickets.toLocaleString('es-MX'), label: "Tickets Totales", iconType: Ionicons },
                         { icon: "fast-food-outline", value: analytics.totalItems.toLocaleString('es-MX'), label: "Artículos Vendidos", iconType: Ionicons },
                         { icon: "ticket-percent-outline", value: `$${analytics.avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, label: "Ticket Promedio", iconType: MaterialCommunityIcons },
                     ].map((metric, index) => (
                        <Animatable.View key={metric.label} animation="zoomIn" duration={400} delay={index * 100} style={styles.metricCard}>
                            <metric.iconType name={metric.icon as any} size={28} color={COLORS.primary || '#E5B93C'} />
                            <Text style={styles.metricValue}>{metric.value}</Text>
                            <Text style={styles.metricLabel}>{metric.label}</Text>
                        </Animatable.View>
                     ))}
                 </View>

                 {/* Mini Charts Container */}
                 <View style={styles.miniChartsContainer}>
                     {/* Mini Sales Trend */}
                     {salesTrendData && (
                          <Animatable.View animation="fadeIn" duration={400} delay={200} style={styles.miniChart}>
                             <Text style={styles.miniChartTitle}>Tendencia Ventas</Text>
                             <LineChart
                                 data={salesTrendData}
                                 width={chartWidth / 2 - 15}
                                 height={100}
                                 chartConfig={{ ...chartConfig, backgroundGradientFrom: COLORS.cardLight, backgroundGradientTo: COLORS.cardLight, propsForLabels: { fontSize: 0 } }}
                                 style={styles.miniChartStyle}
                                 withDots={false} withInnerLines={false} withOuterLines={false} withVerticalLines={false} withHorizontalLines={false} withVerticalLabels={false} withHorizontalLabels={false}
                                 bezier
                             />
                             <TouchableOpacity style={styles.miniChartButton} onPress={() => setChartType('line')}>
                                 <Text style={styles.miniChartButtonText}>Ver Detalle</Text>
                             </TouchableOpacity>
                         </Animatable.View>
                     )}
                     {/* Mini Category Pie */}
                     {categoryDistributionData && categoryDistributionData.length > 0 && (
                         <Animatable.View animation="fadeIn" duration={400} delay={300} style={styles.miniChart}>
                             <Text style={styles.miniChartTitle}>Categorías Top</Text>
                             <PieChart
                                 data={categoryDistributionData.slice(0, 3)}
                                 width={chartWidth / 2 - 15}
                                 height={100}
                                 chartConfig={{ ...chartConfig, propsForLabels: { fontSize: 0 } }}
                                 accessor="population"
                                 backgroundColor="transparent"
                                 center={[ (chartWidth / 2 - 15) / 5, 0]}
                                 hasLegend={false}
                                 absolute
                             />
                             <TouchableOpacity style={styles.miniChartButton} onPress={() => setChartType('pie')}>
                                 <Text style={styles.miniChartButtonText}>Ver Detalle</Text>
                             </TouchableOpacity>
                         </Animatable.View>
                     )}
                     {/* Mini Weekday Bar Chart */}
                    {weekdayDistributionData && (
                        <Animatable.View animation="fadeIn" duration={400} delay={400} style={styles.miniChart}>
                             <Text style={styles.miniChartTitle}>Actividad Semanal</Text>
                             <BarChart
                                 data={weekdayDistributionData} // Uses Mon-Sun data
                                 width={chartWidth / 2 - 15}
                                 height={100}
                                 chartConfig={{ ...chartConfig, backgroundGradientFrom: COLORS.cardLight, backgroundGradientTo: COLORS.cardLight, propsForLabels: { fontSize: 0 } }}
                                 style={styles.miniChartStyle}
                                 withInnerLines={false} withHorizontalLabels={false} showValuesOnTopOfBars={false} showBarTops={false} fromZero
                             />
                             <TouchableOpacity style={styles.miniChartButton} onPress={() => setChartType('bar')}>
                                 <Text style={styles.miniChartButtonText}>Ver Detalle</Text>
                             </TouchableOpacity>
                         </Animatable.View>
                    )}
                    {/* REMOVED: Contribution preview mini chart is deleted */}
                 </View>

                  {/* Top Selling Items Section */}
                  <Animatable.View animation="fadeIn" duration={500} delay={200} style={styles.topItemsSection}>
                       <View style={styles.sectionHeader}>
                           <Text style={styles.sectionTitle}>{itemsTitle}</Text>
                           <TouchableOpacity
                               style={styles.toggleButton}
                               onPress={handleRevenueMetricToggle}
                           >
                               <Ionicons
                                   name={revenueMetric === 'quantity' ? 'list-outline' : 'cash-outline'}
                                   size={16}
                                   color={COLORS.primary || '#E5B93C'}
                                   style={{ marginRight: 5 }}
                               />
                               <Text style={styles.toggleButtonText}>
                                   {revenueMetric === 'quantity' ? 'Por Cantidad' : 'Por Ingresos'}
                               </Text>
                           </TouchableOpacity>
                       </View>
                       <View style={styles.topItemsList}>
                           {itemsToShow.length > 0 ? itemsToShow.map((item, index) => (
                               // Add animation to list items if desired
                               <Animatable.View key={`${item.name}-${index}`} animation="fadeIn" duration={300} delay={index * 50}>
                                   <View style={styles.topItemRow}>
                                       <View style={styles.itemRank}>
                                           <Text style={styles.itemRankText}>{index + 1}</Text>
                                       </View>
                                       <View style={styles.itemDetails}>
                                           <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                                           <Text style={styles.itemSubtitle}>
                                               {item.quantity.toLocaleString('es-MX')} unidades · ${item.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                           </Text>
                                       </View>
                                       <View style={styles.itemPercentage}>
                                           <Text style={styles.percentageText}>{item.percentage.toFixed(1)}%</Text>
                                           <Text style={styles.percentageLabel}>{itemsPercentageLabel}</Text>
                                       </View>
                                   </View>
                               </Animatable.View>
                           )) : (
                               <Text style={styles.noDataTextSmall}>No hay datos de artículos para mostrar.</Text>
                           )}
                       </View>
                   </Animatable.View>

                 {/* Daily/Period Highlights */}
                 {analytics.totalTickets > 0 && (
                     <Animatable.View animation="fadeIn" duration={500} delay={300} style={styles.highlightsContainer}>
                         <Text style={styles.sectionTitle}>Resumen del Período</Text>
                         {/* Animate rows or individual cards */}
                         <Animatable.View animation="fadeIn" duration={400} delay={100} style={styles.highlightRow}>
                             <View style={[styles.highlightCard, { borderColor: COLORS.success || 'green' }]}>
                                 <View style={styles.highlightHeader}>
                                     <Ionicons name="trending-up" size={18} color={COLORS.success || 'green'} />
                                     <Text style={styles.highlightTitle}>Mayor Venta Diaria</Text>
                                 </View>
                                 <Text style={styles.highlightDate}>{analytics.highestDailySale.date}</Text>
                                 <Text style={styles.highlightAmount}>
                                     ${analytics.highestDailySale.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </Text>
                             </View>
                             <View style={[styles.highlightCard, { borderColor: COLORS.error || 'red' }]}>
                                 <View style={styles.highlightHeader}>
                                     <Ionicons name="trending-down" size={18} color={COLORS.error || 'red'} />
                                     <Text style={styles.highlightTitle}>Menor Venta Diaria</Text>
                                 </View>
                                 <Text style={styles.highlightDate}>{analytics.lowestDailySale.date}</Text>
                                 <Text style={styles.highlightAmount}>
                                     ${analytics.lowestDailySale.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                 </Text>
                             </View>
                         </Animatable.View>
                         <Animatable.View animation="fadeIn" duration={400} delay={200} style={styles.highlightRow}>
                              {analytics.bestSellingDay.amount > 0 && (
                                 <View style={[styles.highlightCard, { borderColor: COLORS.primary || '#E5B93C' }]}>
                                     <View style={styles.highlightHeader}>
                                         <MaterialCommunityIcons name="calendar-star" size={18} color={COLORS.primary || '#E5B93C'} />
                                         <Text style={styles.highlightTitle}>Mejor Día (Prom.)</Text>
                                     </View>
                                     <Text style={styles.highlightDate}>{analytics.bestSellingDay.day}</Text>
                                     <Text style={styles.highlightAmount}>
                                         ${analytics.bestSellingDay.amount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                     </Text>
                                 </View>
                              )}
                              {['week', 'month', 'year'].includes(selectedTimePeriod) && analytics.salesGrowth !== 0 && (
                                 <View style={[styles.highlightCard, { borderColor: analytics.salesGrowth >= 0 ? COLORS.success || 'green' : COLORS.error || 'red' }]}>
                                     <View style={styles.highlightHeader}>
                                         <MaterialCommunityIcons
                                             name="chart-line"
                                             size={18}
                                             color={analytics.salesGrowth >= 0 ? COLORS.success || 'green' : COLORS.error || 'red'}
                                         />
                                         <Text style={styles.highlightTitle}>Tendencia Ventas</Text>
                                     </View>
                                     <Text style={styles.highlightDate}>vs período anterior</Text>
                                     <Text style={[styles.highlightAmount, { color: analytics.salesGrowth >= 0 ? COLORS.success || 'green' : COLORS.error || 'red' }]}>
                                         {analytics.salesGrowth >= 0 ? '+' : ''}{analytics.salesGrowth.toFixed(1)}%
                                     </Text>
                                 </View>
                              )}
                              {/* Add placeholder if only one card is shown in the second row */}
                              {analytics.bestSellingDay.amount <= 0 && (
                                  <View style={[styles.highlightCard, { opacity: 0 }]} /> // Invisible placeholder
                              )}
                              {!(['week', 'month', 'year'].includes(selectedTimePeriod) && analytics.salesGrowth !== 0) && (
                                   <View style={[styles.highlightCard, { opacity: 0 }]} /> // Invisible placeholder
                              )}
                          </Animatable.View>
                      </Animatable.View>
                  )}

                  {/* Hourly Distribution */}
                  {Object.keys(analytics.hourlyDistribution).length > 0 && (
                      <Animatable.View animation="fadeIn" duration={500} delay={400} style={styles.detailSection}>
                          <Text style={styles.sectionTitle}>Distribución Horaria (Ventas $)</Text>
                          <View style={styles.hourlyList}>
                              {Object.entries(analytics.hourlyDistribution)
                                  .sort(([hourA], [hourB]) => hourA.localeCompare(hourB))
                                  .map(([hour, total]) => (
                                      <View key={hour} style={styles.hourlyItem}>
                                          <Text style={styles.hourlyTime}>{hour}</Text>
                                          <Text style={styles.hourlyAmount}>${total.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</Text>
                                      </View>
                                  ))}
                          </View>
                      </Animatable.View>
                  )}
             </Animatable.View>
         );
     };


    // --- Main Content Renderer ---
    const renderContent = () => {
        // Initial loading state (full screen)
        if (loading && !analytics) {
            return renderLoading();
        }
         // No data state (after loading attempt)
        if (!analytics && !loading) {
            return renderNoData();
        }
         // Data loaded, show dashboard or specific chart
        if (analytics) {
             // Show overlay loader if reloading data in the background
             const showReloadingIndicator = loading && analytics;

             return (
                 <View style={{ position: 'relative', flex: 1 }}>
                     {showReloadingIndicator && (
                         <View style={styles.loadingOverlay}>
                             <ActivityIndicator size="small" color={COLORS.primary || '#E5B93C'} />
                              <Text style={styles.reloadingText}>Actualizando...</Text>
                         </View>
                     )}
                      {/* Render selected view */}
                     {(() => {
                         switch (chartType) {
                             case 'line': return renderLineChart();
                             case 'bar': return renderBarChart();
                             case 'pie': return renderPieChart();
                             // REMOVED: case 'contribution'
                             case 'breakdown': default: return renderBreakdownDashboard();
                         }
                     })()}
                 </View>
             );
        }
         // Fallback / Error state (should ideally be handled by noData)
        return renderNoData();
    };

    // --- Main Return ---
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />
            <Stack.Screen
                options={{
                    title: title,
                    headerShadowVisible: false, // Cleaner look
                    headerStyle: { backgroundColor: COLORS.background || '#f8f8f8' },
                    headerTitleStyle: { color: COLORS.text || '#000', fontSize: 18, fontWeight: '600' },
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                            <Ionicons name="arrow-back" size={24} color={COLORS.text || '#000'} />
                        </TouchableOpacity>
                    ),
                    headerRight: () => (
                        <TouchableOpacity
                            onPress={refreshData}
                            style={styles.headerButton}
                            disabled={loading || !isOnline}
                        >
                            <Ionicons
                                name="refresh"
                                size={24}
                                color={loading || !isOnline ? COLORS.subtle : COLORS.primary}
                            />
                        </TouchableOpacity>
                    )
                }}
            />

            {/* Controls Area */}
            <View style={styles.controlsContainer}>
                {/* Time period selector */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.periodSelectorScroll}
                >
                    {renderFilterButton('day', 'Hoy')}
                    {renderFilterButton('week', 'Semana')}
                    {renderFilterButton('month', 'Mes')}
                    {renderFilterButton('year', 'Año')}
                    {renderFilterButton('all', 'Todo')}
                    {renderFilterButton('custom', 'Fechas', true)}
                </ScrollView>

                {/* MODIFIED: Chart type/view selector (removed 'contribution') */}
                <ScrollView
                     horizontal
                     showsHorizontalScrollIndicator={false}
                     contentContainerStyle={styles.chartTypeSelectorScroll}
                  >
                    {(['breakdown', 'line', 'bar', 'pie'] as ChartType[]).map(type => ( // Removed 'contribution'
                        <TouchableOpacity
                            key={type}
                            style={[
                                styles.chartTypeButton,
                                chartType === type && styles.chartTypeButtonActive,
                                loading && styles.disabledButtonOpacity,
                            ]}
                            onPress={() => handleChartTypeChange(type)}
                            disabled={loading}
                        >
                            <Ionicons
                                name={{ breakdown: 'grid', line: 'trending-up', bar: 'bar-chart', pie: 'pie-chart' }[type] as any} // Removed 'contribution' icon mapping
                                size={20}
                                color={chartType === type ? (COLORS.primary || '#E5B93C') : (COLORS.textSubtle || '#555')}
                            />
                             <Text style={[
                                 styles.chartTypeLabel,
                                 chartType === type && styles.chartTypeLabelActive
                             ]}>
                                 {{ breakdown: 'Resumen', line: 'Tendencia', bar: 'Días', pie: 'Categorías' }[type]} {/* Removed 'Actividad' label mapping */}
                             </Text>
                        </TouchableOpacity>
                    ))}
                 </ScrollView>

                 {/* Online/Offline Indicator */}
                 {!isOnline && (
                     <Animatable.View animation="fadeIn" duration={500} style={styles.offlineIndicator}>
                         <Ionicons name="cloud-offline-outline" size={16} color={COLORS.error} />
                         <Text style={styles.offlineText}>Sin Conexión</Text>
                     </Animatable.View>
                 )}

            </View>

            {/* Main Content Scroll Area */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContentContainer}
                showsVerticalScrollIndicator={false}
            >
                {renderContent()}
            </ScrollView>

            {/* Date Range Picker Modal */}
            <DateRangePicker
                isVisible={dateRangePickerVisible}
                onClose={() => setDateRangePickerVisible(false)}
                onSelectRange={handleDateRangeSelect}
                 initialStartDate={startDate}
                 initialEndDate={endDate}
            />

        </SafeAreaView>
    );
}

// --- Styles --- (Incorporating updated styles for Bar Chart section)
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background || '#f8f8f8',
    },
    headerButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    controlsContainer: {
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border || '#eee',
        backgroundColor: COLORS.background || '#f8f8f8',
    },
    periodSelectorScroll: {
        paddingVertical: 10,
        paddingHorizontal: 16, // Consistent padding
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginRight: 10, // Consistent spacing
        backgroundColor: COLORS.cardLight || '#e9e9e9',
        borderWidth: 1,
        borderColor: COLORS.borderLight, // Use light border
        height: 38,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
    },
    filterButtonPressed: {
        backgroundColor: COLORS.border || '#ddd',
    },
    filterButtonActive: {
        backgroundColor: COLORS.primary || '#E5B93C',
        borderColor: COLORS.primaryDark || '#b8860b',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    filterButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSubtle || '#555',
    },
    filterButtonTextActive: {
        color: 'white',
    },
    calendarButton: {
        // Specific style for calendar
    },
    calendarIcon: {
        marginRight: 5,
    },
    chartTypeSelectorScroll: {
         paddingHorizontal: 16, // Consistent padding
         paddingVertical: 8,
         alignItems: 'center',
     },
     chartTypeButton: {
         flexDirection: 'row',
         alignItems: 'center',
         paddingHorizontal: 12,
         paddingVertical: 8,
         borderRadius: 18,
         marginRight: 10, // Consistent spacing
         backgroundColor: COLORS.cardLight || '#f0f0f0',
         borderWidth: 1,
         borderColor: COLORS.borderLight, // Light border
     },
     chartTypeButtonActive: {
         backgroundColor: COLORS.primaryLight || '#fcecc5',
         borderColor: COLORS.primary || '#E5B93C',
     },
     chartTypeLabel: {
         marginLeft: 6,
         fontSize: 12,
         fontWeight: '500',
         color: COLORS.textSubtle || '#555',
     },
     chartTypeLabelActive: {
         color: COLORS.primaryDark || '#8c6d1f',
         fontWeight: '600',
     },
    offlineIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 4,
        marginTop: 5,
        marginHorizontal: 16, // Consistent padding
        backgroundColor: COLORS.errorLight || '#fee',
        borderRadius: 10,
    },
    offlineText: {
        marginLeft: 5,
        fontSize: 12,
        color: COLORS.error || 'red',
        fontWeight: '500',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContentContainer: {
        padding: 16, // Consistent padding
        paddingBottom: 40,
        flexGrow: 1, // Ensure content can fill space if needed
    },
     loadingContainerFull: {
         flex: 1, // Take full space within scroll content
         justifyContent: 'center',
         alignItems: 'center',
         padding: 20,
     },
     loadingText: {
         marginTop: 12,
         fontSize: 16,
         color: COLORS.textSubtle || '#666',
     },
     loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderRadius: 12,
    },
    reloadingText: {
        marginTop: 5,
        fontSize: 12,
        color: COLORS.primaryDark,
        fontWeight: '500',
    },
    noDataContainer: {
        flex: 1, // Take full space within scroll content
        justifyContent: 'center',
        alignItems: 'center',
        padding: 30,
        backgroundColor: COLORS.card || '#ffffff',
        borderRadius: 12,
        marginVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.borderLight || '#eee',
    },
    noDataText: {
        marginTop: 15,
        fontSize: 16,
        color: COLORS.textSubtle || '#666',
        textAlign: 'center',
    },
     offlineWarning: {
         fontSize: 13,
         color: COLORS.error,
         fontWeight: '500',
         marginTop: 5,
     },
     refreshButton: {
         flexDirection: 'row',
         alignItems: 'center',
         marginTop: 20,
         paddingVertical: 8,
         paddingHorizontal: 15,
         borderRadius: 20,
         borderWidth: 1,
         borderColor: COLORS.primary,
     },
     refreshButtonText: {
         marginLeft: 8,
         fontSize: 14,
         fontWeight: '600',
         color: COLORS.primary,
     },
    noDataTextSmall: {
        fontSize: 13,
        color: COLORS.textSubtle || '#888',
        textAlign: 'center',
        paddingVertical: 15,
    },
    // Updated Chart Container Style
    chartContainer: {
        backgroundColor: COLORS.card || '#ffffff',
        borderRadius: 12, // Match SalesHistory card radius
        paddingVertical: 20, // More vertical padding
        paddingHorizontal: 15,
        marginBottom: 20, // Keep consistent margin
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, // Consistent shadow
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3, // Consistent elevation
        borderWidth: 1, // Consistent border
        borderColor: COLORS.borderLight || '#eee', // Consistent border color
    },
    chartTitle: {
        fontSize: 16, // Adjusted size
        fontWeight: '600',
        marginBottom: 20, // Space below title
        color: COLORS.text || '#333',
        textAlign: 'center',
    },
    // Renamed from 'chart'
    chartStyle: {
        marginVertical: 8,
    },
    chartCaption: {
        fontSize: 12,
        color: COLORS.textSubtle || '#666',
        textAlign: 'center',
        marginTop: 10,
    },
    growthIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
        paddingVertical: 5,
    },
    growthText: {
        marginLeft: 8,
        fontSize: 13,
        fontWeight: '500',
    },
    // Updated Best Day Card Styles
    bestDayCardContainer: {
        alignItems: 'center',
        marginTop: 25,
    },
    bestDayCard: {
        backgroundColor: COLORS.primaryLight || '#fcecc5',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary || '#E5B93C',
        maxWidth: 250,
    },
    bestDayTitle: {
        fontSize: 13,
        color: COLORS.primaryDark || '#8c6d1f',
        marginBottom: 4,
        fontWeight: '500',
    },
    bestDayName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primaryDark || '#8c6d1f',
        marginBottom: 6,
    },
    bestDayAmount: {
        fontSize: 16,
        color: COLORS.primaryDark || '#8c6d1f',
        fontWeight: '600',
    },
     listTitle: { // For Pie chart custom legend
         fontSize: 14,
         fontWeight: '600',
         color: COLORS.textSubtle,
         marginBottom: 10,
         paddingLeft: 5,
     },
     categoriesGrid: {
        marginTop: 15,
         paddingHorizontal: 5,
     },
     categoryCard: {
         flexDirection: 'row',
         alignItems: 'center',
         marginBottom: 10,
         paddingVertical: 5,
     },
     categoryDot: {
         width: 12,
         height: 12,
         borderRadius: 6,
         marginRight: 12,
     },
     categoryTextContainer: {
         flex: 1,
     },
     categoryName: {
         fontSize: 14,
         color: COLORS.text || '#333',
         fontWeight: '500',
         flexShrink: 1,
     },
     categoryValue: {
         fontSize: 13,
         color: COLORS.textSubtle || '#666',
     },
    dashboardContainer: {
        // No specific styles needed, acts as a wrapper
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    metricCard: {
        width: '48%', // Use percentage for responsiveness
        backgroundColor: COLORS.card || '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 12, // Space between rows
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
        borderWidth: 1,
        borderColor: COLORS.borderLight || '#eee', // Lighter border
    },
    metricValue: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text || '#333',
        marginTop: 8,
        marginBottom: 4,
        textAlign: 'center',
    },
    metricLabel: {
        fontSize: 12,
        color: COLORS.textSubtle || '#666',
        textAlign: 'center',
    },
    miniChartsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    miniChart: {
        width: '48%', // Two per row
        backgroundColor: COLORS.cardLight || '#f7f7f7', // Lighter background for mini charts
        borderRadius: 10,
        padding: 10,
        marginBottom: 10, // Space when wrapping
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        position: 'relative', // For button positioning
         borderWidth: 1,
         borderColor: COLORS.borderLight || '#eee', // Lighter border
         minHeight: 150, // Ensure consistent height
         justifyContent: 'space-between', // Push title up, button down
    },
    miniChartTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text || '#333',
        marginBottom: 5,
        textAlign: 'center',
    },
    miniChartStyle: {
        marginVertical: 5,
    },
    miniChartButton: {
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.primaryLight,
    },
    miniChartButtonText: {
        fontSize: 10,
        color: COLORS.primary || '#E5B93C',
        fontWeight: '700', // Bolder text
    },
     contributionPreview: { // Style kept in case needed for something else, but content removed
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
         padding: 10,
     },
     contributionPreviewText: { // Style kept in case needed
         fontSize: 14,
         fontWeight: '500',
         color: COLORS.textSubtle,
         textAlign: 'center',
     },
    topItemsSection: {
        backgroundColor: COLORS.card || '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
         borderWidth: 1,
         borderColor: COLORS.borderLight || '#eee', // Lighter border
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight || '#eee', // Lighter border
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text || '#333',
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardLight || '#f0f0f0',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 15,
    },
    toggleButtonText: {
        fontSize: 12,
        color: COLORS.primary || '#E5B93C',
        fontWeight: '600',
    },
    topItemsList: {
        // Container for item rows
    },
    topItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderLight || '#f5f5f5', // Lighter border
    },
    itemRank: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primaryLight || '#fcecc5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemRankText: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.primaryDark || '#8c6d1f',
    },
    itemDetails: {
        flex: 1,
        marginRight: 10,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text || '#333',
        marginBottom: 3,
    },
    itemSubtitle: {
        fontSize: 12,
        color: COLORS.textSubtle || '#666',
    },
    itemPercentage: {
        alignItems: 'flex-end',
        minWidth: 60, // Ensure space for percentage
    },
    percentageText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary || '#E5B93C',
    },
    percentageLabel: {
        fontSize: 10,
        color: COLORS.textSubtle || '#888',
    },
    highlightsContainer: {
        backgroundColor: COLORS.card || '#ffffff',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 2,
         borderWidth: 1,
         borderColor: COLORS.borderLight || '#eee', // Lighter border
    },
    highlightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12, // Space between rows of cards
    },
    highlightCard: {
        width: '48%', // Two cards per row
        backgroundColor: COLORS.cardLight || '#f7f7f7',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 4, // Use border for visual cue
         minHeight: 100, // Consistent height
         justifyContent: 'space-between', // Distribute content vertically
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    highlightTitle: {
        fontSize: 13, // Slightly larger title
        fontWeight: '600',
        color: COLORS.textSubtle || '#555',
        marginLeft: 8,
    },
    highlightDate: {
        fontSize: 11,
        color: COLORS.textSubtle || '#777',
        marginBottom: 4,
    },
    highlightAmount: {
        fontSize: 16, // Larger amount
        fontWeight: '700',
        color: COLORS.text || '#333',
        marginTop: 4, // Space above amount
    },
    disabledButtonOpacity: { // Utility style for dimming buttons
        opacity: 0.5,
    },
     // Styles for Hourly Distribution List
     detailSection: {
         backgroundColor: COLORS.card || '#ffffff',
         borderRadius: 12,
         padding: 15,
         marginBottom: 20,
         shadowColor: '#000',
         shadowOffset: { width: 0, height: 1 },
         shadowOpacity: 0.08,
         shadowRadius: 3,
         elevation: 2,
         borderWidth: 1,
         borderColor: COLORS.borderLight || '#eee', // Lighter border
     },
     hourlyList: {
         marginTop: 10,
     },
     hourlyItem: {
         flexDirection: 'row',
         justifyContent: 'space-between',
         paddingVertical: 8,
         borderBottomWidth: 1,
         borderBottomColor: COLORS.borderLight || '#f0f0f0', // Lighter border
     },
     hourlyTime: {
         fontSize: 14,
         color: COLORS.textSubtle || '#555',
         fontWeight: '500',
     },
     hourlyAmount: {
         fontSize: 14,
         color: COLORS.text || '#333',
         fontWeight: '600',
     },
});