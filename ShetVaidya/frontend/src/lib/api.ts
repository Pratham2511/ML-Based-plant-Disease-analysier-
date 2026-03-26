import axios from 'axios';

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

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

export default api;
