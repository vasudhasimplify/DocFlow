// API configuration
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
// if (!apiBaseUrl) throw new Error('VITE_API_BASE_URL environment variable is required');
export const API_BASE_URL = apiBaseUrl;
