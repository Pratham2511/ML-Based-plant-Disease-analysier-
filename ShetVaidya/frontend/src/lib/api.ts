import axios from 'axios';

const ACCESS_TOKEN_STORAGE_KEY = 'shetvaidya_access_token';

export const getStoredAccessToken = (): string => {
  if (typeof window === 'undefined') return '';
  return String(window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) || '').trim();
};

export const setStoredAccessToken = (token: string | null): void => {
  if (typeof window === 'undefined') return;
  const normalized = String(token || '').trim();
  if (!normalized) {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, normalized);
};

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

api.defaults.withCredentials = true;

const initialToken = getStoredAccessToken();
if (initialToken) {
  api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;
}

export const setApiAuthToken = (token: string | null): void => {
  const normalized = String(token || '').trim();
  if (!normalized) {
    delete api.defaults.headers.common.Authorization;
    return;
  }
  api.defaults.headers.common.Authorization = `Bearer ${normalized}`;
};

const normalizeBackend404 = (error: any) => {
  const status = error?.response?.status;
  const rawData = error?.response?.data;
  const rawText = typeof rawData === 'string' ? rawData : '';
  const requestUrl = String(error?.config?.url || '');
  const baseUrl = String(error?.config?.baseURL || '');
  const isHfTarget = baseUrl.includes('.hf.space') || requestUrl.includes('.hf.space');
  const isHf404Html = rawText.includes('Hugging Face') && rawText.includes('<html');

  if (status === 404 && (isHfTarget || isHf404Html)) {
    error.response.data = {
      detail:
        'Backend endpoint is unreachable on Hugging Face Space (404). Check that the Space URL is correct, the Space is public/running, and VITE_API_URL points to the live API domain.',
    };
  }
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error?.config as (typeof error.config & { _apiPrefixRetried?: boolean }) | undefined;
    const status = error?.response?.status;

    // Some deployments expose backend routes under /api/*.
    // Retry once with /api prefix when the root path returns 404.
    if (original && status === 404 && !original._apiPrefixRetried) {
      const currentUrl = String(original.url || '');
      if (currentUrl.startsWith('/') && !currentUrl.startsWith('/api/')) {
        original._apiPrefixRetried = true;
        original.url = `/api${currentUrl}`;
        return api.request(original);
      }
    }

    normalizeBackend404(error);

    console.error('API error', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = getStoredAccessToken();
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
