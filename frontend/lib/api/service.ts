import { ServiceItem } from '../../types';
import { BASE_URL, fetchWithAuth } from './client';
import { handleUnauthorized } from './auth';

/**
 * Backend Service Response structure
 */
interface BackendServiceResponse {
  id: number;
  service_name: string;
  description?: string;
  base_price: number;
}

/**
 * Map Backend service data to Frontend ServiceItem
 */
function mapBackendServiceToFrontend(service: BackendServiceResponse): ServiceItem {
  // Parse category and brand from service_name or description if possible
  // Format typically: "iPhone 14 Screen Replacement" or "Samsung Galaxy S23 Battery"
  const parseBrandAndModel = (name: string): { brand: string; deviceModel: string } => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      const brand = parts[0];
      const deviceModel = parts.slice(1).join(' ');
      return { brand, deviceModel };
    }
    return { brand: '', deviceModel: name };
  };

  const { brand, deviceModel } = parseBrandAndModel(service.service_name);

  return {
    id: String(service.id),
    name: service.service_name,
    category: 'phone', // Default to 'phone' as most services are phone-related
    brand,
    deviceModel,
    price: typeof service.base_price === 'string' 
      ? parseFloat(service.base_price) 
      : service.base_price,
    warranty: '6 tháng', // Default warranty value
    time: '1 - 2 ngày', // Default service time
    popular: false,
  };
}

/**
 * Fetch services from Backend API with optional filters
 */
export async function getServices(filters?: {
  category?: string;
  brand?: string;
  searchQuery?: string;
}): Promise<ServiceItem[]> {
  try {
    // Fetch from Backend API with auth header
    const response = await fetchWithAuth(`${BASE_URL}/api/services/`, {
      method: 'GET',
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      throw new Error(`Backend API error: ${response.status}`);
    }

    const backendServices: BackendServiceResponse[] = await response.json();
    let services: ServiceItem[] = backendServices.map(mapBackendServiceToFrontend);

    // Apply frontend filters
    if (filters) {
      const { category, brand, searchQuery } = filters;
      
      if (category && category !== 'all') {
        services = services.filter(s => s.category === category);
      }
      
      if (brand && brand !== 'all') {
        services = services.filter(s => s.brand.toLowerCase() === brand.toLowerCase());
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase().trim();
        services = services.filter(s => 
          s.name.toLowerCase().includes(query) ||
          s.deviceModel.toLowerCase().includes(query) ||
          s.brand.toLowerCase().includes(query)
        );
      }
    }

    return services;
  } catch (error) {
    console.error('Error fetching services:', error);
    throw error;
  }
}
