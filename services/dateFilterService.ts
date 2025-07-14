import { SaleRecord, getSales } from './storage';

// Get sales in a specific date range
export const getSalesByCustomRange = async (startDate: Date, endDate: Date): Promise<SaleRecord[]> => {
  try {
    console.log(`Getting sales for custom range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Make sure startDate is set to the beginning of the day
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    // Make sure endDate is set to the end of the day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const allSales = await getSales();
    
    const filteredSales = allSales.filter(sale => {
      const saleDate = new Date(sale.timestamp);
      return saleDate >= start && saleDate <= end;
    });
    
    console.log(`Found ${filteredSales.length} sales in custom date range`);
    return filteredSales;
  } catch (error) {
    console.error('Error getting sales by custom range:', error);
    return [];
  }
};
