import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderItem } from 'types';

export interface SaleRecord {
  id: string;
  tableNumber: number;
  items: OrderItem[];
  total: number;
  timestamp: number;
  date: string;
}

// Key for storing all sales
const SALES_STORAGE_KEY = 'la_gota_de_oro_sales';

// Save a new sale to storage
export const saveSale = async (tableNumber: number, items: OrderItem[], total: number): Promise<SaleRecord> => {
  try {
    // Get existing sales
    const existingSales = await getSales();
    
    // Create new sale record
    const now = new Date();
    const newSale: SaleRecord = {
      id: Date.now().toString(),
      tableNumber,
      items,
      total,
      timestamp: now.getTime(),
      date: now.toISOString(),
    };
    
    // Add new sale to existing sales
    const updatedSales = [...existingSales, newSale];
    
    // Save back to storage
    await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));
    
    return newSale;
  } catch (error) {
    console.error('Error saving sale:', error);
    throw error;
  }
};

// Get all sales from storage
export const getSales = async (): Promise<SaleRecord[]> => {
  try {
    const salesJson = await AsyncStorage.getItem(SALES_STORAGE_KEY);
    if (salesJson) {
      return JSON.parse(salesJson);
    }
    return [];
  } catch (error) {
    console.error('Error getting sales:', error);
    return [];
  }
};

// Clear all sales from storage (for admin purposes)
export const clearAllSales = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SALES_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing sales:', error);
    throw error;
  }
};

// Get sales for a specific date range
export const getSalesByDateRange = async (startDate: Date, endDate: Date): Promise<SaleRecord[]> => {
  try {
    const allSales = await getSales();
    return allSales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= startDate && saleDate <= endDate;
    });
  } catch (error) {
    console.error('Error getting sales by date range:', error);
    return [];
  }
};

// Get sales for today
export const getTodaySales = async (): Promise<SaleRecord[]> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return getSalesByDateRange(today, tomorrow);
};

// Get sales for current week
export const getCurrentWeekSales = async (): Promise<SaleRecord[]> => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - dayOfWeek);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  
  return getSalesByDateRange(startDate, endDate);
};
