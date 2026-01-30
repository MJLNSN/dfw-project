/**
 * Type definitions for the application
 */

// GeoJSON types - compatible with Mapbox
export interface GeoJSONGeometry {
  type: 'Point' | 'MultiPoint' | 'LineString' | 'MultiLineString' | 'Polygon' | 'MultiPolygon' | 'GeometryCollection'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export interface ParcelProperties {
  parcel_id: string
  address: string | null
  price: number | null
  size_sqft: number | null
  county: string | null
}

export interface ParcelFeature {
  type: 'Feature'
  properties: ParcelProperties
  geometry: GeoJSONGeometry | null
}

export interface FeatureCollection {
  type: 'FeatureCollection'
  features: ParcelFeature[]
  metadata: {
    total: number
    returned: number
    hasMore: boolean
    accessLevel: 'guest' | 'registered'
    appliedFilters?: FilterCriteria
  }
}

// Filter types
export interface PriceRange {
  min: number | null
  max: number | null
}

export interface SizeRange {
  min: number | null
  max: number | null
}

export interface FilterCriteria {
  priceRange?: PriceRange
  sizeRange?: SizeRange
  counties?: string[]
}

// Preference types
export interface Preference {
  id: string
  name: string
  filters: FilterCriteria
  isDefault: boolean
  created_at: string
  updated_at: string
}

// Auth types
export interface User {
  id: string
  email: string
  username?: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// API types
export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
  metadata: {
    timestamp: string
    path?: string
  }
}

// Quick filter presets
export interface QuickFilter {
  name: string
  icon: string
  description: string
  filters: FilterCriteria
}
