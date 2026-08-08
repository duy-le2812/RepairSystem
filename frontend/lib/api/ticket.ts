import { OrderItem } from '../../types';
import { BASE_URL, fetchWithAuth } from './client';
import { handleUnauthorized } from './auth';

/**
 * Query status tracking of a repair order by Order ID or Customer Phone Number
 * 
 * Calls Backend API GET /api/tickets/search
 */
export async function getOrdersByContact(queryStr: string): Promise<OrderItem[]> {
  const q = queryStr.trim();
  if (!q) return [];

  try {
    // Determine if query is a phone number or ticket code
    const _isPhoneNumber = /^[\d\s\-+().]*$/.test(q);
    const isTicketCode = /^FIX-\d+$|^\d+$/.test(q.toUpperCase());
    
    let url = `${BASE_URL}/api/tickets/search?`;
    
    if (isTicketCode) {
      // Search by ticket code
      const codeParam = q.toUpperCase().startsWith('FIX-') ? q.toUpperCase() : `FIX-${q}`;
      url += `code=${encodeURIComponent(codeParam)}`;
    } else {
      // Search by phone number
      url += `phone=${encodeURIComponent(q)}`;
    }
    
    const response = await fetchWithAuth(url, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const backendResults = await response.json();
    
    // Backend returns array of TrackingResponse which matches OrderItem format
    return backendResults as OrderItem[];
  } catch (error) {
    console.error('Error searching tickets:', error);
    throw error;
  }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: string): Promise<OrderItem | null> {
  try {
    const response = await fetchWithAuth(`${BASE_URL}/api/tickets/search?code=${encodeURIComponent(orderId)}`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const results = await response.json();
    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw error;
  }
}

/**
 * Submit customer response to quotation (approved or rejected)
 */
export async function respondQuotation(
  ticketId: number,
  data: { decision: 'approved' | 'rejected'; rejection_reason?: string; customer_name?: string }
): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/tickets/${ticketId}/quotation/respond`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Phản hồi báo giá thất bại');
  }

  return response.json();
}

