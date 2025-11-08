import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';
import type {
  AuthResponse,
  SignInRequest,
  SignUpRequest,
  RefreshTokenRequest,
  User,
  Internship,
  Application,
  CreateInternshipRequest,
  UpdateInternshipRequest,
  CreateApplicationRequest,
  UpdateApplicationRequest,
} from '@/types';

// Get API base URL from environment
const getApiBaseUrl = (): string => {
  let apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
  
  // DETECT PRODUCTION: Check if we're in production environment
  const isProductionBrowser = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname.includes('internhub.sadn.site'));
  
  // CRITICAL: If URL contains internhubapi.sadn.site, FORCE HTTPS - NO EXCEPTIONS
  // This must happen FIRST before any other checks
  if (apiUrl.includes('internhubapi.sadn.site')) {
    // Replace HTTP with HTTPS - handle all variations
    apiUrl = apiUrl.replace(/^http:\/\//, 'https://');
    apiUrl = apiUrl.replace(/http:\/\//g, 'https://');
    // Ensure it's exactly the production URL
    if (!apiUrl.startsWith('https://internhubapi.sadn.site')) {
      apiUrl = 'https://internhubapi.sadn.site/api/v2';
    }
  }
  
  // If in production browser (HTTPS page), force HTTPS for any API URL
  if (isProductionBrowser && apiUrl.includes('internhubapi.sadn.site')) {
    apiUrl = apiUrl.replace(/^http:\/\//, 'https://');
    apiUrl = apiUrl.replace(/http:\/\//g, 'https://');
  }
  
  // Final safety check - if it contains production domain, it MUST be HTTPS
  if (apiUrl.includes('internhubapi.sadn.site') && apiUrl.startsWith('http://')) {
    apiUrl = apiUrl.replace(/^http:\/\//, 'https://');
    apiUrl = apiUrl.replace(/http:\/\//g, 'https://');
  }
  
  // ABSOLUTE FINAL CHECK - ensure it's HTTPS
  if (apiUrl.includes('internhubapi.sadn.site') && !apiUrl.startsWith('https://')) {
    apiUrl = 'https://internhubapi.sadn.site/api/v2';
  }
  
  return apiUrl;
};

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  public baseURL: string; // Make public so we can fix it at runtime if needed
  private isProduction: boolean;

  constructor() {
    // Determine if we're in production
    this.isProduction = typeof window !== 'undefined' && 
      (window.location.protocol === 'https:' || 
       window.location.hostname.includes('internhub.sadn.site'));
    
    // Get the correct base URL (with HTTPS enforcement)
    this.baseURL = getApiBaseUrl();
    
    // CRITICAL: Force HTTPS for production domain - MUST be done before axios instance
    if (this.baseURL.includes('internhubapi.sadn.site')) {
      this.baseURL = this.baseURL.replace(/^http:\/\//, 'https://');
      this.baseURL = this.baseURL.replace(/http:\/\//g, 'https://');
      // Ensure it's exactly HTTPS
      if (!this.baseURL.startsWith('https://')) {
        this.baseURL = 'https://internhubapi.sadn.site/api/v2';
      }
    }
    
    // AGGRESSIVE HTTPS enforcement for production - force HTTPS no matter what
    if (this.isProduction && this.baseURL.includes('internhubapi.sadn.site')) {
      this.baseURL = this.baseURL.replace(/^http:\/\//, 'https://');
      this.baseURL = this.baseURL.replace(/http:\/\//g, 'https://');
    }
    
    // Log API base URL for debugging (always log to help debug)
    if (typeof window !== 'undefined') {
      console.log('🔧 API Client Initialized:', {
        baseURL: this.baseURL,
        isHTTPS: this.baseURL.startsWith('https://'),
        isProduction: this.isProduction,
        envVar: process.env.NEXT_PUBLIC_API_BASE_URL,
        windowProtocol: window.location.protocol,
        windowHostname: window.location.hostname,
      });
    }
    
    // ABSOLUTE FINAL CHECK: Ensure baseURL is HTTPS before creating axios instance
    if (this.baseURL.includes('internhubapi.sadn.site') && !this.baseURL.startsWith('https://')) {
      console.error('❌ CRITICAL: baseURL was HTTP, forcing HTTPS');
      this.baseURL = this.baseURL.replace(/^http:\/\//, 'https://');
      this.baseURL = this.baseURL.replace(/http:\/\//g, 'https://');
      if (!this.baseURL.startsWith('https://')) {
        this.baseURL = 'https://internhubapi.sadn.site/api/v2';
      }
    }
    
    this.client = axios.create({
      baseURL: this.baseURL,
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

    // Request interceptor to add access token and ensure HTTPS
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // CRITICAL: Force HTTPS for production domain - MUST be FIRST
        // Check and fix baseURL immediately
        if (config.baseURL && config.baseURL.includes('internhubapi.sadn.site')) {
          if (config.baseURL.startsWith('http://')) {
            console.error('🚨 BLOCKING HTTP REQUEST - Forcing HTTPS:', config.baseURL);
            config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
            config.baseURL = config.baseURL.replace(/http:\/\//g, 'https://');
          }
          // Double-check it's HTTPS now
          if (!config.baseURL.startsWith('https://')) {
            config.baseURL = 'https://internhubapi.sadn.site/api/v2';
          }
        }
        
        // CRITICAL: Force HTTPS for production - do this FIRST before anything else
        if (this.isProduction) {
          // Force baseURL to HTTPS
          if (config.baseURL) {
            config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
          }
          
          // Force URL to HTTPS if it's a full URL
          if (config.url && config.url.startsWith('http://')) {
            config.url = config.url.replace(/^http:\/\//, 'https://');
          }
          
          // Reconstruct full URL and force HTTPS if needed
          // Axios combines baseURL + url, so we need to check the final result
          if (config.baseURL && config.url) {
            // Check if either contains the production domain
            if (config.baseURL.includes('internhubapi.sadn.site') || config.url.includes('internhubapi.sadn.site')) {
              // Ensure baseURL is HTTPS
              config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
              // If url is a full URL, ensure it's HTTPS
              if (config.url.startsWith('http://')) {
                config.url = config.url.replace(/^http:\/\//, 'https://');
              }
            }
          }
        }
        
        // Additional safety: Check if baseURL contains production domain and force HTTPS
        if (config.baseURL?.includes('internhubapi.sadn.site')) {
          config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
        }
        
        // Additional safety: Check if url contains production domain and force HTTPS
        if (config.url?.includes('internhubapi.sadn.site')) {
          config.url = config.url.replace(/http:\/\/internhubapi\.sadn\.site/g, 'https://internhubapi.sadn.site');
        }
        
        // FINAL NUCLEAR OPTION: If we're in production and ANY part is HTTP, force HTTPS
        if (this.isProduction) {
          const fullUrl = config.url 
            ? (config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`)
            : config.baseURL;
          
          if (fullUrl && fullUrl.includes('internhubapi.sadn.site') && fullUrl.startsWith('http://')) {
            // Reconstruct with HTTPS
            const httpsUrl = fullUrl.replace(/^http:\/\//, 'https://');
            if (config.url && config.url.startsWith('http')) {
              config.url = httpsUrl;
              config.baseURL = '';
            } else {
              config.baseURL = httpsUrl.split('/api/v2')[0] + '/api/v2';
              config.url = config.url || '';
            }
          }
        }
        
        // ABSOLUTE FINAL CHECK: Override axios's internal URL construction
        // Force baseURL to HTTPS one more time - axios might reconstruct it
        if (config.baseURL && config.baseURL.includes('internhubapi.sadn.site')) {
          if (config.baseURL.startsWith('http://')) {
            console.error('🚨 CRITICAL: HTTP detected in baseURL at final check - FIXING:', config.baseURL);
            config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
            config.baseURL = config.baseURL.replace(/http:\/\//g, 'https://');
          }
          // Ensure it's HTTPS
          if (!config.baseURL.startsWith('https://')) {
            console.error('🚨 CRITICAL: baseURL not HTTPS after all checks - FORCING:', config.baseURL);
            config.baseURL = 'https://internhubapi.sadn.site/api/v2';
          }
        }
        
        // FINAL FINAL CHECK: If we're in production and ANY URL part is HTTP, block it
        if (this.isProduction) {
          const finalUrl = config.url 
            ? (config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`)
            : config.baseURL;
          
          if (finalUrl && finalUrl.includes('internhubapi.sadn.site') && finalUrl.startsWith('http://')) {
            console.error('🚨 BLOCKING HTTP REQUEST - Mixed Content Prevention:', finalUrl);
            // Force HTTPS by reconstructing the URL
            const httpsUrl = finalUrl.replace(/^http:\/\//, 'https://');
            if (config.url && config.url.startsWith('http')) {
              config.url = httpsUrl;
              config.baseURL = '';
            } else {
              config.baseURL = httpsUrl.split('/api/v2')[0] + '/api/v2';
            }
          }
        }
        
        // Force the final constructed URL to be HTTPS by overriding axios's URL property
        if (this.isProduction && config.baseURL) {
          // Reconstruct the full URL manually to ensure HTTPS
          let finalUrl = '';
          if (config.url && config.url.startsWith('http://')) {
            finalUrl = config.url.replace(/^http:\/\//, 'https://');
            config.url = finalUrl;
            config.baseURL = '';
          } else if (config.url && config.url.startsWith('https://')) {
            // Already HTTPS, good
          } else {
            // Relative URL, combine with baseURL
            const base = config.baseURL.replace(/^http:\/\//, 'https://');
            const path = config.url || '';
            finalUrl = base + path;
            // If final URL contains HTTP, force HTTPS
            if (finalUrl.includes('internhubapi.sadn.site') && finalUrl.startsWith('http://')) {
              finalUrl = finalUrl.replace(/^http:\/\//, 'https://');
              // Update config to reflect HTTPS
              config.baseURL = finalUrl.split(path)[0];
            }
          }
        }
        
        // Add Authorization header - MUST be after all URL modifications
        // CRITICAL: Reload token from localStorage before each request to ensure it's up to date
        // This handles cases where token was set in another tab/window or after page refresh
        if (typeof window !== 'undefined') {
          const storedToken = localStorage.getItem('access_token');
          if (storedToken && storedToken !== this.accessToken) {
            this.accessToken = storedToken;
          }
        }
        
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        } else {
          // Log warning if token is missing for authenticated endpoints
          if (config.url && !config.url.includes('/auth/') && !config.url.includes('/healthz')) {
            console.warn('⚠️ No access token available for request to:', config.url);
            console.warn('   Checked localStorage:', typeof window !== 'undefined' ? localStorage.getItem('access_token') : 'N/A');
          }
        }
        
        // DEBUG: Log final URL and headers for POST requests in production
        if (this.isProduction && config.method === 'POST' && config.baseURL && config.url) {
          const debugUrl = config.url.startsWith('http') ? config.url : `${config.baseURL}${config.url}`;
          console.log('📤 POST Request:', {
            url: debugUrl,
            baseURL: config.baseURL,
            path: config.url,
            hasToken: !!this.accessToken,
            headers: {
              'Content-Type': config.headers['Content-Type'],
              'Authorization': config.headers.Authorization ? 'Bearer ***' : 'MISSING',
            },
          });
          
          if (debugUrl.includes('internhubapi.sadn.site') && debugUrl.startsWith('http://')) {
            console.error('❌ CRITICAL: HTTP detected in final URL:', debugUrl);
            console.error('   baseURL:', config.baseURL);
            console.error('   url:', config.url);
            // Force fix it
            const fixedUrl = debugUrl.replace(/^http:\/\//, 'https://');
            if (config.url.startsWith('http')) {
              config.url = fixedUrl;
              config.baseURL = '';
            }
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh and log errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        
        // Enhanced error logging for debugging connection issues
        if (error.response) {
          // Server responded with error
          console.error('❌ API Error Response:', {
            url: originalRequest?.url,
            baseURL: originalRequest?.baseURL,
            method: originalRequest?.method,
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            headers: error.response.headers,
          });
        } else if (error.request) {
          // Request was made but no response received
          console.error('❌ API Network Error (No Response):', {
            url: originalRequest?.url,
            baseURL: originalRequest?.baseURL,
            method: originalRequest?.method,
            code: error.code,
            message: error.message,
            request: error.request,
          });
        } else {
          // Something else happened
          console.error('❌ API Error (Other):', {
            message: error.message,
            url: originalRequest?.url,
          });
        }

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
      // Use the health URL from env, or derive from baseURL
      let healthUrl = process.env.NEXT_PUBLIC_API_HEALTH_URL;
      if (!healthUrl) {
        healthUrl = this.baseURL.replace('/api/v2', '/healthz');
      }
      // NUCLEAR: Force HTTPS for production domain - no exceptions
      if (healthUrl.includes('internhubapi.sadn.site')) {
        healthUrl = healthUrl.replace(/^http:\/\//, 'https://');
        healthUrl = healthUrl.replace(/http:\/\//g, 'https://');
      }
      // Also check window protocol
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        healthUrl = healthUrl.replace(/^http:\/\//, 'https://');
      }
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
      // Only log errors in development to avoid console spam
      if (process.env.NODE_ENV === 'development') {
        console.error('❌ Backend connection test failed:', error.message);
        console.error('   Make sure backend is running at', this.baseURL.replace('/api/v2', ''));
      }
    }
  }

  // Auth endpoints
  async signUp(credentials: SignUpRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/sign-up', credentials);
    this.setAccessToken(response.data.access_token);
    if (response.data.refresh_token) {
      this.setRefreshToken(response.data.refresh_token);
    }
    return response.data;
  }

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
    let refreshBaseUrl = this.baseURL;
    // NUCLEAR: Force HTTPS in production - no exceptions
    if (this.isProduction || refreshBaseUrl.includes('internhubapi.sadn.site')) {
      refreshBaseUrl = refreshBaseUrl.replace(/^http:\/\//, 'https://');
      refreshBaseUrl = refreshBaseUrl.replace(/http:\/\//g, 'https://');
    }
    const refreshClient = axios.create({
      baseURL: refreshBaseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });
    
    // Add interceptor to ensure HTTPS on refresh requests too - NUCLEAR LEVEL
    refreshClient.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Force HTTPS for any production domain
        if (this.isProduction || config.baseURL?.includes('internhubapi.sadn.site')) {
          if (config.baseURL) {
            config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
            config.baseURL = config.baseURL.replace(/http:\/\//g, 'https://');
          }
          if (config.url) {
            config.url = config.url.replace(/^http:\/\//, 'https://');
            config.url = config.url.replace(/http:\/\//g, 'https://');
          }
        }
        // Additional check for production domain
        if (config.baseURL?.includes('internhubapi.sadn.site')) {
          config.baseURL = config.baseURL.replace(/^http:\/\//, 'https://');
        }
        if (config.url?.includes('internhubapi.sadn.site')) {
          config.url = config.url.replace(/http:\/\/internhubapi\.sadn\.site/g, 'https://internhubapi.sadn.site');
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
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

// Create API client instance
const apiClient = new ApiClient();

// RUNTIME CHECK: Ensure baseURL is HTTPS (in case env var was HTTP at build time)
// This runs after the module loads, so window is available
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after the client is fully initialized
  setTimeout(() => {
    // Check if we're in production
    const isProd = window.location.protocol === 'https:' || 
                   window.location.hostname.includes('internhub.sadn.site');
    
    if (isProd && apiClient.baseURL) {
      // Force HTTPS by accessing the baseURL property and fixing it
      if (apiClient.baseURL.includes('internhubapi.sadn.site')) {
        if (apiClient.baseURL.startsWith('http://')) {
          console.error('🚨 CRITICAL: Runtime check found HTTP baseURL - FIXING:', apiClient.baseURL);
          apiClient.baseURL = apiClient.baseURL.replace(/^http:\/\//, 'https://');
          apiClient.baseURL = apiClient.baseURL.replace(/http:\/\//g, 'https://');
          if (!apiClient.baseURL.startsWith('https://')) {
            apiClient.baseURL = 'https://internhubapi.sadn.site/api/v2';
          }
          // Also update the axios instance's default baseURL
          (apiClient as any).client.defaults.baseURL = apiClient.baseURL;
          console.log('✅ Fixed baseURL to:', apiClient.baseURL);
        }
      }
    }
  }, 0);
}

export { apiClient };

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
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
      return `Network error. Please check your connection and ensure the backend server is running at ${apiUrl}. Check browser console for details.`;
    }
    if (error?.code === 'ECONNREFUSED') {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
      return `Connection refused. Is the backend server running at ${apiUrl}?`;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v2';
    return error?.message || `Network error. Please check your connection to ${apiUrl}. Check browser console for details.`;
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





