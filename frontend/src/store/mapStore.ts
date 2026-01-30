/**
 * Map store using Zustand
 * Manages map state and parcel data
 */
import { create } from 'zustand'
import type { ParcelFeature, FeatureCollection } from '../types'
import config from '../config'

interface MapState {
  // Map viewport
  center: [number, number]
  zoom: number
  bounds: {
    north: number
    south: number
    east: number
    west: number
  } | null
  
  // Parcel data
  parcels: ParcelFeature[]
  totalParcels: number
  isLoading: boolean
  error: string | null
  accessLevel: 'guest' | 'registered'
  
  // Selected parcel
  selectedParcel: ParcelFeature | null
  hoveredParcelId: string | null
  
  // Map mode
  mapStyle: 'dark' | 'satellite' | 'streets'
  showClusters: boolean
  showHeatmap: boolean
  
  // Actions
  setCenter: (center: [number, number]) => void
  setZoom: (zoom: number) => void
  setBounds: (bounds: MapState['bounds']) => void
  setParcels: (data: FeatureCollection) => void
  setTotalParcels: (total: number) => void
  setAccessLevel: (level: 'guest' | 'registered') => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setSelectedParcel: (parcel: ParcelFeature | null) => void
  setHoveredParcelId: (id: string | null) => void
  setMapStyle: (style: MapState['mapStyle']) => void
  toggleClusters: () => void
  toggleHeatmap: () => void
  clearParcels: () => void
}

export const useMapStore = create<MapState>()((set) => ({
  center: config.map.defaultCenter,
  zoom: config.map.defaultZoom,
  bounds: null,
  
  parcels: [],
  totalParcels: 0,
  isLoading: false,
  error: null,
  accessLevel: 'guest',
  
  selectedParcel: null,
  hoveredParcelId: null,
  
  mapStyle: 'streets',  // Changed from 'dark' to 'streets' for better visibility
  showClusters: true,
  showHeatmap: false,

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setBounds: (bounds) => set({ bounds }),
  
  setParcels: (data) =>
    set({
      parcels: data.features,
      totalParcels: data.metadata.total,
      accessLevel: data.metadata.accessLevel,
      isLoading: false,
      error: null,
    }),
  
  setTotalParcels: (totalParcels) => set({ totalParcels }),
  setAccessLevel: (accessLevel) => set({ accessLevel }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  setSelectedParcel: (selectedParcel) => set({ selectedParcel }),
  setHoveredParcelId: (hoveredParcelId) => set({ hoveredParcelId }),
  setMapStyle: (mapStyle) => set({ mapStyle }),
  toggleClusters: () => set((state) => ({ showClusters: !state.showClusters })),
  toggleHeatmap: () => set((state) => ({ showHeatmap: !state.showHeatmap })),
  
  clearParcels: () =>
    set({
      parcels: [],
      totalParcels: 0,
      selectedParcel: null,
      error: null,
    }),
}))

// Map style URLs
export const MAP_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
} as const

