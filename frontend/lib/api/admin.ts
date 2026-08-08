import { BASE_URL } from './client';
import { getAuthHeaders } from './auth';
import { Branch, Service, User } from '../../types';

// ==========================================
// THỐNG KÊ (DASHBOARD)
// ==========================================
export interface AdminStats {
  total_customers: number;
  total_tickets: number;
  total_revenue: number;
  tickets_by_status: Record<string, number>;
}

export async function getAdminStats(): Promise<AdminStats> {
  const response = await fetch(`${BASE_URL}/api/stats/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Không thể lấy thống kê');
  return response.json();
}

export async function getAdminDashboardOverview(range: string = 'month'): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/admin/dashboard/overview?range=${range}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể tải dữ liệu Dashboard');
  }
  return response.json();
}

// ==========================================
// PHIẾU SỬA CHỮA (TICKETS)
// ==========================================
export async function getAdminTickets(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/api/admin/tickets`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Không thể lấy danh sách phiếu');
  return response.json();
}

export async function updateTicketStatus(ticketId: number, status: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/status?new_status=${status}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Cập nhật trạng thái thất bại');
  }
  return response.json();
}

export async function updateTicketNotes(ticketId: number, notes: string): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/notes`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ admin_notes: notes }),
  });
  if (!response.ok) throw new Error('Cập nhật ghi chú thất bại');
  return response.json();
}

export async function saveDiagnosis(ticketId: number, data: {
  symptoms?: string;
  inspection_result: string;
  root_cause: string;
  proposed_solution: string;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/diagnosis`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Lưu chẩn đoán thất bại');
  }
  return response.json();
}

export async function saveQuotation(ticketId: number, data: {
  labor_cost: number;
  additional_cost: number;
  warranty?: string;
  notes?: string;
  is_draft?: boolean;
  parts: Array<{ part_name: string; unit_price: number; quantity: number }>;
}): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/quotation`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Lập báo giá thất bại');
  }
  return response.json();
}

export async function getTicketHistory(ticketId: number): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/history`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Không thể lấy lịch sử phiếu');
  return response.json();
}


// ==========================================
// CHI NHÁNH (BRANCHES)
// ==========================================
export async function createBranch(data: Partial<Branch>): Promise<Branch> {
  const response = await fetch(`${BASE_URL}/api/branches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Thêm chi nhánh thất bại');
  return response.json();
}

export async function updateBranch(id: number, data: Partial<Branch>): Promise<Branch> {
  const response = await fetch(`${BASE_URL}/api/branches/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Cập nhật chi nhánh thất bại');
  return response.json();
}

export async function deleteBranch(id: number): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/branches/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Xóa chi nhánh thất bại');
}

// ==========================================
// DỊCH VỤ (SERVICES)
// ==========================================
export async function updateService(id: number, data: Partial<Service>): Promise<Service> {
  const response = await fetch(`${BASE_URL}/api/services/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Cập nhật dịch vụ thất bại');
  return response.json();
}

// ==========================================
// NGƯỜI DÙNG (USERS)
// ==========================================
export async function getUsers(): Promise<User[]> {
  const response = await fetch(`${BASE_URL}/api/users/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error('Lỗi lấy danh sách người dùng');
  return response.json();
}

export async function updateUserRole(userId: number, role: 'admin' | 'customer'): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/users/${userId}/role`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ role }),
  });
  if (!response.ok) throw new Error('Cập nhật quyền thất bại');
  return response.json();
}
