// Add this import at the top:
import { BillBreakdown } from '../components/BillBreakdown';

// In your main component, update the return statement to include:
export default function CalculadoraScreen() {
  // ... existing state and functions ...
  const [showBill, setShowBill] = useState(false);

  return (
    <View style={styles.container}>
      {/* ... other components ... */}
      
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => setShowBill(true)}
      />
      
      <BillBreakdown
        visible={showBill}
        items={orderItemsList}
        tableNumber={currentTable}
        onClose={() => setShowBill(false)}
      />
    </View>
  );
}