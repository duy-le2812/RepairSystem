import { Branch } from '../../types';
import { BASE_URL, fetchWithAuth } from './client';

/**
 * Fetch all service branches from Backend API
 */
export async function getBranches(): Promise<Branch[]> {
  try {
    const response = await fetchWithAuth(`${BASE_URL}/api/branches`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    throw error;
  }
}
