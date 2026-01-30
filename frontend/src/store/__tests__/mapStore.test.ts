import { describe, it, expect, beforeEach } from 'vitest'
import { useMapStore } from '../mapStore'

describe('MapStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useMapStore.setState({
      mapStyle: 'streets',
      showClusters: true,
      totalParcels: 0,
      accessLevel: 'guest',
    })
  })

  it('should initialize with default values', () => {
    const state = useMapStore.getState()
    expect(state.mapStyle).toBe('streets')
    expect(state.showClusters).toBe(true)
    expect(state.totalParcels).toBe(0)
    expect(state.accessLevel).toBe('guest')
  })

  it('should set map style', () => {
    const { setMapStyle } = useMapStore.getState()
    setMapStyle('satellite')
    
    const state = useMapStore.getState()
    expect(state.mapStyle).toBe('satellite')
  })

  it('should toggle clusters', () => {
    const { toggleClusters } = useMapStore.getState()
    const initialState = useMapStore.getState().showClusters
    
    toggleClusters()
    expect(useMapStore.getState().showClusters).toBe(!initialState)
    
    toggleClusters()
    expect(useMapStore.getState().showClusters).toBe(initialState)
  })

  it('should set total parcels', () => {
    const { setTotalParcels } = useMapStore.getState()
    setTotalParcels(1500)
    
    const state = useMapStore.getState()
    expect(state.totalParcels).toBe(1500)
  })

  it('should set access level', () => {
    const { setAccessLevel } = useMapStore.getState()
    setAccessLevel('registered')
    
    const state = useMapStore.getState()
    expect(state.accessLevel).toBe('registered')
  })

  it('should handle all map styles', () => {
    const { setMapStyle } = useMapStore.getState()
    const styles = ['streets', 'satellite', 'dark'] as const
    
    styles.forEach(style => {
      setMapStyle(style)
      expect(useMapStore.getState().mapStyle).toBe(style)
    })
  })

  it('should handle zero parcels', () => {
    const { setTotalParcels } = useMapStore.getState()
    setTotalParcels(0)
    
    const state = useMapStore.getState()
    expect(state.totalParcels).toBe(0)
  })

  it('should handle large parcel counts', () => {
    const { setTotalParcels } = useMapStore.getState()
    setTotalParcels(999999)
    
    const state = useMapStore.getState()
    expect(state.totalParcels).toBe(999999)
  })
})

