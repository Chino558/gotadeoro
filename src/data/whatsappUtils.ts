import { Linking } from 'react-native';
import { OrderItem } from 'types';
import { SaleRecord } from './salesStorage';

// WhatsApp number for the owner
const OWNER_WHATSAPP = '+525528124944';

// Send current order to WhatsApp
export const sendOrderToWhatsApp = async (
  tableNumber: number,
  items: OrderItem[],
  total: number
): Promise<boolean> => {
  try {
    // Format the items for the message
    const formattedItems = items
      .map(
        item => `• ${item.name} x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
      )
      .join('\n');

    // Create the message
    const message = `*Nueva Orden - Mesa ${tableNumber}*\n\n` +
      `*Artículos:*\n${formattedItems}\n\n` +
      `*Total:* $${total.toFixed(2)}\n\n` +
      `*Fecha:* ${new Date().toLocaleString()}`;

    // Encode the message for the URL
    const encodedMessage = encodeURIComponent(message);

    // Create the WhatsApp URL
    const whatsappUrl = `whatsapp://send?phone=${OWNER_WHATSAPP}&text=${encodedMessage}`;

    // Check if WhatsApp is installed
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (!canOpen) {
      console.log('WhatsApp is not installed');
      return false;
    }

    // Open WhatsApp with the message
    await Linking.openURL(whatsappUrl);
    return true;
  } catch (error) {
    console.error('Error sending order to WhatsApp:', error);
    return false;
  }
};

// Send sales report to WhatsApp
export const sendSalesReportToWhatsApp = async (
  sales: SaleRecord[],
  title: string = 'Reporte de Ventas'
): Promise<boolean> => {
  try {
    if (sales.length === 0) {
      return false;
    }

    // Calculate totals
    const totalAmount = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalItems = sales.reduce(
      (sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );

    // Group items by name to see which products sold the most
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

    // Convert to array and sort by quantity
    const popularItems = Object.entries(itemsSummary)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5); // Top 5 items

    // Format the popular items
    const formattedPopularItems = popularItems
      .map(
        item => `• ${item.name}: ${item.quantity} unidades - $${item.total.toFixed(2)}`
      )
      .join('\n');

    // Create the message
    const message = `*${title}*\n\n` +
      `*Periodo:* ${new Date(sales[0].timestamp).toLocaleDateString()} - ${new Date(sales[sales.length - 1].timestamp).toLocaleDateString()}\n\n` +
      `*Resumen:*\n` +
      `• Total de ventas: ${sales.length}\n` +
      `• Total de artículos: ${totalItems}\n` +
      `• Monto total: $${totalAmount.toFixed(2)}\n\n` +
      `*Artículos más vendidos:*\n${formattedPopularItems}`;

    // Encode the message for the URL
    const encodedMessage = encodeURIComponent(message);

    // Create the WhatsApp URL
    const whatsappUrl = `whatsapp://send?phone=${OWNER_WHATSAPP}&text=${encodedMessage}`;

    // Check if WhatsApp is installed
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    
    if (!canOpen) {
      console.log('WhatsApp is not installed');
      return false;
    }

    // Open WhatsApp with the message
    await Linking.openURL(whatsappUrl);
    return true;
  } catch (error) {
    console.error('Error sending sales report to WhatsApp:', error);
    return false;
  }
};
