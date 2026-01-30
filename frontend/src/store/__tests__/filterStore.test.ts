import { describe, it, expect, beforeEach } from 'vitest'
import { useFilterStore } from '../filterStore'

describe('FilterStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useFilterStore.setState({
      filters: {
        priceRange: { min: null, max: null },
        sizeRange: { min: null, max: null },
        counties: [],
      },
      savedPreferences: [],
      activePreferenceId: null,
    })
  })

  it('should initialize with default values', () => {
    const state = useFilterStore.getState()
    expect(state.filters.priceRange).toEqual({ min: null, max: null })
    expect(state.filters.sizeRange).toEqual({ min: null, max: null })
    expect(state.filters.counties).toEqual([])
    expect(state.savedPreferences).toEqual([])
  })

  it('should update price range', () => {
    const { updatePriceRange } = useFilterStore.getState()
    updatePriceRange(100000, 500000)
    
    const state = useFilterStore.getState()
    expect(state.filters.priceRange).toEqual({ min: 100000, max: 500000 })
  })

  it('should update size range', () => {
    const { updateSizeRange } = useFilterStore.getState()
    updateSizeRange(1000, 3000)
    
    const state = useFilterStore.getState()
    expect(state.filters.sizeRange).toEqual({ min: 1000, max: 3000 })
  })

  it('should update counties', () => {
    const { updateCounties } = useFilterStore.getState()
    updateCounties(['Dallas', 'Tarrant'])
    
    const state = useFilterStore.getState()
    expect(state.filters.counties).toEqual(['Dallas', 'Tarrant'])
  })

  it('should clear all filters', () => {
    const { updatePriceRange, updateSizeRange, updateCounties, clearFilters } = useFilterStore.getState()
    
    // Set some filters
    updatePriceRange(100000, 500000)
    updateSizeRange(1000, 3000)
    updateCounties(['Dallas'])
    
    // Clear filters
    clearFilters()
    
    const state = useFilterStore.getState()
    expect(state.filters.priceRange).toEqual({ min: null, max: null })
    expect(state.filters.sizeRange).toEqual({ min: null, max: null })
    expect(state.filters.counties).toEqual([])
  })

  it('should apply preset filters', () => {
    const { applyPreset } = useFilterStore.getState()
    
    const preset = {
      priceRange: { min: 200000, max: 400000 },
      sizeRange: { min: 1500, max: 2500 },
      counties: ['Dallas'],
    }
    
    applyPreset(preset)
    
    const state = useFilterStore.getState()
    expect(state.filters.priceRange).toEqual({ min: 200000, max: 400000 })
    expect(state.filters.sizeRange).toEqual({ min: 1500, max: 2500 })
    expect(state.filters.counties).toEqual(['Dallas'])
  })

  it('should handle null values in price range', () => {
    const { updatePriceRange } = useFilterStore.getState()
    updatePriceRange(null, 500000)
    
    const state = useFilterStore.getState()
    expect(state.filters.priceRange).toEqual({ min: null, max: 500000 })
  })

  it('should handle null values in size range', () => {
    const { updateSizeRange } = useFilterStore.getState()
    updateSizeRange(1000, null)
    
    const state = useFilterStore.getState()
    expect(state.filters.sizeRange).toEqual({ min: 1000, max: null })
  })

  it('should set saved preferences', () => {
    const { setSavedPreferences } = useFilterStore.getState()
    
    const preferences = [
      {
        id: '1',
        name: 'Preset 1',
        filters: {
          priceRange: { min: 100000, max: 300000 },
          sizeRange: { min: 1000, max: 2000 },
          counties: ['Dallas'],
        },
        isDefault: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
    
    setSavedPreferences(preferences)
    
    const state = useFilterStore.getState()
    expect(state.savedPreferences).toEqual(preferences)
  })

  it('should set active preference', () => {
    const { setActivePreference } = useFilterStore.getState()
    setActivePreference('test-id')
    
    const state = useFilterStore.getState()
    expect(state.activePreferenceId).toBe('test-id')
  })
})

