/**
 * Filter store using Zustand
 * Manages search filters and preferences
 */
import { create } from 'zustand'
import type { FilterCriteria, Preference } from '../types'

interface FilterState {
  // Current active filters
  filters: FilterCriteria
  
  // Saved preferences (from API)
  savedPreferences: Preference[]
  activePreferenceId: string | null
  
  // UI state
  isFiltersOpen: boolean
  
  // Actions
  setFilters: (filters: FilterCriteria) => void
  updatePriceRange: (min: number | null, max: number | null) => void
  updateSizeRange: (min: number | null, max: number | null) => void
  updateCounties: (counties: string[]) => void
  clearFilters: () => void
  applyPreset: (preset: FilterCriteria) => void
  
  // Preferences actions
  setSavedPreferences: (preferences: Preference[]) => void
  setActivePreference: (id: string | null) => void
  
  // UI actions
  toggleFilters: () => void
  setFiltersOpen: (open: boolean) => void
}

const defaultFilters: FilterCriteria = {
  priceRange: { min: null, max: null },
  sizeRange: { min: null, max: null },
  counties: [],
}

export const useFilterStore = create<FilterState>()((set) => ({
  filters: { ...defaultFilters },
  savedPreferences: [],
  activePreferenceId: null,
  isFiltersOpen: false,

  setFilters: (filters) => set({ filters, activePreferenceId: null }),

  updatePriceRange: (min, max) =>
    set((state) => ({
      filters: {
        ...state.filters,
        priceRange: { min, max },
      },
      activePreferenceId: null,
    })),

  updateSizeRange: (min, max) =>
    set((state) => ({
      filters: {
        ...state.filters,
        sizeRange: { min, max },
      },
      activePreferenceId: null,
    })),

  updateCounties: (counties) =>
    set((state) => ({
      filters: {
        ...state.filters,
        counties,
      },
      activePreferenceId: null,
    })),

  clearFilters: () =>
    set({
      filters: { ...defaultFilters },
      activePreferenceId: null,
    }),

  applyPreset: (preset) =>
    set({
      filters: { ...preset },
      activePreferenceId: null,
    }),

  setSavedPreferences: (preferences) => set({ savedPreferences: preferences }),

  setActivePreference: (id) =>
    set((state) => {
      if (!id) {
        return { activePreferenceId: null }
      }
      
      const preference = state.savedPreferences.find((p) => p.id === id)
      if (preference) {
        return {
          activePreferenceId: id,
          filters: { ...preference.filters },
        }
      }
      return { activePreferenceId: id }
    }),

  toggleFilters: () => set((state) => ({ isFiltersOpen: !state.isFiltersOpen })),
  setFiltersOpen: (open) => set({ isFiltersOpen: open }),
}))

// Quick filter presets
export const QUICK_FILTERS = [
  {
    name: 'Starter Homes',
    icon: '🏠',
    description: '$100k - $250k',
    filters: {
      priceRange: { min: 100000, max: 250000 },
      sizeRange: { min: 800, max: 1500 },
    },
  },
  {
    name: 'Family Homes',
    icon: '🏡',
    description: '$250k - $500k',
    filters: {
      priceRange: { min: 250000, max: 500000 },
      sizeRange: { min: 1500, max: 3000 },
    },
  },
  {
    name: 'Luxury',
    icon: '🏰',
    description: '$500k+',
    filters: {
      priceRange: { min: 500000, max: 2000000 },
      sizeRange: { min: 3000, max: null },
    },
  },
  {
    name: 'Investment',
    icon: '💰',
    description: '$50k - $200k',
    filters: {
      priceRange: { min: 50000, max: 200000 },
      sizeRange: { min: 500, max: 1200 },
    },
  },
]

