export type UserRole = 'admin' | 'manager' | 'sale' | 'warehouse' | 'data_entry' | 'data_analyst' | 'cashier' | 'customer';

export interface Profile {
  user_id: string;
  role: UserRole;
  branch_id: number | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  citizen_id: string | null;
  avatar_url?: string | null;
  created_at: string;
  allowed_inventory_tabs?: string[];
  member_tags?: string[];
}