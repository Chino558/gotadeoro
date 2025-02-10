export function OrderSummary({ total, itemCount, onCheckout }: OrderSummaryProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={styles.itemCount}>{itemCount} artículos</Text>
          <Text style={styles.total}>${total.toFixed(2)}</Text>
        </View>
        <Pressable 
          style={[styles.checkoutButton, itemCount === 0 && styles.checkoutButtonDisabled]}
          onPress={() => {
            if (itemCount > 0) {
              onCheckout();
            }
          }}
        >
          <Text style={styles.checkoutText}>Ver Cuenta</Text>
        </Pressable>
      </View>
    </View>
  );
}