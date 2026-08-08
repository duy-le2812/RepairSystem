import { OrderItem, Branch, ServiceItem } from '../../types';
import { getBranches } from './branch';
import { getServices } from './service';
import { getOrdersByContact } from './ticket';
import { createBooking } from './booking';
import { getAuthHeaders } from './auth';

/**
 * BASE_URL configuration
 * Reads from NEXT_PUBLIC_API_URL environment variable
 */
export const BASE_URL = process.env.NEXT_PUBLIC_API_URL as string;

if (!BASE_URL) {
  console.warn("NEXT_PUBLIC_API_URL is not set in environment variables!");
}

/**
 * Fetch helper with automatic Authorization header
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = getAuthHeaders();
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

/**
 * ApiClient - Wrapper class for backward compatibility
 * All methods delegate to their respective modules
 */
export class ApiClient {
  /**
   * Fetch all service branches
   */
  static async getBranches(): Promise<Branch[]> {
    return getBranches();
  }

  /**
   * Fetch services with optional filters
   */
  static async getServices(filters?: {
    category?: string;
    brand?: string;
    searchQuery?: string;
  }): Promise<ServiceItem[]> {
    return getServices(filters);
  }

  /**
   * Query status tracking of a repair order by Order ID or Customer Phone Number
   */
  static async getOrdersByContact(queryStr: string): Promise<OrderItem[]> {
    return getOrdersByContact(queryStr);
  }

  /**
   * Submit a new repair booking registration
   */
  static async createBooking(data: {
    customerName: string;
    phoneNumber: string;
    deviceType: 'phone' | 'tablet' | 'laptop' | 'watch' | 'other';
    brand: string;
    deviceModel: string;
    symptoms: string;
    branchId: string;
    appointmentDate?: string;
    appointmentTime?: string;
  }): Promise<OrderItem> {
    return createBooking(data);
  }
}

export default ApiClient;
