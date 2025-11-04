import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import type {
  AuthResponse,
  SignInRequest,
  RefreshTokenRequest,
  User,
  Internship,
  Application,
  CreateInternshipRequest,
  UpdateInternshipRequest,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';

// Log API base URL in development for debugging
if (typeof window !== 'undefined') {
  console.log('API Base URL:', API_BASE_URL);
  console.log('Environment:', process.env.NODE_ENV);
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Load tokens from storage on initialization
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
      
      // Test backend connection on initialization
      this.testConnection();
    }

    // Request interceptor to add access token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Don't try to refresh if:
        // 1. This is already a retry
        // 2. The request is to the refresh endpoint itself
        // 3. There's no refresh token
        const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
        const isAuthError = error.response?.status === 401;
        
        if (isAuthError && !originalRequest._retry && !isRefreshEndpoint && this.refreshToken) {
          originalRequest._retry = true;

          try {
            const newTokens = await this.refreshAccessToken(this.refreshToken);
            this.setAccessToken(newTokens.access_token);
            if (newTokens.refresh_token) {
              this.setRefreshToken(newTokens.refresh_token);
            }
            originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
            return this.client(originalRequest);
          } catch (refreshError: any) {
            // Only clear tokens and redirect if it's an auth error (401/403)
            // For network errors, let the original error propagate so UI can handle it
            if (refreshError?.response?.status === 401 || refreshError?.response?.status === 403) {
              this.clearTokens();
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
            }
            // For network errors during refresh, reject the original error instead
            // This allows the UI to show the network error message
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('access_token', token);
      } else {
        localStorage.removeItem('access_token');
      }
    }
  }

  setRefreshToken(token: string | null) {
    this.refreshToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('refresh_token', token);
      } else {
        localStorage.removeItem('refresh_token');
      }
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // Test backend connection
  async testConnection(): Promise<void> {
    try {
      const healthUrl = API_BASE_URL.replace('/api/v2', '/healthz');
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });
      if (response.ok) {
        console.log('✅ Backend connection test: OK');
      } else {
        console.warn('⚠️ Backend connection test: Status', response.status);
      }
    } catch (error: any) {
      console.error('❌ Backend connection test failed:', error.message);
      console.error('   Make sure backend is running at', API_BASE_URL.replace('/api/v2', ''));
    }
  }

  // Auth endpoints
  async signIn(credentials: SignInRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/sign-in', credentials);
    this.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      this.setRefreshToken(response.data.refresh_token);
    }
    return response.data;
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthResponse> {
    // Create a separate axios instance for refresh to avoid interceptors
    // This prevents infinite loops if refresh itself fails
    const refreshClient = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
    
    const response = await refreshClient.post<AuthResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    } as RefreshTokenRequest);
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get<User>('/auth/me');
    return response.data;
  }

  async signOut(refreshToken?: string): Promise<void> {
    try {
      if (refreshToken) {
        await this.client.post('/auth/sign-out', { refresh_token: refreshToken });
      }
    } catch (error) {
      // Ignore errors on sign out
    } finally {
      this.clearTokens();
    }
  }

  // Internship endpoints
  async getInternships(params?: {
    page?: number;
    limit?: number;
    sort?: string;
    include?: string[];
  }): Promise<Internship[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.include) {
      // FastAPI expects multiple query params with same name, not array notation
      params.include.forEach((inc) => queryParams.append('include', inc));
    }

    const response = await this.client.get<Internship[]>(
      `/internships${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  async getInternship(id: number, include?: string[]): Promise<Internship> {
    const queryParams = new URLSearchParams();
    if (include) {
      // FastAPI expects multiple query params with same name, not array notation
      include.forEach((inc) => queryParams.append('include', inc));
    }

    const response = await this.client.get<Internship>(
      `/internships/${id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  async createInternship(data: CreateInternshipRequest): Promise<Internship> {
    const response = await this.client.post<Internship>('/internships', data);
    return response.data;
  }

  async updateInternship(id: number, data: UpdateInternshipRequest): Promise<Internship> {
    const response = await this.client.patch<Internship>(`/internships/${id}`, data);
    return response.data;
  }

  async deleteInternship(id: number): Promise<void> {
    await this.client.delete(`/internships/${id}`);
  }

  async getMyInternships(params?: {
    page?: number;
    limit?: number;
    include?: string[];
  }): Promise<Internship[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.include) {
      // FastAPI expects multiple query params with same name, not array notation
      params.include.forEach((inc) => queryParams.append('include', inc));
    }

    const response = await this.client.get<Internship[]>(
      `/internships/me${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  // Application endpoints
  async applyToInternship(
    internshipId: number,
    data: CreateApplicationRequest
  ): Promise<Application> {
    const response = await this.client.post<Application>(
      `/internships/${internshipId}/applications`,
      data
    );
    return response.data;
  }

  async getMyApplications(params?: {
    page?: number;
    limit?: number;
    sort?: string;
    include?: string[];
  }): Promise<Application[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.include) {
      // FastAPI expects multiple query params with same name, not array notation
      params.include.forEach((inc) => queryParams.append('include', inc));
    }

    const response = await this.client.get<Application[]>(
      `/applications/me${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  async getInternshipApplications(
    internshipId: number,
    params?: {
      page?: number;
      limit?: number;
      include?: string[];
    }
  ): Promise<Application[]> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.include) {
      // FastAPI expects multiple query params with same name, not array notation
      params.include.forEach((inc) => queryParams.append('include', inc));
    }

    const response = await this.client.get<Application[]>(
      `/internships/${internshipId}/applications${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    );
    return response.data;
  }

  async updateApplication(id: number, data: UpdateApplicationRequest): Promise<Application> {
    const response = await this.client.patch<Application>(`/applications/${id}`, data);
    return response.data;
  }
}

export const apiClient = new ApiClient();

/**
 * Formats error messages from FastAPI error responses.
 * Handles both string errors and validation error arrays.
 */
export function formatApiError(error: any): string {
  // Handle network errors (no response from server)
  if (!error?.response) {
    // Log detailed error info always for debugging
    if (typeof window !== 'undefined') {
      console.error('Network Error Details:', {
        code: error?.code,
        message: error?.message,
        name: error?.name,
        stack: error?.stack?.substring(0, 200),
        config: {
          url: error?.config?.url,
          baseURL: error?.config?.baseURL,
          method: error?.config?.method,
          headers: error?.config?.headers,
        },
      });
    }
    
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'Request timeout. Please check your connection and try again.';
    }
    
    // Check for CORS errors
    if (error?.message?.includes('CORS') || error?.message?.includes('cross-origin')) {
      return `CORS error. Please check backend CORS configuration allows ${window.location.origin}`;
    }
    
    if (error?.code === 'ERR_NETWORK' || error?.message?.includes('Network Error') || error?.message?.includes('Failed to fetch')) {
      const apiUrl = API_BASE_URL;
      return `Network error. Please check your connection and ensure the backend server is running at ${apiUrl}. Check browser console for details.`;
    }
    if (error?.code === 'ECONNREFUSED') {
      return `Connection refused. Is the backend server running at ${API_BASE_URL}?`;
    }
    return error?.message || `Network error. Please check your connection to ${API_BASE_URL}. Check browser console for details.`;
  }

  // Handle API response errors
  if (!error.response.data) {
    return error?.message || 'An unexpected error occurred';
  }

  const detail = error.response.data.detail;

  // If detail is a string, return it directly
  if (typeof detail === 'string') {
    return detail;
  }

  // If detail is an array of validation errors, format them
  if (Array.isArray(detail)) {
    return detail
      .map((err: any) => {
        const field = err.loc?.slice(1).join('.') || 'field';
        const message = err.msg || 'Invalid value';
        return `${field}: ${message}`;
      })
      .join(', ');
  }

  // Fallback for other error structures
  return 'An error occurred. Please try again.';
}


