import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  SafeAreaView, 
  Dimensions,
  ScrollView,
  Pressable
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { COLORS } from '../theme';

type ChartType = 'line' | 'bar';

export default function ChartDetailScreen() {
  const params = useLocalSearchParams();
  const [chartData, setChartData] = useState<any>(null);
  const [chartType, setChartType] = useState<ChartType>('line');
  const title = params.title as string || 'Ventas por Día';
  
  useEffect(() => {
    if (params.chartData) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(params.chartData as string));
        setChartData(decodedData);
      } catch (error) {
        console.error('Error parsing chart data:', error);
      }
    }
  }, [params.chartData]);
  
  const renderChart = () => {
    if (!chartData || chartData.datasets[0].data.length === 0) {
      return (
        <View style={styles.noDataContainer}>
          <Ionicons name="bar-chart-outline" size={48} color="#CCC" />
          <Text style={styles.noDataText}>No hay datos suficientes</Text>
        </View>
      );
    }
    
    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
    } else {
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
        color={chartType === type ? 'white' : '#666'} 
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
        <View style={styles.chartTypeContainer}>
          {renderChartTypeButton('line', 'Línea', 'trending-up-outline')}
          {renderChartTypeButton('bar', 'Barras', 'stats-chart-outline')}
        </View>
        
        <View style={styles.chartWrapper}>
          {renderChart()}
        </View>
        
        <View style={styles.statsContainer}>
          {chartData && chartData.datasets[0].data.length > 0 && (
            <>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>
                  ${chartData.datasets[0].data.reduce((a: number, b: number) => a + b, 0).toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Promedio</Text>
                <Text style={styles.statValue}>
                  ${(chartData.datasets[0].data.reduce((a: number, b: number) => a + b, 0) / 
                    chartData.datasets[0].data.length).toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Máximo</Text>
                <Text style={styles.statValue}>
                  ${Math.max(...chartData.datasets[0].data).toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  backButton: {
    padding: 8,
  },
  content: {
    padding: 16,
  },
  chartTypeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  chartTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F0F0F0',
  },
  chartTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  chartTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 6,
  },
  chartTypeTextActive: {
    color: 'white',
  },
  chartWrapper: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  statsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    marginBottom: 16,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
});