const BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

export const api = {
  createEntry: (data) =>
    request('/journal', { method: 'POST', body: JSON.stringify(data) }),

  getEntries: (userId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/journal/${userId}${q ? `?${q}` : ''}`);
  },

  analyzeText: (text, entryId) =>
    request('/journal/analyze', {
      method: 'POST',
      body: JSON.stringify({ text, entryId }),
    }),

  analyzeEntry: (entryId) =>
    request(`/journal/entry/${entryId}/analyze`, { method: 'PATCH' }),

  getInsights: (userId) => request(`/journal/insights/${userId}`),
};

export default api;
