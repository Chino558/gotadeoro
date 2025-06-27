class OrderItem {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final String? category;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.category,
  });

  OrderItem copyWith({
    String? id,
    String? name,
    double? price,
    int? quantity,
    String? category,
  }) {
    return OrderItem(
      id: id ?? this.id,
      name: name ?? this.name,
      price: price ?? this.price,
      quantity: quantity ?? this.quantity,
      category: category ?? this.category,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'quantity': quantity,
      'category': category,
    };
  }

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'],
      name: json['name'],
      price: json['price'].toDouble(),
      quantity: json['quantity'],
      category: json['category'],
    );
  }
}
