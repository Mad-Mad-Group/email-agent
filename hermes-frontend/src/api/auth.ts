import client from './client';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  company_name?: string;
  company_description?: string;
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: string;
  permissions?: string[];
  createdAt?: string;
  companyName?: string;
  companyDescription?: string;
  companyWebsite?: string;
}

export interface AuthResult {
  access_token: string;
  user: User;
}

export const authApi = {
  login: (data: LoginPayload) =>
    client.post<AuthResult>('/auth/login', data),

  register: (data: RegisterPayload) =>
    client.post<AuthResult>('/auth/register', data),

  me: () =>
    client.get<User>('/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    client.post('/auth/change-password', { oldPassword, newPassword }),

  forgotPassword: (email: string) =>
    client.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    client.post('/auth/reset-password', { token, newPassword }),

  updateProfile: (data: Partial<Pick<User, 'name' | 'email' | 'companyName' | 'companyDescription' | 'companyWebsite'>>) =>
    client.patch<User>('/auth/profile', data),
};

/* ── Token helpers ── */

export const tokenStore = {
  get: () => localStorage.getItem('hermes_token'),
  set: (token: string) => localStorage.setItem('hermes_token', token),
  remove: () => {
    localStorage.removeItem('hermes_token');
    localStorage.removeItem('hermes_user');
  },
  getUser: (): User | null => {
    const raw = localStorage.getItem('hermes_user');
    return raw ? JSON.parse(raw) : null;
  },
  setUser: (user: User) =>
    localStorage.setItem('hermes_user', JSON.stringify(user)),
};
