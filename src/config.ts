// Dynamic API Base URL for both local dev and production deployment
export const API_BASE = import.meta.env.PROD 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000/api');
