import 'package:url_launcher/url_launcher.dart';
import '../models/order_item.dart';
import 'storage_service.dart';

class WhatsappService {
  static const String ownerWhatsapp = '+525528124944';

  static Future<bool> sendOrderToWhatsApp({
    required int tableNumber,
    required List<OrderItem> items,
    required double total,
    double? tipAmount,
    double? totalWithTip,
    String? phoneNumber,
  }) async {
    try {
      // Format the items for the message
      final formattedItems = items
          .map((item) => 
            '• ${item.name} x${item.quantity} - \$${(item.price * item.quantity).toStringAsFixed(2)}')
          .join('\n');

      // Create the message
      String message = '*Nueva Orden - Mesa $tableNumber*\n\n'
          '*Artículos:*\n$formattedItems\n\n'
          '*Subtotal:* \$${total.toStringAsFixed(2)}';
      
      if (tipAmount != null && totalWithTip != null) {
        message += '\n*Propina:* \$${tipAmount.toStringAsFixed(2)}'
            '\n*Total con propina:* \$${totalWithTip.toStringAsFixed(2)}';
      } else {
        message += '\n*Total:* \$${total.toStringAsFixed(2)}';
      }
      
      message += '\n\n*Fecha:* ${DateTime.now().toLocal()}';

      // Encode the message for the URL
      final encodedMessage = Uri.encodeComponent(message);

      // Create the WhatsApp URL
      final targetPhone = phoneNumber ?? ownerWhatsapp;
      // Remove all non-numeric characters except the + at the beginning
      String cleanPhone = targetPhone.replaceAll(RegExp(r'[^\d+]'), '');
      // Remove the + sign for the URL (WhatsApp expects just the number)
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      // Try WhatsApp Web URL format which works better on many devices
      final whatsappWebUrl = Uri.parse(
        'https://wa.me/$cleanPhone?text=$encodedMessage'
      );
      
      try {
        await launchUrl(
          whatsappWebUrl,
          mode: LaunchMode.externalApplication,
        );
        return true;
      } catch (e) {
        // Try mobile WhatsApp as fallback
        final whatsappUrl = Uri.parse(
          'whatsapp://send?phone=$cleanPhone&text=$encodedMessage'
        );
        
        try {
          await launchUrl(
            whatsappUrl,
            mode: LaunchMode.externalApplication,
          );
          return true;
        } catch (e2) {
          print('Error launching WhatsApp: $e2');
          return false;
        }
      }
    } catch (error) {
      print('Error sending order to WhatsApp: $error');
      return false;
    }
  }

  static Future<bool> sendSalesReportToWhatsApp({
    required List<Sale> sales,
    String title = 'Reporte de Ventas',
  }) async {
    try {
      if (sales.isEmpty) {
        return false;
      }

      // Calculate totals
      final totalAmount = sales.fold<double>(
        0, (sum, sale) => sum + sale.total
      );
      final totalItems = sales.fold<int>(
        0, (sum, sale) => sum + sale.items.fold<int>(
          0, (itemSum, item) => itemSum + item.quantity
        )      );

      // Group items by name to see which products sold the most
      final Map<String, Map<String, dynamic>> itemsSummary = {};
      
      for (final sale in sales) {
        for (final item in sale.items) {
          if (!itemsSummary.containsKey(item.name)) {
            itemsSummary[item.name] = {'quantity': 0, 'total': 0.0};
          }
          itemsSummary[item.name]!['quantity'] += item.quantity;
          itemsSummary[item.name]!['total'] += item.price * item.quantity;
        }
      }

      // Convert to list and sort by quantity
      final popularItems = itemsSummary.entries
          .map((entry) => {
            'name': entry.key,
            'quantity': entry.value['quantity'],
            'total': entry.value['total'],
          })
          .toList()
        ..sort((a, b) => b['quantity'].compareTo(a['quantity']));

      // Take top 5 items
      final top5Items = popularItems.take(5).toList();

      // Format the popular items
      final formattedPopularItems = top5Items
          .map((item) =>             '• ${item['name']}: ${item['quantity']} unidades - \$${item['total'].toStringAsFixed(2)}')
          .join('\n');

      // Create the message
      final startDate = sales.first.date.toLocal().toString().split(' ')[0];
      final endDate = sales.last.date.toLocal().toString().split(' ')[0];
      
      final message = '*$title*\n\n'
          '*Periodo:* $startDate - $endDate\n\n'
          '*Resumen:*\n'
          '• Total de ventas: ${sales.length}\n'
          '• Total de artículos: $totalItems\n'
          '• Monto total: \$${totalAmount.toStringAsFixed(2)}\n\n'
          '*Artículos más vendidos:*\n$formattedPopularItems';

      // Encode the message for the URL
      final encodedMessage = Uri.encodeComponent(message);

      // Create the WhatsApp URL
      String cleanPhone = ownerWhatsapp.replaceAll(RegExp(r'[^\d+]'), '');
      // Remove the + sign for the URL (WhatsApp expects just the number)
      if (cleanPhone.startsWith('+')) {
        cleanPhone = cleanPhone.substring(1);
      }
      
      // Try WhatsApp Web URL format which works better on many devices
      final whatsappWebUrl = Uri.parse(
        'https://wa.me/$cleanPhone?text=$encodedMessage'
      );
      
      try {
        await launchUrl(
          whatsappWebUrl,
          mode: LaunchMode.externalApplication,
        );
        return true;
      } catch (e) {
        // Try mobile WhatsApp as fallback
        final whatsappUrl = Uri.parse(
          'whatsapp://send?phone=$cleanPhone&text=$encodedMessage'
        );
        
        try {
          await launchUrl(
            whatsappUrl,
            mode: LaunchMode.externalApplication,
          );
          return true;
        } catch (e2) {
          print('Error launching WhatsApp: $e2');
          return false;
        }
      }
    } catch (error) {
      print('Error sending sales report to WhatsApp: $error');
      return false;
    }
  }
}
