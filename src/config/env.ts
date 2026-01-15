/**
 * Environment Configuration and Validation
 * Validates that required environment variables are set and provides fallbacks
 */

interface EnvConfig {
  apiBaseUrl: string;
  backendUrl: string;
  apiUrl: string;
  fastApiUrl: string;
  bulkApiUrl: string;
  bulkWsUrl: string;
  supabaseUrl: string;
  supabaseKey: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

/**
 * Get environment configuration with validation
 */
export function getEnvConfig(): EnvConfig {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  // Runtime detection: If in production and on HTTPS, auto-detect backend URL
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
  // Use HTTPS for backend in production
  const defaultBackend = isProduction && isHttps 
    ? 'https://docflow-backend.simplifyaipro.com'
    : 'http://localhost:8000';

  // Backend URLs
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 
                     import.meta.env.VITE_FASTAPI_URL || 
                     import.meta.env.VITE_BACKEND_URL || 
                     defaultBackend;
  
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 
                     import.meta.env.VITE_API_BASE_URL || 
                     defaultBackend;
  
  const apiUrl = import.meta.env.VITE_API_URL || 
                 import.meta.env.VITE_API_BASE_URL || 
                 defaultBackend;
  
  const fastApiUrl = import.meta.env.VITE_FASTAPI_URL || 
                     import.meta.env.VITE_API_BASE_URL || 
                     defaultBackend;
  
  const bulkApiUrl = import.meta.env.VITE_BULK_API_URL || 
                     import.meta.env.VITE_API_BASE_URL || 
                     defaultBackend;
  
  const defaultWs = isProduction && isHttps 
    ? 'wss://docflow-backend.simplifyaipro.com'
    : 'ws://localhost:8000';
    
  const bulkWsUrl = import.meta.env.VITE_BULK_WS_URL || defaultWs;

  // Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

  // Warn in production if using localhost
  if (isProduction && apiBaseUrl.includes('localhost')) {
    console.error(
      '⚠️ CONFIGURATION ERROR: Using localhost URL in production!\n' +
      'Environment variables were not set during build.\n' +
      'Please set VITE_API_BASE_URL in your deployment platform and rebuild.\n' +
      `Current API URL: ${apiBaseUrl}`
    );
  }

  // Warn if required Supabase vars are missing
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      '⚠️ CONFIGURATION ERROR: Missing Supabase configuration!\n' +
      'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY'
    );
  }

  // Log configuration in development
  if (isDevelopment) {
    console.log('📝 Environment Configuration:', {
      apiBaseUrl,
      backendUrl,
      fastApiUrl,
      bulkApiUrl,
      supabaseUrl: supabaseUrl || 'NOT SET',
      mode: isProduction ? 'production' : 'development'
    });
  }

  return {
    apiBaseUrl,
    backendUrl,
    apiUrl,
    fastApiUrl,
    bulkApiUrl,
    bulkWsUrl,
    supabaseUrl,
    supabaseKey,
    isDevelopment,
    isProduction
  };
}

/**
 * Get the API base URL for different services
 */
export const env = getEnvConfig();

/**
 * Helper to get API URL with path
 */
export function getApiUrl(path: string): string {
  const baseUrl = env.apiBaseUrl.replace(/\/$/, ''); // Remove trailing slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Helper to check if environment is properly configured
 */
export function isEnvConfigured(): boolean {
  if (env.isProduction) {
    return !env.apiBaseUrl.includes('localhost') && 
           !!env.supabaseUrl && 
           !!env.supabaseKey;
  }
  return true; // Always true in development
}

/**
 * Show a user-friendly error if environment is not configured
 */
export function checkEnvConfig(): void {
  if (!isEnvConfigured()) {
    const message = 
      'Application is not properly configured for production. ' +
      'Please contact the system administrator.';
    
    // You could show a toast/notification here instead
    console.error('❌ ' + message);
    
    // Optionally, you could throw an error to prevent the app from loading
    // throw new Error(message);
  }
}
