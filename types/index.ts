export interface MenuItem {
  id: string;
  name: string;
  price: number;
  icon?: string;
}

export interface OrderItem extends MenuItem {
  quantity: number;
}

export interface Order {
  items: OrderItem[];
  total: number;
}