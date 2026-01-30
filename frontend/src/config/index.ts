/**
 * Application configuration
 * Loads values from environment variables
 */

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  
  // Mapbox Configuration
  mapboxToken: import.meta.env.VITE_MAPBOX_TOKEN || '***REMOVED***',
  
  // AWS Cognito Configuration
  aws: {
    region: import.meta.env.VITE_AWS_REGION || 'us-east-2',
    userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '***REMOVED***',
    clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '***REMOVED***',
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

