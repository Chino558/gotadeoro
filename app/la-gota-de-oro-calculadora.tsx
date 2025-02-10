// (Only showing the relevant changes)

export default function CalculadoraScreen() {
  // ... existing state ...
  const [showCheckout, setShowCheckout] = useState(false);

  // ... existing code ...

  return (
    <View style={[styles.container]}>
      {/* ... other components ... */}
      
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onPress={() => setShowBreakdown(true)}
        onCheckout={() => setShowCheckout(true)}
      />
      
      {showCheckout && (
        <CheckoutScreen
          items={orderItemsList}
          tableNumber={currentTable}
          onClose={() => setShowCheckout(false)}
        />
      )}
      
      {/* ... other components ... */}
    </View>
  );
}