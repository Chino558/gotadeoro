import AsyncStorage from '@react-native-async-storage/async-storage';
import { OrderItem } from 'types';
import { supabase } from './supabase';
import NetInfo from '@react-native-community/netinfo';

export interface SaleRecord {
  id: string;
  tableNumber: number;
  tableName: string;
  items: OrderItem[];
  total: number;
  timestamp: number;
  date: string;
  synced?: boolean; // New field to track sync status
}

// Key for storing all sales
const SALES_STORAGE_KEY = 'la_gota_de_oro_sales';
// Key for pending syncs
const PENDING_SYNC_KEY = 'la_gota_de_oro_pending_syncs';
// Key for failed syncs count (to prevent infinite loops)
const SYNC_ATTEMPTS_KEY = 'la_gota_de_oro_sync_attempts';
// Maximum number of sync attempts
const MAX_SYNC_ATTEMPTS = 3;

// Check if online
const isOnline = async (): Promise<boolean> => {
  const state = await NetInfo.fetch();
  return state.isConnected ?? false;
};

// Sync a single sale to Supabase
const syncSaleToSupabase = async (sale: SaleRecord): Promise<boolean> => {
  try {
    // Prepare the items data to ensure it's properly formatted as JSONB
    // Some items might be undefined or have circular references
    // We stringify and parse to ensure clean JSON
    const cleanItems = JSON.parse(JSON.stringify(sale.items || []));
    
    // Add additional debugging
    console.log('Attempting to sync sale to Supabase:', JSON.stringify({
      id: sale.id,
      tableNumber: sale.tableNumber,
      tableName: sale.tableName,
      itemsCount: cleanItems?.length || 0
    }));

    const { error } = await supabase
      .from('sales')
      .insert({
        id: sale.id,
        table_number: sale.tableNumber,
        table_name: sale.tableName,
        items: cleanItems,
        total: sale.total,
        timestamp: new Date(sale.timestamp),
        local_date: sale.date
      });

    if (error) {
      console.error('Error syncing sale to Supabase:', JSON.stringify(error));
      return false;
    }
    console.log('Sale synced successfully');
    return true;
  } catch (error) {
    console.error('Exception syncing sale to Supabase:', error);
    return false;
  }
};

// Add a sale to the pending sync queue
const addToPendingSync = async (saleId: string): Promise<void> => {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    const pending = pendingJson ? JSON.parse(pendingJson) : [];
    
    if (!pending.includes(saleId)) {
      pending.push(saleId);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
    }

    // Reset sync attempts for this sale
    const attemptsJson = await AsyncStorage.getItem(SYNC_ATTEMPTS_KEY);
    const attempts = attemptsJson ? JSON.parse(attemptsJson) : {};
    attempts[saleId] = 0;
    await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch (error) {
    console.error('Error adding to pending sync:', error);
  }
};

// Remove a sale from the pending sync queue
const removeFromPendingSync = async (saleId: string): Promise<void> => {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    if (pendingJson) {
      const pending = JSON.parse(pendingJson);
      const filtered = pending.filter((id: string) => id !== saleId);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(filtered));
    }
    
    // Remove sync attempts for this sale
    const attemptsJson = await AsyncStorage.getItem(SYNC_ATTEMPTS_KEY);
    if (attemptsJson) {
      const attempts = JSON.parse(attemptsJson);
      delete attempts[saleId];
      await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(attempts));
    }
  } catch (error) {
    console.error('Error removing from pending sync:', error);
  }
};

// Increment sync attempts for a sale
const incrementSyncAttempts = async (saleId: string): Promise<number> => {
  try {
    const attemptsJson = await AsyncStorage.getItem(SYNC_ATTEMPTS_KEY);
    const attempts = attemptsJson ? JSON.parse(attemptsJson) : {};
    
    // Initialize if not exists
    if (!attempts[saleId]) {
      attempts[saleId] = 0;
    }
    
    // Increment
    attempts[saleId] += 1;
    await AsyncStorage.setItem(SYNC_ATTEMPTS_KEY, JSON.stringify(attempts));
    
    return attempts[saleId];
  } catch (error) {
    console.error('Error incrementing sync attempts:', error);
    return 0;
  }
};

// Get all pending syncs
export const getPendingSyncs = async (): Promise<string[]> => {
  try {
    const pendingJson = await AsyncStorage.getItem(PENDING_SYNC_KEY);
    return pendingJson ? JSON.parse(pendingJson) : [];
  } catch (error) {
    console.error('Error getting pending syncs:', error);
    return [];
  }
};

// Process all pending syncs
export const processPendingSyncs = async (): Promise<void> => {
  if (!(await isOnline())) {
    console.log('Not online, skipping sync processing');
    return; // Skip if offline
  }

  const pendingIds = await getPendingSyncs();
  console.log(`Processing ${pendingIds.length} pending syncs`);
  if (pendingIds.length === 0) return;

  const allSales = await getSales();
  let updateSales = false;
  
  for (const saleId of pendingIds) {
    const sale = allSales.find(s => s.id === saleId);
    
    if (sale) {
      console.log(`Syncing sale ${saleId}`);
      const attemptCount = await incrementSyncAttempts(saleId);
      
      if (attemptCount > MAX_SYNC_ATTEMPTS) {
        console.log(`Exceeded max attempts (${MAX_SYNC_ATTEMPTS}) for sale ${saleId}, removing from queue`);
        await removeFromPendingSync(saleId);
        continue; // Skip to next sale
      }
      
      const success = await syncSaleToSupabase(sale);
      if (success) {
        // Mark as synced
        sale.synced = true;
        updateSales = true;
        await removeFromPendingSync(saleId);
      } else {
        console.log(`Failed to sync sale ${saleId}, attempt ${attemptCount}/${MAX_SYNC_ATTEMPTS}`);
        // We don't immediately remove failed syncs anymore,
        // they'll be removed after MAX_SYNC_ATTEMPTS
      }
    } else {
      // If sale is not found, remove from pending sync
      console.log(`Sale ${saleId} not found, removing from pending sync`);
      await removeFromPendingSync(saleId);
    }
  }

  // Update all sales with sync status only if needed
  if (updateSales) {
    await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(allSales));
  }
};

// Save a new sale to storage and Supabase (if online)
export const saveSale = async (
  tableNumber: number, 
  items: OrderItem[], 
  total: number,
  tableName?: string
): Promise<SaleRecord> => {
  try {
    console.log('Saving sale:', {tableNumber, itemsCount: items?.length, total});
    
    // Get existing sales
    const existingSales = await getSales();
    
    // Get table name from storage if not provided
    let actualTableName = tableName;
    if (!actualTableName) {
      try {
        // Import table names service
        const { getTableNames } = await import('./tableNames');
        const tableNames = await getTableNames();
        
        // Use the specific table name or default to "Mesa X"
        actualTableName = tableNames[tableNumber] || `Mesa ${tableNumber}`;
      } catch (error) {
        console.error('Error getting table name:', error);
        actualTableName = `Mesa ${tableNumber}`;
      }
    }
    
    // Create new sale record with the proper table name
    const now = new Date();
    const newSale: SaleRecord = {
      id: Date.now().toString(),
      tableNumber,
      tableName: actualTableName,
      items: items || [],
      total,
      timestamp: now.getTime(),
      date: now.toISOString(),
      synced: false
    };
    
    console.log('Created new sale record:', newSale.id);
    
    // Add new sale to existing sales
    const updatedSales = [...existingSales, newSale];
    
    // Save to storage first
    await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));
    console.log('Saved sale to local storage');
    
    // Try to sync immediately if online
    const online = await isOnline();
    if (online) {
      console.log('Online, attempting immediate sync');
      const synced = await syncSaleToSupabase(newSale);
      if (synced) {
        newSale.synced = true;
        // Update in storage
        updatedSales[updatedSales.length - 1].synced = true;
        await AsyncStorage.setItem(SALES_STORAGE_KEY, JSON.stringify(updatedSales));
        console.log('Updated sync status in storage');
      } else {
        // Add to pending sync if sync failed
        console.log('Sync failed, adding to pending');
        await addToPendingSync(newSale.id);
      }
    } else {
      // Add to pending sync if offline
      console.log('Offline, adding to pending sync');
      await addToPendingSync(newSale.id);
    }
    
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

// Get all sales including processing pending syncs
export const getSalesAndSync = async (): Promise<SaleRecord[]> => {
  try {
    // Try to process any pending syncs first
    await processPendingSyncs();
    return getSales();
  } catch (error) {
    console.error('Error in getSalesAndSync:', error);
    return getSales();
  }
};

// Clear all sales from storage (for admin purposes)
export const clearAllSales = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SALES_STORAGE_KEY);
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    await AsyncStorage.removeItem(SYNC_ATTEMPTS_KEY);
    
    // Also clear from Supabase if online
    if (await isOnline()) {
      await supabase.from('sales').delete().gte('id', '0');
    }
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

// Get sales for current week (starting from Saturday)
export const getCurrentWeekSales = async (): Promise<SaleRecord[]> => {
  const today = new Date();
  // Calculate days since last Saturday (where Saturday is 6)
  // This ensures our week starts on Saturday
  let daysSinceSaturday = today.getDay();
  if (daysSinceSaturday < 6) {
    daysSinceSaturday = daysSinceSaturday + 1;
  } else {
    daysSinceSaturday = 0; // It's Saturday
  }
  
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - daysSinceSaturday);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 7);
  
  return getSalesByDateRange(startDate, endDate);
};