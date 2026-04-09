const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string = 'UNKNOWN') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data.error?.message || 'Something went wrong',
      res.status,
      data.error?.code || 'UNKNOWN'
    );
  }

  return data;
}

// File upload helper (no Content-Type — browser sets multipart boundary)
async function uploadFile<T>(endpoint: string, formData: FormData, token?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(
      data.error?.message || 'Upload failed',
      res.status,
      data.error?.code || 'UNKNOWN'
    );
  }

  return data;
}

// Auth endpoints
export const auth = {
  sendOtp: (phone: string) =>
    request<{ success: boolean; data: { message: string; expiresIn: number } }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, otp: string) =>
    request<{ success: boolean; data: { accessToken: string; refreshToken: string; user: any; isNewUser: boolean } }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp }),
    }),

  refreshToken: (refreshToken: string) =>
    request<{ success: boolean; data: { accessToken: string; refreshToken: string } }>('/auth/refresh-token', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  getMe: (token: string) =>
    request<{ success: boolean; data: any }>('/auth/me', { token }),

  updateProfile: (token: string, data: Record<string, any>) =>
    request<{ success: boolean; data: any }>('/auth/profile', {
      method: 'PUT',
      token,
      body: JSON.stringify(data),
    }),

  logout: (token: string, refreshToken?: string) =>
    request<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      token,
      body: JSON.stringify({ refreshToken }),
    }),
};

// Reports endpoints
export const reports = {
  upload: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return uploadFile<{ success: boolean; data: any }>('/reports/upload', formData, token);
  },

  list: (token: string, page = 1, limit = 20) =>
    request<{ success: boolean; data: any[]; total: number; page: number; limit: number }>(
      `/reports?page=${page}&limit=${limit}`,
      { token }
    ),

  getById: (token: string, id: string) =>
    request<{ success: boolean; data: any }>(`/reports/${id}`, { token }),

  getBiomarkers: (token: string, id: string) =>
    request<{ success: boolean; data: any }>(`/reports/${id}/biomarkers`, { token }),

  delete: (token: string, id: string) =>
    request<{ success: boolean }>(`/reports/${id}`, { method: 'DELETE', token }),
};

// Dashboard endpoints
export const dashboard = {
  getSummary: (token: string) =>
    request<{ success: boolean; data: any }>('/dashboard', { token }),

  getConcerns: (token: string) =>
    request<{ success: boolean; data: any[] }>('/dashboard/concerns', { token }),

  getRecommendations: (token: string) =>
    request<{ success: boolean; data: any }>('/dashboard/recommendations', { token }),

  getBiomarkerTrend: (token: string, biomarkerName: string) =>
    request<{ success: boolean; data: any[] }>(`/dashboard/trends/${encodeURIComponent(biomarkerName)}`, { token }),
};

export { ApiError };
