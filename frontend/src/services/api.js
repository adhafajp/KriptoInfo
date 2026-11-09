
const API_BASE = '/api';
const USB_AGENT_BASE = 'http://127.0.0.1:8787';

export async function apiRequest(endpoint, options = {}) {
  const {
    method = 'GET',
    body,
    isFormData = false,
    headers = {}
  } = options;

  const config = {
    method,
    headers: { ...headers },
    credentials: 'include'
  };

  if (body !== undefined && body !== null) {
    if (isFormData) {
      config.body = body;
    } else {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${endpoint}`, config);

  const data = await res.json().catch(() => ({
    success: false,
    message: 'Respon server tidak valid'
  }));

  if (!res.ok && !data.message) {
    data.message = `HTTP Error ${res.status}`;
  }

  return data;
}

export const cryptoApi = {
  encryptMessage: (text, vigenereKey) =>
    apiRequest('/crypto/message/encrypt', {
      method: 'POST',
      body: { text, vigenereKey }
    }),

  decryptMessage: (payload, vigenereKey) =>
    apiRequest('/crypto/message/decrypt', {
      method: 'POST',
      body: { payload, vigenereKey }
    }),

  encryptFile: (fileBase64) =>
    apiRequest('/crypto/file/encrypt', {
      method: 'POST',
      body: { fileBase64 }
    }),

  decryptFile: (payload) =>
    apiRequest('/crypto/file/decrypt', {
      method: 'POST',
      body: { payload }
    }),
};

export const vaultApi = {
  list: () => apiRequest('/vault'),

  get: (id) => apiRequest(`/vault/${id}`),

  create: (item) =>
    apiRequest('/vault', {
      method: 'POST',
      body: item
    }),

  uploadFile: (fileData) =>
    apiRequest('/vault/upload', {
      method: 'POST',
      body: fileData
    }),

  downloadFile: (id) => apiRequest(`/vault/${id}/download`),

  delete: (id) =>
    apiRequest(`/vault/${id}`, {
      method: 'DELETE'
    }),
};

export const stegoApi = {
  embed: async (formData) => {
    try {
      const res = await fetch(`${API_BASE}/stego/embed`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: `HTTP Error ${res.status}` }));
        return { success: false, message: err.message };
      }
      const blob = await res.blob();
      const imageUrl = URL.createObjectURL(blob);
      return { success: true, data: { imageUrl, filename: 'kryptoinfo-stego.png' } };
    } catch (err) {
      return { success: false, message: err.message || 'Gagal memproses gambar' };
    }
  },

  extract: (formData) =>
    apiRequest('/stego/extract', {
      method: 'POST',
      body: formData,
      isFormData: true
    }),
};

export const blockchainApi = {
  list: () => apiRequest('/blockchain'),

  add: async (data) => {
    let payload = data;
    if (typeof data === 'string') {
      const msgUint8 = new TextEncoder().encode(data);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const assetHash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      payload = {
        assetId: `asset-${Date.now()}`,
        assetHash,
        metadata: data
      };
    }
    return apiRequest('/blockchain', {
      method: 'POST',
      body: payload
    });
  },

  verify: () => apiRequest('/blockchain/verify'),
};

export const auditApi = {
  list: () => apiRequest('/audit'),
};

export const authApi = {
  me: () => apiRequest('/auth/me'),

  verifyFace: (username, faceDescriptor) =>
    apiRequest('/auth/verify-face', {
      method: 'POST',
      body: { username, faceDescriptor }
    }),

  challenge: (username) =>
    apiRequest('/auth/challenge', {
      method: 'POST',
      body: { username }
    }),

  login: (credentials) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: credentials
    }),

  enroll: (data) =>
    apiRequest('/auth/enroll', {
      method: 'POST',
      headers: {
        'X-Enrollment-Code': data.enrollmentCode
      },
      body: {
        username: data.username,
        password: data.password,
        publicKey: data.publicKey,
        faceDescriptor: data.faceDescriptor
      }
    }),

  logout: () =>
    apiRequest('/auth/logout', {
      method: 'POST'
    }),
};

async function usbAgentRequest(endpoint, options = {}) {
  let response;

  try {
    response = await fetch(`${USB_AGENT_BASE}${endpoint}`, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error(
      'USB Agent tidak dapat dihubungi. Pastikan USB Agent sudah dijalankan.'
    );
  }

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Respons USB Agent tidak valid.'
  }));

  if (!response.ok || !data.success) {
    throw new Error(data.message || `USB Agent error: ${response.status}`);
  }

  return data;
}

export const usbAgentApi = {
  status: () => usbAgentRequest('/api/status'),

  signChallenge: (dongleId, challengeText) =>
    usbAgentRequest('/api/sign-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dongleId,
        challengeText
      })
    })
};
