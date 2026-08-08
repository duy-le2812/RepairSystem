import { BASE_URL } from './client';
import { getAuthHeaders } from './auth';

export async function getReadyHandoverTickets(): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/api/handover/ready`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể lấy danh sách phiếu chờ bàn giao');
  }
  return res.json();
}

export async function processPayment(ticketId: number, data: {
  amount: number;
  payment_method: 'CASH' | 'BANK_TRANSFER';
  transaction_reference?: string;
}): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/tickets/${ticketId}/payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Thanh toán thất bại');
  }
  return res.json();
}

export async function confirmHandover(ticketId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/tickets/${ticketId}/handover`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Xác nhận trả máy thất bại');
  }
  return res.json();
}

export async function getTicketInvoice(ticketId: number): Promise<any> {
  const res = await fetch(`${BASE_URL}/api/tickets/${ticketId}/invoice`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Không thể tải thông tin hóa đơn');
  }
  return res.json();
}
