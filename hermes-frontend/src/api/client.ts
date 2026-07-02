import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data: T;
  total?: number;
  page?: number;
  limit?: number;
}

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('hermes_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unwrap nested { status, data } envelope, handle 401
client.interceptors.response.use(
  (response: AxiosResponse) => {
    // Backend wraps responses as { status: 'success', data: ... [, total, page, limit] }
    // Unwrap so callers can do res.data.xxx instead of res.data.data.xxx
    // For paginated responses, preserve total/page/limit alongside data
    const body = response.data;
    if (body && typeof body === 'object' && 'status' in body && 'data' in body && body.status === 'success') {
      if ('total' in body) {
        // 分頁回應：保留 { data, total, page, limit }
        response.data = { data: body.data, total: body.total, page: body.page, limit: body.limit };
      } else {
        response.data = body.data;
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('hermes_token');
      localStorage.removeItem('hermes_user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
