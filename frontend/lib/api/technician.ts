import { BASE_URL } from './client';
import { getAuthHeaders } from './auth';

export async function getTechnicianWorkboard(status?: string): Promise<any[]> {
  const url = status && status !== 'ALL' 
    ? `${BASE_URL}/api/technician/workboard?status=${status}`
    : `${BASE_URL}/api/technician/workboard`;

  const res = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể tải danh sách phiếu của kỹ thuật viên');
  }
  return res.json();
}

export async function getTechnicianTicketDetail(ticketId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/technician/tickets/${ticketId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể lấy chi tiết phiếu');
  }
  return res.json();
}

export async function startRepair(ticketId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/technician/tickets/${ticketId}/start`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể bắt đầu sửa chữa');
  }
  return res.json();
}

export async function updateRepairExecution(ticketId: number, data: {
  repair_result?: string;
  parts_used?: Array<{ part_name: string; unit_price: number; quantity: number }>;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/technician/tickets/${ticketId}/execution`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Cập nhật quá trình sửa thất bại');
  }
  return res.json();
}

export async function completeRepair(ticketId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/technician/tickets/${ticketId}/complete`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Hoàn thành sửa chữa thất bại');
  }
  return res.json();
}

export async function submitQCCheck(ticketId: number, data: {
  result: 'passed' | 'failed';
  note?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/technician/tickets/${ticketId}/qc`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Gửi kết quả QC thất bại');
  }
  return res.json();
}
