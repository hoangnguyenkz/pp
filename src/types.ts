export interface RolePerms {
  seeCost: boolean;
  seeSell: boolean;
  seeProfit: boolean;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canImport: boolean;
  canAccessSupplier: boolean; // New permission: View and manage Supplier list
}

export interface User {
  username: string;
  name: string;
  role: 'admin' | 'sales' | 'accountant' | 'viewer' | 'custom';
  display: string;
  password?: string;
  customPerms?: RolePerms | null;
}

export interface Supplier {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  taxCode: string;
  contactPerson: string;
  note: string;
}

export interface Quote {
  id: number;
  device: string;
  model: string;
  brand: string;
  origin: string;
  spec: string;
  supplier: string; // References Supplier.name
  cat: string;
  project: string;
  price: number; // Unit Buy Price
  sellPrice: number; // Unit Sell Price
  qty: number;
  vat: number; // VAT percentage, e.g., 10
  date: string;
  expiry: string;
  status: 'Mới' | 'Chờ duyệt' | 'Đã duyệt' | 'Hết hạn';
  note: string;
}
