/**
 * API service for backend communication
 */
import axios, { AxiosInstance, AxiosError } from 'axios'
import config from '../config'
import { getIdToken } from './cognito'
import type { FeatureCollection, FilterCriteria, Preference } from '../types'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getIdToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - handled by auth store
      console.warn('Authentication error:', error.response.data)
    }
    return Promise.reject(error)
  }
)

// ============================================
// Parcel API
// ============================================

export interface GetParcelsParams {
  bbox?: string
  limit?: number
  offset?: number
  price_min?: number
  price_max?: number
  size_min?: number
  size_max?: number
}

/**
 * Get parcels with optional filters
 */
export const getParcels = async (params: GetParcelsParams = {}): Promise<FeatureCollection> => {
  const response = await api.get('/api/v1/parcels', { params })
  return response.data
}

/**
 * Search parcels with advanced filters
 */
export const searchParcels = async (
  filters?: FilterCriteria,
  bbox?: string,
  limit: number = 1000,
  offset: number = 0
): Promise<FeatureCollection> => {
  const response = await api.post('/api/v1/parcels/search', {
    filters,
    bbox,
    limit,
    offset,
  })
  return response.data
}

/**
 * Get a single parcel by ID
 */
export const getParcel = async (parcelId: string): Promise<FeatureCollection['features'][0]> => {
  const response = await api.get(`/api/v1/parcels/${parcelId}`)
  return response.data
}

// ============================================
// Preferences API
// ============================================

/**
 * Get all saved preferences
 */
export const getPreferences = async (): Promise<{ data: Preference[] }> => {
  const response = await api.get('/api/v1/preferences')
  return response.data
}

/**
 * Get default preference
 */
export const getDefaultPreference = async (): Promise<{ data: Preference }> => {
  const response = await api.get('/api/v1/preferences/default')
  return response.data
}

/**
 * Create a new preference
 */
export const createPreference = async (preference: {
  name: string
  filters: FilterCriteria
  isDefault?: boolean
}): Promise<{ data: Preference }> => {
  const response = await api.post('/api/v1/preferences', preference)
  return response.data
}

/**
 * Update a preference
 */
export const updatePreference = async (
  id: string,
  updates: Partial<{
    name: string
    filters: FilterCriteria
    isDefault: boolean
  }>
): Promise<{ data: Preference }> => {
  const response = await api.put(`/api/v1/preferences/${id}`, updates)
  return response.data
}

/**
 * Delete a preference
 */
export const deletePreference = async (id: string): Promise<void> => {
  await api.delete(`/api/v1/preferences/${id}`)
}

// ============================================
// Export API
// ============================================

/**
 * Export parcels to CSV
 */
export const exportToCsv = async (filters?: FilterCriteria): Promise<Blob> => {
  const response = await api.post(
    '/api/v1/export/csv',
    { filters },
    {
      responseType: 'blob',
    }
  )
  return response.data
}

/**
 * Download blob as file
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

// ============================================
// Health Check
// ============================================

export const healthCheck = async (): Promise<{
  status: string
  timestamp: string
  database: string
}> => {
  const response = await api.get('/health')
  return response.data
}

export default api

