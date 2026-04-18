const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('sra_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    throw new Error(payload?.error || 'Request failed');
  }

  return payload;
}

export const api = {
  delete: (path) => request(path, { method: 'DELETE' }),
  get: (path) => request(path),
  patch: (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body) }),
  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  raw: request,
};

export { API_BASE_URL };
