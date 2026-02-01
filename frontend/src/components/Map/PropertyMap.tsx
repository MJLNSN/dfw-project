/**
 * Main map component using Mapbox GL JS
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import { useQuery } from '@tanstack/react-query'
import { useMapStore, MAP_STYLES } from '../../store/mapStore'
import { useFilterStore } from '../../store/filterStore'
import { useAuthStore } from '../../store/authStore'
import { searchParcels } from '../../services/api'
import config from '../../config'
import ParcelPopup from './ParcelPopup'
import type { ParcelFeature } from '../../types'

// Import Geocoder CSS
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

// Set Mapbox token
mapboxgl.accessToken = config.mapboxToken

// Only log once on module load
const isDev = import.meta.env.DEV
if (isDev) {
  console.log('🗺️ Mapbox Token:', mapboxgl.accessToken ? 'Configured ✓' : 'Missing ✗')
}

export default function PropertyMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [popupParcel, setPopupParcel] = useState<ParcelFeature | null>(null)
  const [popupCoords, setPopupCoords] = useState<[number, number] | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const { isAuthenticated } = useAuthStore()
  const { filters } = useFilterStore()
  const {
    center,
    zoom,
    mapStyle,
    showClusters,
    setParcels,
    setLoading,
    setError,
    setBounds,
    bounds,
    setSelectedParcel,
    setLastSearchedLocation,
  } = useMapStore()

  // Build bbox string from bounds
  const bboxString = bounds
    ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
    : undefined

  // Query parcels
  const { data, isLoading, error } = useQuery({
    queryKey: ['parcels', filters, bboxString, isAuthenticated],
    queryFn: () => searchParcels(filters, bboxString, 2000),
    enabled: !!bounds,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Update store with query results
  useEffect(() => {
    setLoading(isLoading)
    if (data) {
      setParcels(data)
    }
    if (error) {
      setError(error instanceof Error ? error.message : 'Failed to load parcels')
    }
  }, [data, isLoading, error, setParcels, setLoading, setError])

  // Update bounds helper
  const updateBounds = useCallback(() => {
    if (!map.current) return
    const mapBounds = map.current.getBounds()
    if (mapBounds) {
      setBounds({
        north: mapBounds.getNorth(),
        south: mapBounds.getSouth(),
        east: mapBounds.getEast(),
        west: mapBounds.getWest(),
      })
    }
  }, [setBounds])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    if (isDev) {
      console.log('🗺️ Initializing map with style:', MAP_STYLES[mapStyle])
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: MAP_STYLES[mapStyle],
        center: center,
        zoom: zoom,
        minZoom: config.map.minZoom,
        maxZoom: config.map.maxZoom,
      })

      // Add navigation controls (zoom +/-)
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

      // Add scale control (比例尺)
      map.current.addControl(
        new mapboxgl.ScaleControl({
          maxWidth: 150,
          unit: 'imperial', // 使用英制单位（英里/英尺），适合美国
        }),
        'bottom-right'
      )

      // Add geolocate control (用户定位按钮)
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
        showAccuracyCircle: true,
      })
      map.current.addControl(geolocateControl, 'top-right')

      // Add geocoder search control (地址搜索栏)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const geocoder = new MapboxGeocoder({
        accessToken: mapboxgl.accessToken as string,
        mapboxgl: mapboxgl as any,
        placeholder: 'Search address, city, or ZIP...',
        // 限制搜索范围到 Texas，提高相关性
        bbox: [-106.65, 25.84, -93.51, 36.5], // Texas bounding box
        proximity: {
          longitude: -96.7970,
          latitude: 32.7767,
        }, // 偏向 Dallas 附近的结果
        countries: 'us',
        types: 'address,place,postcode,locality,neighborhood',
        language: 'en',
        marker: true, // 搜索结果显示标记
        collapsed: false, // 搜索框默认展开
      })
      
      // Save search result to store for export
      geocoder.on('result', (e) => {
        const [lng, lat] = e.result.center
        setLastSearchedLocation({
          longitude: lng,
          latitude: lat,
          address: e.result.place_name,
        })
      })
      
      // Clear search result from store
      geocoder.on('clear', () => {
        setLastSearchedLocation(null)
      })
      
      map.current.addControl(geocoder, 'top-left')

      // Set initial bounds
      map.current.on('load', () => {
        if (isDev) {
          console.log('✅ Map loaded successfully')
        }
        setMapLoaded(true)
        updateBounds()
      })

      // Update bounds on move
      map.current.on('moveend', () => {
        updateBounds()
      })

      // Error handling - always log errors
      map.current.on('error', (e) => {
        console.error('❌ Map error:', e.error?.message || e)
      })

      // Cleanup
      return () => {
        if (map.current) {
          map.current.remove()
          map.current = null
        }
      }
    } catch (err) {
      console.error('❌ Failed to initialize map:', err)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      if (isDev) {
        console.log('🎨 Changing map style to:', mapStyle)
      }
      map.current.setStyle(MAP_STYLES[mapStyle])
    }
  }, [mapStyle, mapLoaded])

  // Update parcel layer when data changes
  useEffect(() => {
    if (!map.current || !data || !mapLoaded) return

    const mapInstance = map.current

    // Wait for style to load
    const addLayers = () => {
      try {
        // Remove existing layers and source
        if (mapInstance.getLayer('parcels-heat')) mapInstance.removeLayer('parcels-heat')
        if (mapInstance.getLayer('parcels-clusters')) mapInstance.removeLayer('parcels-clusters')
        if (mapInstance.getLayer('cluster-count')) mapInstance.removeLayer('cluster-count')
        if (mapInstance.getLayer('parcels-unclustered')) mapInstance.removeLayer('parcels-unclustered')
        if (mapInstance.getSource('parcels')) mapInstance.removeSource('parcels')

        // Filter features with valid geometry
        const validFeatures = data.features.filter((f) => f.geometry !== null)

        if (isDev) {
          console.log(`📍 Adding ${validFeatures.length} parcels to map`)
        }

        // Add source - use type assertion for Mapbox compatibility
        mapInstance.addSource('parcels', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: validFeatures as GeoJSON.Feature[],
          } as GeoJSON.FeatureCollection,
          cluster: showClusters,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        })

        // Add cluster layer
        if (showClusters) {
          mapInstance.addLayer({
            id: 'parcels-clusters',
            type: 'circle',
            source: 'parcels',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#0ea5e9',
                50,
                '#8b5cf6',
                200,
                '#ec4899',
              ],
              'circle-radius': ['step', ['get', 'point_count'], 20, 50, 30, 200, 40],
              'circle-stroke-width': 2,
              'circle-stroke-color': 'rgba(255, 255, 255, 0.3)',
            },
          })

          mapInstance.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'parcels',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            },
            paint: {
              'text-color': '#ffffff',
            },
          })
        }

        // Add unclustered points
        mapInstance.addLayer({
          id: 'parcels-unclustered',
          type: 'circle',
          source: 'parcels',
          filter: showClusters ? ['!', ['has', 'point_count']] : ['!=', 'parcel_id', ''],
          paint: {
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'price'],
              0,
              '#10b981',
              250000,
              '#0ea5e9',
              500000,
              '#8b5cf6',
              1000000,
              '#ec4899',
            ],
            'circle-radius': 6,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
          },
        })

        // Click handler for clusters
        mapInstance.on('click', 'parcels-clusters', (e) => {
          const features = mapInstance.queryRenderedFeatures(e.point, {
            layers: ['parcels-clusters'],
          })
          const clusterId = features[0]?.properties?.cluster_id
          const source = mapInstance.getSource('parcels') as mapboxgl.GeoJSONSource

          source.getClusterExpansionZoom(clusterId, (err, zoomLevel) => {
            if (err) return
            const geometry = features[0].geometry
            if (geometry.type === 'Point') {
              mapInstance.easeTo({
                center: geometry.coordinates as [number, number],
                zoom: zoomLevel || 14,
              })
            }
          })
        })

        // Click handler for unclustered points
        mapInstance.on('click', 'parcels-unclustered', (e) => {
          if (!e.features || e.features.length === 0) return
          const feature = e.features[0]
          const geometry = feature.geometry

          if (geometry.type === 'Point') {
            const parcel: ParcelFeature = {
              type: 'Feature',
              properties: {
                parcel_id: feature.properties?.parcel_id || '',
                address: feature.properties?.address || null,
                price: feature.properties?.price || null,
                size_sqft: feature.properties?.size_sqft || null,
                county: feature.properties?.county || null,
              },
              geometry: {
                type: geometry.type,
                coordinates: geometry.coordinates,
              },
            }
            setPopupParcel(parcel)
            setPopupCoords(geometry.coordinates as [number, number])
            setSelectedParcel(parcel)
          }
        })

        // Cursor styles
        mapInstance.on('mouseenter', 'parcels-clusters', () => {
          mapInstance.getCanvas().style.cursor = 'pointer'
        })
        mapInstance.on('mouseleave', 'parcels-clusters', () => {
          mapInstance.getCanvas().style.cursor = ''
        })
        mapInstance.on('mouseenter', 'parcels-unclustered', () => {
          mapInstance.getCanvas().style.cursor = 'pointer'
        })
        mapInstance.on('mouseleave', 'parcels-unclustered', () => {
          mapInstance.getCanvas().style.cursor = ''
        })
      } catch (err) {
        console.error('❌ Error adding layers:', err)
      }
    }

    if (mapInstance.isStyleLoaded()) {
      addLayers()
    } else {
      mapInstance.once('style.load', addLayers)
    }
  }, [data, showClusters, setSelectedParcel, mapLoaded])

  // Close popup handler
  const closePopup = () => {
    setPopupParcel(null)
    setPopupCoords(null)
    setSelectedParcel(null)
  }

  return (
    <div className="absolute inset-0">
      <div ref={mapContainer} className="absolute inset-0" />
      
      {/* Debug info */}
      {!mapLoaded && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-lg">
          <span className="text-sm text-gray-700">Loading map...</span>
        </div>
      )}
      
      {/* Popup */}
      {popupParcel && popupCoords && (
        <ParcelPopup
          parcel={popupParcel}
          coordinates={popupCoords}
          onClose={closePopup}
          map={map.current}
        />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-lg flex items-center gap-2 animate-fade-in">
          <div className="spinner" />
          <span className="text-sm text-gray-700">Loading parcels...</span>
        </div>
      )}
    </div>
  )
}
