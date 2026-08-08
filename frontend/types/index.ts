export interface Branch {
  id: number;
  name: string;
  address: string;
  hotline: string;
  mapUrl?: string;
  workingHours: string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface Brand {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface DeviceModel {
  id: number;
  brandId: number;
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}

export interface ServiceCatalogItem {
  id: number;
  serviceName: string;
  description?: string;
  basePrice: number;
  modelId?: number;
  estimatedDurationMinutes: number;
  warrantyMonths: number;
  isActive: boolean;
  model?: { id: number; name: string; slug: string };
  brand?: { id: number; name: string; slug: string };
  category?: { id: number; name: string; slug: string };
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'phone' | 'tablet' | 'laptop' | 'watch' | 'other';
  brand: string;
  deviceModel: string;
  price: number;
  warranty: string; // e.g., "6 tháng", "12 tháng"
  time: string;     // e.g., "30 - 45 phút", "1 - 2 ngày"
  popular?: boolean;
  description?: string;
}

export interface Diagnosis {
  symptoms?: string;
  inspection_result?: string;
  root_cause?: string;
  proposed_solution?: string;
  diagnosed_at?: string;
  diagnosed_by_id?: number;
}

export interface QuotationItem {
  id?: number;
  quotation_id?: number;
  part_name: string;
  unit_price: number;
  quantity: number;
  subtotal?: number;
}

export interface Quotation {
  id?: number;
  ticket_id?: number;
  labor_cost: number;
  additional_cost: number;
  total_amount: number;
  warranty?: string;
  notes?: string;
  customer_decision: 'pending' | 'approved' | 'rejected';
  confirmed_by?: string;
  confirmed_at?: string;
  rejection_reason?: string;
  created_at?: string;
  items: QuotationItem[];
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  status: string;
  action: string;
  actor_name?: string;
  actor_role?: string;
  details?: string;
  created_at: string;
}

export interface TimelineEvent {
  status: string;
  statusLabel: string;
  timestamp?: string;
  description: string;
  isCompleted: boolean;
}

export interface OrderItem {
  id: string;
  customerName: string;
  phoneNumber: string;
  deviceType: 'phone' | 'tablet' | 'laptop' | 'watch' | 'other' | string;
  brand: string;
  deviceModel: string;
  symptoms: string;
  branchId?: string;
  branchName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  status: string;
  timeline: TimelineEvent[];
  totalPrice: number;
  dateCreated: string;
  dateCompleted?: string;
  technicianNotes?: string;

  diagnosis?: Diagnosis;
  quotation?: Quotation;
  histories?: TicketHistory[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  isDisclaimer?: boolean;
}

export interface Service {
  id: number;
  service_name: string;
  description: string;
  base_price: number;
  created_at: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  full_name?: string;
  phone?: string;
  created_at: string;
}

