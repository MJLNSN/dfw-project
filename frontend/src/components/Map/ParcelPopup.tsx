/**
 * Popup component for displaying parcel details
 */
import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import { createRoot } from 'react-dom/client'
import type { ParcelFeature } from '../../types'

interface ParcelPopupProps {
  parcel: ParcelFeature
  coordinates: [number, number]
  onClose: () => void
  map: mapboxgl.Map | null
}

function PopupContent({ parcel, onClose }: { parcel: ParcelFeature; onClose: () => void }) {
  const { properties } = parcel

  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const formatSize = (size: number | null) => {
    if (size === null) return 'N/A'
    return new Intl.NumberFormat('en-US').format(Math.round(size)) + ' sq ft'
  }

  return (
    <div className="min-w-[250px]">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-900 text-lg">Property Details</h3>
        <button
          onClick={onClose}
          className="text-gray-600 hover:text-gray-900 transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-3">
        {/* Address */}
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Address</div>
          <div className="text-gray-800">{properties.address || 'Address not available'}</div>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-100/50">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Value</div>
            <div className="text-lg font-semibold text-gradient">
              {formatPrice(properties.price)}
            </div>
          </div>
        </div>

        {/* Size & County */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 rounded-lg bg-gray-100/50">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Size</div>
            <div className="font-medium text-gray-800">{formatSize(properties.size_sqft)}</div>
          </div>
          <div className="p-2 rounded-lg bg-gray-100/50">
            <div className="text-xs text-gray-500 uppercase tracking-wide">County</div>
            <div className="font-medium text-gray-800">{properties.county || 'N/A'}</div>
          </div>
        </div>

        {/* Parcel ID */}
        <div className="pt-2 border-t border-slate-700">
          <div className="text-xs text-gray-500">
            ID: <span className="font-mono text-gray-600">{properties.parcel_id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ParcelPopup({ parcel, coordinates, onClose, map }: ParcelPopupProps) {
  const popupRef = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    // Create a container for React
    const container = document.createElement('div')
    const root = createRoot(container)
    root.render(<PopupContent parcel={parcel} onClose={onClose} />)

    // Create and add popup
    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '320px',
      className: 'parcel-popup',
    })
      .setLngLat(coordinates)
      .setDOMContent(container)
      .addTo(map)

    // Cleanup
    return () => {
      if (popupRef.current) {
        popupRef.current.remove()
      }
      root.unmount()
    }
  }, [map, parcel, coordinates, onClose])

  return null
}

