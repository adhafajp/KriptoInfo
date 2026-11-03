const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const { method = 'GET', body, isFormData = false } = options;
  const config = {
    method,
    headers: {},
    credentials: 'include'
  };

  if (body) {
    if (isFormData) {
      config.body = body;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json().catch(() => ({ success: false, message: 'Respon server tidak valid' }));

  if (!res.ok && !data.message) {
    data.message = `HTTP Error ${res.status}`;
  }
  return data;
}

export const cryptoApi = {
  encryptMessage: (text, vigenereKey) => apiRequest('/crypto/message/encrypt', { method: 'POST', body: { text, vigenereKey } }),
  decryptMessage: (payload, vigenereKey) => apiRequest('/crypto/message/decrypt', { method: 'POST', body: { payload, vigenereKey } }),
  encryptFile: (fileBase64) => apiRequest('/crypto/file/encrypt', { method: 'POST', body: { fileBase64 } }),
  decryptFile: (payload) => apiRequest('/crypto/file/decrypt', { method: 'POST', body: { payload } }),
};

export const vaultApi = {
  list: () => apiRequest('/vault'),
  get: (id) => apiRequest(`/vault/${id}`),
  create: (item) => apiRequest('/vault', { method: 'POST', body: item }),
  delete: (id) => apiRequest(`/vault/${id}`, { method: 'DELETE' }),
};

export const stegoApi = {
  embed: (formData) => apiRequest('/stego/embed', { method: 'POST', body: formData, isFormData: true }),
  extract: (formData) => apiRequest('/stego/extract', { method: 'POST', body: formData, isFormData: true }),
};

export const blockchainApi = {
  list: () => apiRequest('/blockchain'),
  add: (data) => apiRequest('/blockchain', { method: 'POST', body: { data } }),
  verify: () => apiRequest('/blockchain/verify'),
};

export const authApi = {
  me: () => apiRequest('/auth/me'),
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: credentials }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
};
