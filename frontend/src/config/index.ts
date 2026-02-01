/**
 * Application configuration
 * Loads values from environment variables
 */

// Validate required environment variables
const requiredEnvVars = [
  'VITE_MAPBOX_TOKEN',
  'VITE_COGNITO_USER_POOL_ID',
  'VITE_COGNITO_CLIENT_ID',
] as const

// Check for missing required env vars in production
if (import.meta.env.PROD) {
  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      console.error(`Missing required environment variable: ${envVar}`)
    }
  }
}

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Mapbox Configuration - Required
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || '',
  
  // AWS Cognito Configuration - Required for authentication
  aws: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
  },
  
  // Map default settings (Dallas-Fort Worth area)
  map: {
    defaultCenter: [-96.797, 32.777] as [number, number], // Dallas center
    defaultZoom: 11,  // Increased from 10 to 11 for better initial view
    minZoom: 5,
    maxZoom: 18,
  },
  
  // Data limits
  limits: {
    maxExportRows: 5000,
    defaultPageSize: 1000,
    maxPageSize: 10000,
  },
} as const

export default config

