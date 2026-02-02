/**
 * Export configuration modal
 * ST-05: Users export filtered results into a CSV format
 * Additional: Location-based filtering option
 */
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import mapboxgl from 'mapbox-gl'
import toast from 'react-hot-toast'
import { useFilterStore } from '../../store/filterStore'
import { useMapStore } from '../../store/mapStore'
import { exportToCsv, downloadBlob, ExportOptions, ExportCenterPoint } from '../../services/api'
import config from '../../config'

import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

interface ExportModalProps {
  onClose: () => void
}

// Sort options for export
const SORT_OPTIONS = [
  { value: 'price_desc', label: '💎 Price (high to low)', requiresDistance: false },
  { value: 'price_asc', label: '💰 Price (low to high)', requiresDistance: false },
  { value: 'size_desc', label: '🏠 Size (large to small)', requiresDistance: false },
  { value: 'size_asc', label: '📏 Size (small to large)', requiresDistance: false },
  { value: 'distance', label: '📍 Distance (nearest first)', requiresDistance: true },
]

export default function ExportModal({ onClose }: ExportModalProps) {
  const { filters } = useFilterStore()
  const { lastSearchedLocation } = useMapStore()
  const [isExporting, setIsExporting] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'price_asc' | 'price_desc' | 'size_asc' | 'size_desc'>('price_desc')
  
  // Location filter state
  const [useLocationFilter, setUseLocationFilter] = useState(false)
  const [centerPoint, setCenterPoint] = useState<ExportCenterPoint | null>(null)
  const [maxDistance, setMaxDistance] = useState<number>(1)
  const geocoderContainerRef = useRef<HTMLDivElement>(null)
  const geocoderRef = useRef<MapboxGeocoder | null>(null)

  // Check if any property filters are applied
  const hasFilters = !!(
    (filters.priceRange?.min || filters.priceRange?.max) ||
    (filters.sizeRange?.min || filters.sizeRange?.max) ||
    (filters.counties && filters.counties.length > 0)
  )

  // Initialize geocoder when location filter is enabled
  useEffect(() => {
    if (!useLocationFilter) {
      if (geocoderRef.current) {
        geocoderRef.current.onRemove()
        geocoderRef.current = null
      }
      return
    }
    if (!geocoderContainerRef.current || geocoderRef.current) return

    const geocoder = new MapboxGeocoder({
      accessToken: config.mapboxToken,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mapboxgl: mapboxgl as any,
      placeholder: 'Enter address, city, or ZIP...',
      bbox: [-106.65, 25.84, -93.51, 36.5],
      proximity: { longitude: -96.7970, latitude: 32.7767 },
      countries: 'us',
      types: 'address,place,postcode,locality,neighborhood',
      language: 'en',
      marker: false,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoderContainerRef.current.appendChild(geocoder.onAdd(undefined as any))
    geocoderRef.current = geocoder

    // Set default from last search if available
    if (lastSearchedLocation && lastSearchedLocation.address) {
      setTimeout(() => {
        if (geocoder) {
          geocoder.setInput(lastSearchedLocation.address || '')
          setCenterPoint({
            longitude: lastSearchedLocation.longitude,
            latitude: lastSearchedLocation.latitude,
            address: lastSearchedLocation.address,
          })
        }
      }, 100)
    }

    geocoder.on('result', (e) => {
      const [lng, lat] = e.result.center
      setCenterPoint({
        longitude: lng,
        latitude: lat,
        address: e.result.place_name,
      })
    })

    geocoder.on('clear', () => {
      setCenterPoint(null)
    })

    return () => {
      if (geocoderRef.current) {
        geocoderRef.current.onRemove()
        geocoderRef.current = null
      }
    }
  }, [useLocationFilter, lastSearchedLocation])

  // Reset sort when location filter is disabled
  useEffect(() => {
    if (!useLocationFilter && sortBy === 'distance') {
      setSortBy('price_desc')
    }
  }, [useLocationFilter, sortBy])

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const exportOptions: ExportOptions = {
        filters,
        sortBy,
      }

      // Add location filter if enabled
      if (useLocationFilter && centerPoint && maxDistance > 0) {
        exportOptions.centerPoint = centerPoint
        exportOptions.maxDistance = maxDistance
      }

      const blob = await exportToCsv(exportOptions)
      const filename = `properties_export_${new Date().toISOString().split('T')[0]}.csv`
      downloadBlob(blob, filename)
      toast.success('Export completed!')
      onClose()
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-emerald-600 px-12 py-10 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-bold text-white">Export Properties</h2>
              <p className="text-emerald-50 text-2xl mt-2">Download filtered property data as CSV</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors p-4 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-12 py-10 space-y-8">
          {/* Current Property Filters Summary */}
          <div className="bg-gray-50 rounded-xl p-8">
            <h4 className="text-2xl font-semibold text-gray-700 mb-6 flex items-center gap-3">
              <span className="text-3xl">🏠</span> Property Filters
            </h4>
            <div className="space-y-4 text-xl">
              {filters.priceRange?.min || filters.priceRange?.max ? (
                <div className="flex items-center gap-3 text-gray-700 bg-white px-6 py-4 rounded-lg">
                  <span className="text-2xl">💰</span>
                  <span>
                    ${filters.priceRange.min?.toLocaleString() || '0'} - ${filters.priceRange.max?.toLocaleString() || '∞'}
                  </span>
                </div>
              ) : null}
              {filters.sizeRange?.min || filters.sizeRange?.max ? (
                <div className="flex items-center gap-3 text-gray-700 bg-white px-6 py-4 rounded-lg">
                  <span className="text-2xl">📐</span>
                  <span>
                    {filters.sizeRange.min?.toLocaleString() || '0'} - {filters.sizeRange.max?.toLocaleString() || '∞'} sq ft
                  </span>
                </div>
              ) : null}
              {filters.counties && filters.counties.length > 0 ? (
                <div className="flex items-center gap-3 text-gray-700 bg-white px-6 py-4 rounded-lg">
                  <span className="text-2xl">🏘️</span>
                  <span>{filters.counties.join(', ')}</span>
                </div>
              ) : null}
              {!hasFilters && (
                <p className="text-gray-500 italic text-lg">No property filters applied</p>
              )}
            </div>
          </div>

          {/* Location Filter Toggle */}
          <div className="bg-blue-50 rounded-xl p-8 border-2 border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-4xl">📍</span>
                <div>
                  <h4 className="font-semibold text-gray-900 text-2xl">Location Filter</h4>
                  <p className="text-lg text-gray-600">Filter by distance from a specific location</p>
                </div>
              </div>
              <button
                onClick={() => setUseLocationFilter(!useLocationFilter)}
                className={`relative w-20 h-10 rounded-full transition-colors ${
                  useLocationFilter ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1.5 w-7 h-7 rounded-full bg-white transition-transform shadow ${
                    useLocationFilter ? 'left-12' : 'left-1.5'
                  }`}
                />
              </button>
            </div>

            {/* Location Filter Options */}
            {useLocationFilter && (
              <div className="mt-6 space-y-6 pt-6 border-t-2 border-blue-200">
                {/* Address Search */}
                <div>
                  <label className="block text-xl font-medium text-gray-700 mb-3">
                    Center Point
                    {lastSearchedLocation && (
                      <span className="ml-2 text-lg text-emerald-600">(from map search)</span>
                    )}
                  </label>
                  <div ref={geocoderContainerRef} className="export-geocoder export-geocoder-large" />
                  {centerPoint && (
                    <div className="mt-3 p-4 bg-emerald-50 rounded-lg flex items-center gap-3 text-xl">
                      <span className="text-emerald-500 text-2xl">✓</span>
                      <span className="flex-1 truncate text-emerald-800">{centerPoint.address}</span>
                      <button
                        onClick={() => {
                          setCenterPoint(null)
                          if (geocoderRef.current) geocoderRef.current.clear()
                        }}
                        className="text-emerald-500 hover:text-emerald-700 text-2xl"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* Distance Input */}
                <div>
                  <label className="block text-xl font-medium text-gray-700 mb-3">
                    Max Distance (miles)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0.01"
                      max="50"
                      step="0.01"
                      value={maxDistance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        if (!isNaN(val) && val >= 0.01 && val <= 50) {
                          setMaxDistance(val)
                        }
                      }}
                      className="flex-1 p-4 text-xl border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="1"
                    />
                    <span className="text-gray-500 text-xl">miles</span>
                  </div>
                  <p className="text-lg text-gray-500 mt-2">
                    0.01 mi = 16m | 0.1 mi = 161m | 1 mi = 1.6km
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-xl font-semibold text-gray-700 mb-4 flex items-center gap-3">
              <span className="text-2xl">🔄</span> Sort Results By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full p-5 text-xl border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.requiresDistance && !useLocationFilter}
                >
                  {option.label} {option.requiresDistance && !useLocationFilter ? '(enable location filter)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Export Info */}
          <div className="bg-amber-50 rounded-xl p-6 border-2 border-amber-200">
            <p className="text-lg text-amber-800 flex items-start gap-3">
              <svg className="w-8 h-8 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <span>
                Only properties with complete information (address, price) will be exported. Max 5,000 properties.
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 px-12 py-8 rounded-b-2xl">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 py-5 px-6 text-xl border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || (useLocationFilter && !centerPoint)}
              className="flex-1 py-5 px-6 text-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg"
            >
              {isExporting ? (
                <>
                  <div className="spinner" />
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download CSV
                </>
              )}
            </button>
          </div>
          {useLocationFilter && !centerPoint && (
            <p className="text-lg text-amber-600 text-center mt-3">
              ⚠️ Please select a location to enable export
            </p>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
