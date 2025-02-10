export default function CalculadoraScreen() {
  // ... other state ...
  const [showBill, setShowBill] = useState(false);

  // ... other code ...

  return (
    <View style={styles.container}>
      {/* ... other components ... */}
      
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onCheckout={() => setShowBill(true)} // Make sure this is connected
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