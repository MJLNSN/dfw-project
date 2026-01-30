/**
 * Main map page - displays property data on interactive map
 */
import PropertyMap from '../components/Map/PropertyMap'
import MapControls from '../components/Map/MapControls'

export default function MapPage() {
  return (
    <div className="h-[calc(100vh-4rem)] relative overflow-hidden">
      <PropertyMap />
      <MapControls />
    </div>
  )
}

