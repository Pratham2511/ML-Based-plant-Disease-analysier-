import axios from 'axios';

axios.defaults.withCredentials = true;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('API error', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
