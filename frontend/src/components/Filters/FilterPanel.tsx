/**
 * Advanced filter panel component
 */
import { useFilterStore } from '../../store/filterStore'
import { useAuthStore } from '../../store/authStore'

interface FilterPanelProps {
  onClose: () => void
  onSave?: () => void
  onApply?: () => void
}

export default function FilterPanel({ onClose, onSave, onApply }: FilterPanelProps) {
  const { isAuthenticated } = useAuthStore()
  const { filters, updatePriceRange, updateSizeRange } = useFilterStore()

  const handlePriceMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    updatePriceRange(value, filters.priceRange?.max ?? null)
  }

  const handlePriceMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    updatePriceRange(filters.priceRange?.min ?? null, value)
  }

  const handleSizeMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    updateSizeRange(value, filters.sizeRange?.max ?? null)
  }

  const handleSizeMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? parseFloat(e.target.value) : null
    updateSizeRange(filters.sizeRange?.min ?? null, value)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onApply) {
      onApply()
    }
  }

  return (
    <div className="glass rounded-xl p-4 animate-slide-down">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filter Properties</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
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

      <div className="space-y-4">
        {/* Price Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price Range (USD)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceRange?.min ?? ''}
                onChange={handlePriceMinChange}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
            <span className="text-gray-400 self-center">-</span>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Max"
                value={filters.priceRange?.max ?? ''}
                onChange={handlePriceMaxChange}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Size Range */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Size Range (sq ft)
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Min"
                value={filters.sizeRange?.min ?? ''}
                onChange={handleSizeMinChange}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
            <span className="text-gray-400 self-center">-</span>
            <div className="flex-1">
              <input
                type="number"
                placeholder="Max"
                value={filters.sizeRange?.max ?? ''}
                onChange={handleSizeMaxChange}
                onKeyPress={handleKeyPress}
                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Apply Button */}
        {onApply && (
          <button
            onClick={onApply}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Apply Filters
          </button>
        )}

        {/* Save Filter Button */}
        {isAuthenticated && onSave && (
          <button
            onClick={onSave}
            className="w-full py-2 px-4 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            Save as Tag
          </button>
        )}
      </div>
    </div>
  )
}
