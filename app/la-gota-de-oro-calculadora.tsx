// (Only showing the relevant changes)

export default function CalculadoraScreen() {
  // ... existing state ...
  const [showCheckout, setShowCheckout] = useState(false);

  // ... existing code ...

  return (
    <View style={[
      styles.container,
      { backgroundColor: colorScheme === 'dark' ? COLORS.backgroundDark : COLORS.background }
    ]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <Text style={styles.title}>La Gota de Oro</Text>
      </View>
      <TableTabs
        currentTable={currentTable}
        onTableChange={setCurrentTable}
        style={{ marginBottom: 30 }} // Added margin to move tabs up
      />
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <MenuItem
            item={item}
            quantity={currentOrderItems[item.id]?.quantity || 0}
            onIncrement={() => handleIncrement(item.id)}
            onDecrement={() => handleDecrement(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
      />
      <OrderSummary
        total={total}
        itemCount={itemCount}
        onPress={() => setShowBreakdown(true)}
        onCheckout={() => setShowCheckout(true)}
      />
      <OrderBreakdown
        visible={showBreakdown}
        items={orderItemsList}
        onClose={() => setShowBreakdown(false)}
      />
      {showCheckout && (
        <CheckoutScreen
          items={orderItemsList}
          tableNumber={currentTable}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </View>
  );
}

// ... rest of the styles ...