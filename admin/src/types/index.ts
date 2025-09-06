export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'super_admin' | 'veg_admin' | 'nonveg_admin';
  avatar?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  quantity: number;
  size: 'small' | 'medium' | 'large' | 'customizable';
  spicyLevel: 'mild' | 'medium' | 'hot' | 'extra_hot';
  preparationTime: number;
  addOns: AddOn[];
  photos: string[];
  mrp: number;
  discountedPrice?: number;
  category: string;
  type: 'veg' | 'nonveg';
  isAvailable: boolean;
  reviews: Review[];
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  createdAt: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'delivered' | 'cancelled';
  totalAmount: number;
  deliveryAddress: Address;
  orderDate: string;
  deliveryDate?: string;
  paymentMethod: string;
  paymentStatus: 'pending' | 'paid' | 'failed';
  specialInstructions?: string;
}

export interface OrderItem {
  productId: string;
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedAddOns: AddOn[];
  specialInstructions?: string;
  price: number;
}

export interface Address {
  id: string;
  userId: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}

export interface Review {
  id: string;
  userId: string;
  user: User;
  productId?: string;
  orderId?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Analytics {
  averageCartValue: number;
  totalOrders: number;
  totalRevenue: number;
  topSellingProducts: Product[];
  ordersByStatus: Record<string, number>;
  salesByCategory: Record<string, number>;
  customerLifetimeValue: Record<string, number>;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}