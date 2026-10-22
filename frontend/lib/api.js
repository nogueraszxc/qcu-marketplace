import axios from 'axios';

export function isPreviewMode() { return false; }

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  // Render Free can take about a minute to wake after inactivity.
  timeout: 90000,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

api.interceptors.request.use((config) => {
  if (isPreviewMode()) {
    const error = new Error('Design preview does not send requests to the live server.');
    error.code = 'PREVIEW_BLOCKED';
    return Promise.reject(error);
  }
  if (/^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(config.url || '')) {
    const error = new Error('Account requests must use the same-origin API.');
    error.code = 'API_ORIGIN_BLOCKED';
    return Promise.reject(error);
  }
  config.baseURL = '/api';
  // Session credentials belong in the server-managed httpOnly cookie only.
  delete config.headers.Authorization;
  delete config.headers.authorization;
  config.headers['X-Requested-With'] = 'XMLHttpRequest';
  return config;
});
api.interceptors.response.use((response) => response, (error) => {
  const path = error.config?.url || '';
  const expectedGuestResponse = (error.config?.method === 'get' && /^\/users\/me\/?$/.test(path)) || /^\/users\/(login|register|google-login|forgot-password|reset-password)\/?$/.test(path);
  if (error.response?.status === 401 && !expectedGuestResponse && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qcu:session-expired', { detail: 'Your session has expired. Sign in again to continue.' }));
  }
  return Promise.reject(error);
});
export function apiError(error, fallback = 'We could not complete that request. Please try again.') {
  if (typeof error.response?.data?.message === 'string') return error.response.data.message;
  if (error.code === 'PREVIEW_BLOCKED') return 'This action is unavailable in the design preview. No request was sent.';
  if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Your details are still here; please try again.';
  return fallback;
}
export default api;

