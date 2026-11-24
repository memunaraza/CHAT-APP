import axios from "axios";
import { getToken } from "./token";

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

// Har request ke saath token khud lag jata hai
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
