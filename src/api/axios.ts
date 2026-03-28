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
});

export default api;
