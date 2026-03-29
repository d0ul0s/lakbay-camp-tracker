import axios from 'axios';

let defaultBaseUrl = import.meta.env.VITE_API_URL;

// Force relative paths locally so Vite natively handles the REST traffic proxy. 
// This physically prevents cross-origin SameSite cookie packet stripping entirely, ignoring .env overrides.
if (window.location.hostname === 'localhost' || window.location.hostname.startsWith('192.168.')) {
  defaultBaseUrl = ''; 
} else if (!defaultBaseUrl) {
  defaultBaseUrl = 'https://lakbay-camp-tracker.onrender.com';
}

const api = axios.create({
  baseURL: defaultBaseUrl,
  withCredentials: true,
  timeout: 30000,
});

// Attach stored JWT as Authorization Bearer header on every request.
// This is the mobile/cross-origin fallback: Safari and some Android browsers
// silently block SameSite=None cookies from third-party origins (Render → Vercel),
// so we send the token in the header instead. The server middleware accepts both.
api.interceptors.request.use(config => {
  const token = sessionStorage.getItem('lakbay_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
