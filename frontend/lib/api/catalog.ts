import { Category, Brand, DeviceModel, ServiceCatalogItem } from '../../types';
import { BASE_URL, fetchWithAuth } from './client';

/**
 * Fetch all active Categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/categories`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      isActive: item.is_active,
    }));
  } catch (err) {
    console.error('Error fetching categories:', err);
    return [];
  }
}

/**
 * Fetch active Brands by Category ID
 */
export async function getBrandsByCategory(categoryId: number): Promise<Brand[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/categories/${categoryId}/brands`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      categoryId: item.category_id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      isActive: item.is_active,
    }));
  } catch (err) {
    console.error(`Error fetching brands for category ${categoryId}:`, err);
    return [];
  }
}

/**
 * Fetch active DeviceModels by Brand ID
 */
export async function getModelsByBrand(brandId: number): Promise<DeviceModel[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/brands/${brandId}/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      brandId: item.brand_id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      isActive: item.is_active,
    }));
  } catch (err) {
    console.error(`Error fetching models for brand ${brandId}:`, err);
    return [];
  }
}

/**
 * Fetch active Services by DeviceModel ID
 */
export async function getServicesByModel(modelId: number): Promise<ServiceCatalogItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/api/models/${modelId}/services`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.map((item: any) => ({
      id: item.id,
      serviceName: item.service_name,
      description: item.description,
      basePrice: Number(item.base_price),
      modelId: item.model_id,
      estimatedDurationMinutes: item.estimated_duration_minutes || 60,
      warrantyMonths: item.warranty_months || 6,
      isActive: item.is_active,
      model: item.model,
      brand: item.brand,
      category: item.category,
    }));
  } catch (err) {
    console.error(`Error fetching services for model ${modelId}:`, err);
    return [];
  }
}

/**
 * Fetch full Service detail by Service ID
 */
export async function getServiceDetail(serviceId: number): Promise<ServiceCatalogItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/api/services/${serviceId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const item = await res.json();
    return {
      id: item.id,
      serviceName: item.service_name,
      description: item.description,
      basePrice: Number(item.base_price),
      modelId: item.model_id,
      estimatedDurationMinutes: item.estimated_duration_minutes || 60,
      warrantyMonths: item.warranty_months || 6,
      isActive: item.is_active,
      model: item.model,
      brand: item.brand,
      category: item.category,
    };
  } catch (err) {
    console.error(`Error fetching service detail for ${serviceId}:`, err);
    return null;
  }
}
