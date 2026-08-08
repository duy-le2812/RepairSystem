import { BASE_URL } from './client';

const TOKEN_KEY = 'access_token';
const USER_KEY = 'user_info';

/**
 * Auth Response from Backend
 */
interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  username: string;
  role: string;
  full_name?: string;
}

export interface UserInfo {
  user_id: number;
  username: string;
  role: string;
  full_name?: string;
  email?: string;
  phone?: string;
  created_at?: string;
}


/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<UserInfo> {
  try {
    const response = await fetch(`${BASE_URL}/api/login/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Đăng nhập thất bại');
    }

    const data: AuthResponse = await response.json();

    // Save token and user info to localStorage
    localStorage.setItem(TOKEN_KEY, data.access_token);
    const userInfo: UserInfo = {
      user_id: data.user_id,
      username: data.username,
      role: data.role,
      full_name: data.full_name,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

    return userInfo;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Register a new customer account
 */
export async function register(data: any): Promise<any> {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Đăng ký thất bại');
    }

    return await response.json();
  } catch (error) {
    console.error('Register error:', error);
    throw error;
  }
}

/**
 * Logout - Clear token and user info
 */
export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Handle 401 Unauthorized error (token expired or invalid)
 * Clears token and user info, then optionally redirects
 */
export function handleUnauthorized(): void {
  logout();
  console.warn('Session expired. Please login again.');
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/**
 * Get stored access token
 */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Fetch current user from backend using token
 */
export async function fetchCurrentUser(): Promise<UserInfo | null> {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const response = await fetch(`${BASE_URL}/api/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleUnauthorized();
      }
      return null;
    }

    const data = await response.json();
    const userInfo: UserInfo = {
      user_id: data.id,
      username: data.username,
      role: data.role,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      created_at: data.created_at,
    };
    
    // Update local storage just in case it's used elsewhere
    localStorage.setItem(USER_KEY, JSON.stringify(userInfo));
    
    return userInfo;
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}


/**
 * Get current user info
 */
export function getCurrentUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  
  const userJson = localStorage.getItem(USER_KEY);
  if (!userJson) return null;

  try {
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error parsing user info:', error);
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getAccessToken();
}

/**
 * Check if user has specific role
 */
export function hasRole(role: string): boolean {
  const user = getCurrentUser();
  return user?.role === role;
}

/**
 * Decode JWT token (basic decode without verification)
 * WARNING: This is only for reading data, NOT for verification
 * Verification should be done on server side
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function decodeToken(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;

  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();

    // Consider token expired if it will expire in less than 1 minute
    return expirationTime - currentTime < 60000;
  } catch {
    return false;
  }
}

/**
 * Setup axios interceptor or fetch wrapper to auto-add Authorization header
 * This is called in client.ts
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Update user profile (full_name, email, phone)
 */
export async function updateUserProfile(data: { full_name?: string; email?: string; phone?: string }): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Cập nhật hồ sơ thất bại');
  }

  const updatedUser = await response.json();
  const userInfo: UserInfo = {
    user_id: updatedUser.id,
    username: updatedUser.username,
    role: updatedUser.role,
    full_name: updatedUser.full_name,
    email: updatedUser.email,
    phone: updatedUser.phone,
    created_at: updatedUser.created_at,
  };
  localStorage.setItem(USER_KEY, JSON.stringify(userInfo));

  return updatedUser;
}


/**
 * Change user password
 */
export async function changePassword(data: { current_password: string; new_password: string; confirm_password: string }): Promise<any> {
  const response = await fetch(`${BASE_URL}/api/auth/change-password`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Đổi mật khẩu thất bại');
  }

  return response.json();
}

/**
 * Fetch customer's own repair history tickets (supports search, filter & pagination)
 */
export async function getMyRepairHistory(params?: { q?: string; status?: string; page?: number; limit?: number }): Promise<any> {
  const query = new URLSearchParams();
  if (params?.q) query.append('q', params.q);
  if (params?.status) query.append('status', params.status);
  if (params?.page) query.append('page', params.page.toString());
  if (params?.limit) query.append('limit', params.limit.toString());

  const queryString = query.toString() ? `?${query.toString()}` : '';
  const response = await fetch(`${BASE_URL}/api/tickets/my-history${queryString}`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || 'Không thể lấy lịch sử sửa chữa');
  }

  return response.json();
}


