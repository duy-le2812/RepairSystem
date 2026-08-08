import { OrderItem } from '../../types';
import { BASE_URL, fetchWithAuth } from './client';
import { handleUnauthorized } from './auth';

/**
 * Backend Booking Response structure
 */
interface BackendBookingResponse {
  booking_id: string;
  user_id: number;
  device_id: number;
  ticket_id: number;
  customer_name: string;
  phone_number: string;
  device_type: string;
  brand: string;
  device_model: string;
  status: string;
  created_at: string;
}

/**
 * Map Backend booking response to Frontend OrderItem
 */
function mapBackendBookingToOrderItem(booking: BackendBookingResponse): OrderItem {
  return {
    id: booking.booking_id,
    customerName: booking.customer_name,
    phoneNumber: booking.phone_number,
    deviceType: booking.device_type as 'phone' | 'tablet' | 'laptop' | 'watch' | 'other',
    brand: booking.brand,
    deviceModel: booking.device_model,
    symptoms: '', // Backend không trả về triệu chứng gốc
    branchId: '', // Backend không trả về branch ID
    status: 'received', // Map status từ backend sang frontend
    totalPrice: 0, // Backend sẽ tính sau
    dateCreated: booking.created_at,
    technicianNotes: 'Đang xếp lịch kiểm tra sơ bộ thiết bị. Nhân viên chi nhánh sẽ sớm liên hệ xác nhận cuộc hẹn.',
    timeline: [
      {
        status: 'received',
        statusLabel: 'Tiếp nhận thiết bị',
        timestamp: booking.created_at,
        description: 'Hệ thống đã ghi nhận lịch hẹn sửa chữa trực tuyến của quý khách.',
        isCompleted: true
      },
      {
        status: 'inspecting',
        statusLabel: 'Đang kiểm tra',
        description: 'Kỹ thuật viên sẽ thực hiện tháo lắp và kiểm tra linh kiện trực tiếp trước sự chứng kiến của quý khách.',
        isCompleted: false
      },
      {
        status: 'waiting_parts',
        statusLabel: 'Chờ linh kiện',
        description: 'Kiểm kho linh kiện tương thích.',
        isCompleted: false
      },
      {
        status: 'repairing',
        statusLabel: 'Đang tiến hành sửa',
        description: 'Tiến hành sửa chữa phần cứng/thay thế sau khi đạt thỏa thuận giá.',
        isCompleted: false
      },
      {
        status: 'completed',
        statusLabel: 'Hoàn thành & Bàn giao',
        description: 'Kiểm tra chức năng hậu sửa chữa, lập tem bảo hành điện tử và bàn giao máy.',
        isCompleted: false
      }
    ]
  };
}

/**
 * Submit a new repair booking registration to Backend
 */
export async function createBooking(data: {
  customerName: string;
  phoneNumber: string;
  deviceType: 'phone' | 'tablet' | 'laptop' | 'watch' | 'other';
  brand: string;
  deviceModel: string;
  symptoms: string;
  branchId: string;
}): Promise<OrderItem> {
  try {
    // Call Backend API
    const response = await fetchWithAuth(`${BASE_URL}/api/booking/`, {
      method: 'POST',
      body: JSON.stringify({
        customer_name: data.customerName,
        phone_number: data.phoneNumber,
        device_type: data.deviceType,
        brand: data.brand,
        device_model: data.deviceModel,
        symptoms: data.symptoms,
        branch_id: data.branchId,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const backendBooking: BackendBookingResponse = await response.json();
    return mapBackendBookingToOrderItem(backendBooking);
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

/**
 * Update booking - Not implemented, requires Backend endpoint
 */
export async function updateBooking(_orderId: string, _data: Partial<OrderItem>): Promise<OrderItem | null> {
  throw new Error('Update booking requires Backend implementation');
}

/**
 * Cancel booking - Not implemented, requires Backend endpoint
 */
export async function cancelBooking(_orderId: string): Promise<boolean> {
  throw new Error('Cancel booking requires Backend implementation');
}
