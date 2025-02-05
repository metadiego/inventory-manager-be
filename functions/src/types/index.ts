export type ItemType = 'raw' | 'preparation';

export type ItemCategory =
  'Raw Materials' |
  'Cleaning' |
  'Consumables' |
  'Drinks' |
  'Fruits and Vegetables' |
  'Eggs, Dairy and Derivatives' |
  'Cereals, Rice and Pasta' |
  'Dry Seasonings and Spices' |
  'Sauces' |
  'Oils, Fats and Vinegars' |
  'Preserved Foods' |
  'Frozen Foods' |
  'Pastry and Baked Goods' |
  'Fish and Seafood' |
  'Meats' |
  'Packaging' |
  'Other';

export type ItemUnit = 'kg' | 'g' | 'l' | 'ml' | 'units';

export interface Supplier {
  id: string;
  name: string;
  daysOfDelivery: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  }
  dispatchTime: number; // in days
  contactMethod: {
    type: 'email' | 'phone';
    emails: string[];
    phone: string;
  }

}

export type NewSupplier = Omit<Supplier, 'id'>;

export type UpdateFrequency = 'daily' | 'weekly' | 'monthly';

export interface InventoryItem {
  id: string;
  name: string;
  type: ItemType;
  category: ItemCategory;
  supplier: Supplier;
  minimumQuantity: number;
  currentQuantity: number;
  unit: ItemUnit;
  lastUpdated: string;
  updateFrequency: UpdateFrequency;
  averageConsumption: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

export interface ReceivedItem {
  id: string;
  name: string;
  quantity: number;
  unit: ItemUnit;
}

export interface TakeInventoryItem {
  id: string;
  name: string;
  quantity: number;
}

export interface TakeInventory {
  id: string;
  timestamp: string;
  items: TakeInventoryItem[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export interface OrderItem {
  id: string
  name: string
  currentQuantity: number
  orderQuantity: number
  receivedQuantity: number
  unit: string
}

export type OrderStatus =
  'pending' |
  'sent' |
  'confirmed' |
  'delivered' |
  'cancelled';

export interface Order {
  id: string
  supplierId: string
  supplierName: string
  items: OrderItem[]
  status: OrderStatus
  createdAt: string
  expectedDelivery: string
  cancelledAt?: string
}

export type NewOrder = Omit<Order, 'id' | 'status' | 'createdAt'>

export interface EmailDelivery {
  attempts: number;
  endTime: string;
  error: string | null;
  info: {
    accepted: string[];
    // Add other info fields if needed
  };
  leaseExpireTime: string | null;
  startTime: string;
  state: 'SUCCESS' | 'FAILURE' | 'PENDING';
}

export interface EmailData {
  id: string;
  to: string;
  cc: string[];
  delivery: EmailDelivery;
  message: {
    subject: string;
    html: string;
  };
}

export interface OrderEmail extends EmailData {
  orderId: string;
}

export interface OrderWhatsapp {
  id: string;
  message: string;
  orderId: string;
  to: string;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  updatedAt: string;
}

